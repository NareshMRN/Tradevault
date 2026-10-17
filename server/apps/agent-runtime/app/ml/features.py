"""
STEP 2: Features calculation pipeline for Indian Stock Screening.

CRITICAL RULE: NO LOOKAHEAD.
Every feature uses ONLY data available strictly before the market open on day t.
Any value derived from day t's own close/high/low/volume MUST be shifted by 1 (.shift(1)).
The ONLY same-day value allowed is today's OPEN price (used solely for the overnight gap).
"""

import pandas as pd
import numpy as np

FEATURE_NAMES = [
    "ret_1d",
    "ret_5d",
    "ret_20d",
    "gap",
    "vol_trend",
    "volatility_20d",
    "rsi_14",
    "dist_from_20d_high",
    "dist_from_20d_low",
    "rel_strength_20d",
    "nifty_ret_5d",
]


def _compute_rsi(series: pd.Series, period: int = 14) -> pd.Series:
    """Computes standard RSI indicator."""
    delta = series.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.rolling(window=period, min_periods=period).mean()
    avg_loss = loss.rolling(window=period, min_periods=period).mean()
    rs = avg_gain / (avg_loss + 1e-9)
    rsi = 100.0 - (100.0 / (1.0 + rs))
    return rsi


def build_features(stock_df: pd.DataFrame, nifty_df: pd.DataFrame) -> pd.DataFrame:
    """
    Builds non-lookahead features for stock against the Nifty 50 benchmark index.
    Used identically in BOTH offline model training and real-time inference.

    Args:
        stock_df: DataFrame with ['date', 'open', 'high', 'low', 'close', 'volume']
        nifty_df: DataFrame with ['date', 'open', 'high', 'low', 'close', 'volume']

    Returns:
        DataFrame containing ['date'] + FEATURE_NAMES
    """
    s = stock_df.copy().sort_values("date").reset_index(drop=True)
    n = nifty_df.copy().sort_values("date").reset_index(drop=True)

    # Calculate Nifty benchmark features first (all shifted by 1)
    n["nifty_ret_1d"] = n["close"].pct_change(1)
    n["nifty_ret_5d_raw"] = n["close"].pct_change(5)
    n["nifty_ret_20d_raw"] = n["close"].pct_change(20)

    # Shift nifty features by 1 so only prior day's close is used
    n["nifty_ret_5d"] = n["nifty_ret_5d_raw"].shift(1)
    n["nifty_ret_20d"] = n["nifty_ret_20d_raw"].shift(1)
    nifty_sub = n[["date", "nifty_ret_5d", "nifty_ret_20d"]]

    # Stock-specific features:
    # 1. Past returns (Shifted by 1: from t-1 backwards)
    s["ret_1d"] = s["close"].pct_change(1).shift(1)
    s["ret_5d"] = s["close"].pct_change(5).shift(1)
    s["ret_20d"] = s["close"].pct_change(20).shift(1)

    # 2. Overnight Gap: open_t / close_{t-1} - 1 (Open on day t is known at market open; close_{t-1} is yesterday's close)
    s["prev_close"] = s["close"].shift(1)
    s["gap"] = (s["open"] / (s["prev_close"] + 1e-9)) - 1.0

    # 3. Volume Trend: prev-day volume / 20d avg volume (prior 20 days, shifted by 1)
    prev_vol = s["volume"].shift(1)
    vol_20d_avg = prev_vol.rolling(window=20, min_periods=20).mean()
    s["vol_trend"] = prev_vol / (vol_20d_avg + 1e-9)

    # 4. Volatility 20d: 20-day rolling std of daily returns (prior 20 days, shifted by 1)
    daily_returns_shifted = s["close"].pct_change(1).shift(1)
    s["volatility_20d"] = daily_returns_shifted.rolling(window=20, min_periods=20).std()

    # 5. RSI 14 (computed on close, shifted by 1)
    raw_rsi = _compute_rsi(s["close"], period=14)
    s["rsi_14"] = raw_rsi.shift(1)

    # 6. Distance from 20d high and low (prior 20 days high/low, shifted by 1)
    prev_high = s["high"].shift(1)
    prev_low = s["low"].shift(1)
    high_20d = prev_high.rolling(window=20, min_periods=20).max()
    low_20d = prev_low.rolling(window=20, min_periods=20).min()
    s["dist_from_20d_high"] = (s["prev_close"] / (high_20d + 1e-9)) - 1.0
    s["dist_from_20d_low"] = (s["prev_close"] / (low_20d + 1e-9)) - 1.0

    # Merge with Nifty benchmark
    merged = pd.merge(s, nifty_sub, on="date", how="left")

    # 7. Relative strength 20d (stock ret_20d minus Nifty ret_20d)
    merged["rel_strength_20d"] = merged["ret_20d"] - merged["nifty_ret_20d"]

    # Result columns
    out_cols = ["date"] + FEATURE_NAMES
    res = merged[out_cols].copy()

    return res
