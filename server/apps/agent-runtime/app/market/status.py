"""
NSE Market Hours Awareness Module.
All timestamps and calculations are strictly in Asia/Kolkata (IST).

Trading Rules:
  - Standard Trading Days: Monday to Friday (excluding NSE holidays)
  - PRE_OPEN:    09:00 - 09:15 IST
  - OPEN:        09:15 - 15:30 IST
  - AFTER_CLOSE: 15:30 - 23:59:59 IST
  - OVERNIGHT:   00:00 - 09:00 IST
  - WEEKEND:     Saturday & Sunday
  - HOLIDAY:     Dates declared in nse_holidays.json
"""

import os
import json
import datetime
from pathlib import Path
from typing import Optional, Dict, Any
from zoneinfo import ZoneInfo

IST_TZ = ZoneInfo("Asia/Kolkata")
HOLIDAYS_FILE = Path(__file__).resolve().parent / "nse_holidays.json"


def load_holidays() -> Dict[str, str]:
    """Loads holiday dictionary mapping YYYY-MM-DD -> Holiday Name."""
    if not HOLIDAYS_FILE.exists():
        return {}
    try:
        with open(HOLIDAYS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return {item["date"]: item["name"] for item in data if "date" in item and "name" in item}
    except Exception:
        return {}


def is_market_holiday(d: datetime.date, holidays: Optional[Dict[str, str]] = None) -> Optional[str]:
    """Returns holiday name if date is a holiday, else None."""
    if holidays is None:
        holidays = load_holidays()
    date_str = d.strftime("%Y-%m-%d")
    return holidays.get(date_str)


def get_previous_trading_day(from_date: datetime.date, holidays: Optional[Dict[str, str]] = None) -> datetime.date:
    """Walks back to find the most recent weekday that is not a holiday."""
    if holidays is None:
        holidays = load_holidays()
    curr = from_date - datetime.timedelta(days=1)
    while curr.weekday() >= 5 or (curr.strftime("%Y-%m-%d") in holidays):
        curr -= datetime.timedelta(days=1)
    return curr


def get_next_trading_day(from_date: datetime.date, holidays: Optional[Dict[str, str]] = None) -> datetime.date:
    """Walks forward to find the next weekday that is not a holiday."""
    if holidays is None:
        holidays = load_holidays()
    curr = from_date + datetime.timedelta(days=1)
    while curr.weekday() >= 5 or (curr.strftime("%Y-%m-%d") in holidays):
        curr += datetime.timedelta(days=1)
    return curr


def get_market_status(
    now_ist: Optional[datetime.datetime] = None,
    demo_state: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Computes real-time market hours status in IST.

    Args:
        now_ist: Optional datetime (if None, uses current datetime in Asia/Kolkata).
        demo_state: Optional override state (e.g. 'OPEN', 'PRE_OPEN', 'AFTER_CLOSE', 'OVERNIGHT', 'WEEKEND', 'HOLIDAY').

    Returns:
        Dict adhering to required schema:
          {
            state: "OPEN" | "PRE_OPEN" | "AFTER_CLOSE" | "OVERNIGHT" | "WEEKEND" | "HOLIDAY",
            is_open: bool,
            now_ist: ISO string,
            next_open_ist: ISO string,
            next_close_ist: ISO string | null,
            last_session_date: "YYYY-MM-DD",
            seconds_to_next_open: int,
            reason: string | null,
            is_demo: bool
          }
    """
    if now_ist is None:
        now_ist = datetime.datetime.now(IST_TZ)
    elif now_ist.tzinfo is None:
        now_ist = now_ist.replace(tzinfo=IST_TZ)
    else:
        now_ist = now_ist.astimezone(IST_TZ)

    holidays = load_holidays()
    curr_date = now_ist.date()
    weekday = now_ist.weekday()  # 0=Monday, 4=Friday, 5=Saturday, 6=Sunday
    curr_time = now_ist.time()

    holiday_name = is_market_holiday(curr_date, holidays)

    # Base state calculation
    state = "OVERNIGHT"
    reason: Optional[str] = None
    is_open = False
    next_close_ist: Optional[str] = None

    if weekday >= 5:
        state = "WEEKEND"
        reason = "Saturday" if weekday == 5 else "Sunday"
    elif holiday_name:
        state = "HOLIDAY"
        reason = holiday_name
    else:
        # Regular trading weekday (Mon-Fri)
        t_pre_open = datetime.time(9, 0)
        t_market_open = datetime.time(9, 15)
        t_market_close = datetime.time(15, 30)

        if curr_time < t_pre_open:
            state = "OVERNIGHT"
            reason = "Pre-market overnight session"
        elif t_pre_open <= curr_time < t_market_open:
            state = "PRE_OPEN"
            reason = "Pre-open order matching (9:00 - 9:15 AM IST)"
        elif t_market_open <= curr_time < t_market_close:
            state = "OPEN"
            is_open = True
            reason = "Normal market trading hours (9:15 AM - 3:30 PM IST)"
            close_dt = datetime.datetime.combine(curr_date, t_market_close, tzinfo=IST_TZ)
            next_close_ist = close_dt.isoformat()
        else:
            state = "AFTER_CLOSE"
            reason = "Market closed for today at 3:30 PM IST"

    # Last session date calculation
    if state in ("OPEN", "AFTER_CLOSE"):
        last_session_date = curr_date.strftime("%Y-%m-%d")
    else:
        # Pre-open, overnight, weekend, or holiday: last session was the previous trading day
        prev_day = get_previous_trading_day(curr_date, holidays)
        last_session_date = prev_day.strftime("%Y-%m-%d")

    # Next open calculation
    if state in ("OVERNIGHT", "PRE_OPEN") and weekday < 5 and not holiday_name:
        # Opens today at 09:15 AM
        next_open_dt = datetime.datetime.combine(curr_date, datetime.time(9, 15), tzinfo=IST_TZ)
    else:
        # Next open is the next trading day at 09:15 AM
        next_td = get_next_trading_day(curr_date, holidays)
        next_open_dt = datetime.datetime.combine(next_td, datetime.time(9, 15), tzinfo=IST_TZ)

    seconds_to_next_open = max(0, int((next_open_dt - now_ist).total_seconds()))

    # Demo override handling
    env_override = os.getenv("DEMO_MARKET_STATE")
    effective_demo = (demo_state or env_override or "").strip().upper()
    if effective_demo == "CLOSED":
        effective_demo = "AFTER_CLOSE"
    valid_states = {"OPEN", "PRE_OPEN", "AFTER_CLOSE", "OVERNIGHT", "WEEKEND", "HOLIDAY"}
    is_demo = False

    if effective_demo in valid_states:
        state = effective_demo
        is_demo = True
        is_open = (state == "OPEN")
        if is_open:
            close_dt = datetime.datetime.combine(curr_date, datetime.time(15, 30), tzinfo=IST_TZ)
            next_close_ist = close_dt.isoformat()
            seconds_to_next_open = 0
        elif state == "PRE_OPEN":
            next_close_ist = None
            seconds_to_next_open = min(seconds_to_next_open, 900)
            reason = "Demo Pre-open"
        elif state == "WEEKEND":
            next_close_ist = None
            reason = "Demo Weekend"
        elif state == "HOLIDAY":
            next_close_ist = None
            reason = "Demo Holiday"

    return {
        "state": state,
        "is_open": is_open,
        "now_ist": now_ist.isoformat(),
        "next_open_ist": next_open_dt.isoformat(),
        "next_close_ist": next_close_ist,
        "last_session_date": last_session_date,
        "seconds_to_next_open": seconds_to_next_open,
        "reason": reason,
        "is_demo": is_demo,
    }
