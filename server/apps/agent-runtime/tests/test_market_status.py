"""
Unit tests for Market Status Module (Asia/Kolkata).

Test Scenarios:
  1. Saturday (WEEKEND)
  2. Sunday (WEEKEND)
  3. Monday 08:00 (OVERNIGHT)
  4. Monday 09:10 (PRE_OPEN)
  5. Monday 09:15 (OPEN)
  6. Monday 15:30 (AFTER_CLOSE)
  7. Monday 15:31 (AFTER_CLOSE)
  8. Holiday (Republic Day - 2026-01-26)
  9. Weekday after a long weekend (Tuesday 2026-01-27 after Monday holiday)
  10. Demo mode override
"""

import datetime
from zoneinfo import ZoneInfo
import pytest

from app.market.status import get_market_status

IST = ZoneInfo("Asia/Kolkata")


def test_status_saturday():
    # 2026-03-14 is a Saturday
    dt = datetime.datetime(2026, 3, 14, 11, 30, tzinfo=IST)
    status = get_market_status(now_ist=dt)

    assert status["state"] == "WEEKEND"
    assert status["is_open"] is False
    assert status["last_session_date"] == "2026-03-13"  # Friday
    assert "2026-03-16T09:15:00" in status["next_open_ist"]  # Monday morning
    assert status["seconds_to_next_open"] > 0


def test_status_sunday():
    # 2026-03-15 is a Sunday
    dt = datetime.datetime(2026, 3, 15, 16, 0, tzinfo=IST)
    status = get_market_status(now_ist=dt)

    assert status["state"] == "WEEKEND"
    assert status["is_open"] is False
    assert status["last_session_date"] == "2026-03-13"  # Previous Friday
    assert "2026-03-16T09:15:00" in status["next_open_ist"]


def test_status_monday_0800_overnight():
    # Monday 08:00 AM IST
    dt = datetime.datetime(2026, 3, 16, 8, 0, tzinfo=IST)
    status = get_market_status(now_ist=dt)

    assert status["state"] == "OVERNIGHT"
    assert status["is_open"] is False
    assert status["last_session_date"] == "2026-03-13"  # Friday
    assert "2026-03-16T09:15:00" in status["next_open_ist"]  # Opens today at 9:15
    assert status["seconds_to_next_open"] == 75 * 60  # 1 hour 15 min = 4500s


def test_status_monday_0910_pre_open():
    # Monday 09:10 AM IST (Pre-open: 09:00 - 09:15)
    dt = datetime.datetime(2026, 3, 16, 9, 10, tzinfo=IST)
    status = get_market_status(now_ist=dt)

    assert status["state"] == "PRE_OPEN"
    assert status["is_open"] is False
    assert status["last_session_date"] == "2026-03-13"
    assert "2026-03-16T09:15:00" in status["next_open_ist"]
    assert status["seconds_to_next_open"] == 5 * 60  # 5 minutes


def test_status_monday_0915_open():
    # Monday 09:15 AM IST (Exact open bell)
    dt = datetime.datetime(2026, 3, 16, 9, 15, tzinfo=IST)
    status = get_market_status(now_ist=dt)

    assert status["state"] == "OPEN"
    assert status["is_open"] is True
    assert status["last_session_date"] == "2026-03-16"
    assert status["next_close_ist"] is not None
    assert "2026-03-16T15:30:00" in status["next_close_ist"]


def test_status_monday_1530_closing_boundary():
    # Monday 15:30:00 PM IST (Closing boundary)
    dt = datetime.datetime(2026, 3, 16, 15, 30, 0, tzinfo=IST)
    status = get_market_status(now_ist=dt)

    assert status["state"] == "AFTER_CLOSE"
    assert status["is_open"] is False
    assert status["last_session_date"] == "2026-03-16"
    assert "2026-03-17T09:15:00" in status["next_open_ist"]  # Tuesday morning


def test_status_monday_1531_after_close():
    # Monday 15:31:00 PM IST
    dt = datetime.datetime(2026, 3, 16, 15, 31, tzinfo=IST)
    status = get_market_status(now_ist=dt)

    assert status["state"] == "AFTER_CLOSE"
    assert status["is_open"] is False
    assert status["last_session_date"] == "2026-03-16"
    assert "2026-03-17T09:15:00" in status["next_open_ist"]


def test_status_holiday_republic_day():
    # 2026-01-26 is a Monday (Republic Day holiday in nse_holidays.json)
    dt = datetime.datetime(2026, 1, 26, 11, 0, tzinfo=IST)
    status = get_market_status(now_ist=dt)

    assert status["state"] == "HOLIDAY"
    assert status["is_open"] is False
    assert status["reason"] == "Republic Day"
    # Last trading session must skip weekend to Friday 2026-01-23
    assert status["last_session_date"] == "2026-01-23"
    # Next open must be Tuesday 2026-01-27 at 9:15 AM
    assert "2026-01-27T09:15:00" in status["next_open_ist"]


def test_status_weekday_after_long_weekend():
    # Tuesday 2026-01-27 at 08:30 AM (After Fri 23rd session, Sat 24, Sun 25, Mon 26 Holiday)
    dt = datetime.datetime(2026, 1, 27, 8, 30, tzinfo=IST)
    status = get_market_status(now_ist=dt)

    assert status["state"] == "OVERNIGHT"
    assert status["is_open"] is False
    # Walk back across Monday holiday and weekend to Friday Jan 23
    assert status["last_session_date"] == "2026-01-23"
    assert "2026-01-27T09:15:00" in status["next_open_ist"]


def test_status_demo_override():
    # Force DEMO OPEN on a Sunday
    dt = datetime.datetime(2026, 3, 15, 14, 0, tzinfo=IST)
    status = get_market_status(now_ist=dt, demo_state="OPEN")

    assert status["state"] == "OPEN"
    assert status["is_open"] is True
    assert status["is_demo"] is True
