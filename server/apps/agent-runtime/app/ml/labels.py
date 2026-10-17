"""
STEP 2: Target Labels for Intraday Outperformance vs Nifty 50 Index.

Label definition:
  1 if (stock_close / stock_open - 1) - (nifty_close / nifty_open - 1) > 0.005 (0.5%),
  else 0.
"""

import pandas as pd


def compute_labels(stock_df: pd.DataFrame, nifty_df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes intraday outperformance label for each date present in both stock and nifty.

    Args:
        stock_df: DataFrame with ['date', 'open', 'close']
        nifty_df: DataFrame with ['date', 'open', 'close']

    Returns:
        DataFrame with ['date', 'stock_intraday_ret', 'nifty_intraday_ret', 'excess_ret', 'label']
    """
    # Merge stock and nifty on date
    s_sub = stock_df[["date", "open", "close"]].copy().rename(columns={"open": "stock_open", "close": "stock_close"})
    n_sub = nifty_df[["date", "open", "close"]].copy().rename(columns={"open": "nifty_open", "close": "nifty_close"})

    merged = pd.merge(s_sub, n_sub, on="date", how="inner").sort_values("date").reset_index(drop=True)

    # Intraday returns from today's open to today's close
    merged["stock_intraday_ret"] = (merged["stock_close"] / merged["stock_open"]) - 1.0
    merged["nifty_intraday_ret"] = (merged["nifty_close"] / merged["nifty_open"]) - 1.0
    merged["excess_ret"] = merged["stock_intraday_ret"] - merged["nifty_intraday_ret"]

    # Target label: 1 if excess return > 0.5% (+0.005), else 0
    merged["label"] = (merged["excess_ret"] > 0.005).astype(int)

    return merged[["date", "stock_intraday_ret", "nifty_intraday_ret", "excess_ret", "label"]]
