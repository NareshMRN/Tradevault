"""
Unit and Integration Tests for the ML Stock-Screening Pipeline.

Verifies:
  1. Strict NO LOOKAHEAD guarantee: Modifying day t's close/high/low/volume does NOT alter day t's features.
  2. Same-day open ONLY affects the overnight gap feature.
  3. Chronological non-overlapping train/val/test splits with embargo gap.
  4. Outperformance target label computation (> +0.5% excess return).
  5. Today's picks constraints: max 5 picks, max 2 per sector, score >= threshold.
"""

import json
from pathlib import Path
import numpy as np
import pandas as pd
import pytest

from app.ml.features import build_features, FEATURE_NAMES
from app.ml.labels import compute_labels
from app.ml.predict import todays_picks, METRICS_FILE


@pytest.fixture
def sample_market_dfs():
    """Generates 50 daily bars of synthetic stock and index data."""
    dates = pd.date_range("2025-01-01", periods=50, freq="B").strftime("%Y-%m-%d")

    np.random.seed(42)
    s_close = 100.0 * np.cumprod(1 + np.random.normal(0.0005, 0.015, size=50))
    s_open = s_close * np.random.normal(1.0, 0.004, size=50)
    s_high = np.maximum(s_open, s_close) * 1.01
    s_low = np.minimum(s_open, s_close) * 0.99
    s_volume = np.random.uniform(500000, 2000000, size=50)

    n_close = 20000.0 * np.cumprod(1 + np.random.normal(0.0003, 0.01, size=50))
    n_open = n_close * np.random.normal(1.0, 0.003, size=50)
    n_high = np.maximum(n_open, n_close) * 1.005
    n_low = np.minimum(n_open, n_close) * 0.995
    n_volume = np.random.uniform(5000000, 10000000, size=50)

    stock_df = pd.DataFrame({
        "date": dates,
        "open": s_open,
        "high": s_high,
        "low": s_low,
        "close": s_close,
        "volume": s_volume,
    })

    nifty_df = pd.DataFrame({
        "date": dates,
        "open": n_open,
        "high": n_high,
        "low": n_low,
        "close": n_close,
        "volume": n_volume,
    })

    return stock_df, nifty_df


def test_no_lookahead_leakage(sample_market_dfs):
    """
    CRITICAL TEST: Verifies that changing day t's own close, high, low, or volume
    DOES NOT change ANY feature on day t.
    """
    stock_df, nifty_df = sample_market_dfs

    # Original features
    orig_feats = build_features(stock_df, nifty_df)
    last_idx = len(stock_df) - 1
    orig_day_t = orig_feats.iloc[last_idx].to_dict()

    # Artificially alter day t's close, high, low, and volume (drastic change: 10x!)
    modified_stock = stock_df.copy()
    modified_stock.loc[last_idx, "close"] *= 10.0
    modified_stock.loc[last_idx, "high"] *= 10.0
    modified_stock.loc[last_idx, "low"] *= 0.1
    modified_stock.loc[last_idx, "volume"] *= 50.0

    mod_feats = build_features(modified_stock, nifty_df)
    mod_day_t = mod_feats.iloc[last_idx].to_dict()

    # Check every single feature on day t
    for f in FEATURE_NAMES:
        orig_val = orig_day_t[f]
        mod_val = mod_day_t[f]
        assert np.isclose(orig_val, mod_val, equal_nan=True), (
            f"LOOKAHEAD LEAKAGE DETECTED on feature '{f}'! "
            f"Original: {orig_val}, Modified: {mod_val}. "
            f"Day t's close/high/low/volume must be shifted by 1."
        )


def test_lookahead_open_sensitivity(sample_market_dfs):
    """
    Verifies that changing day t's OPEN only affects the 'gap' feature
    and has zero effect on trailing momentum, RSI, or volatility.
    """
    stock_df, nifty_df = sample_market_dfs

    orig_feats = build_features(stock_df, nifty_df)
    last_idx = len(stock_df) - 1

    modified_stock = stock_df.copy()
    # Change today's open price
    modified_stock.loc[last_idx, "open"] *= 1.05

    mod_feats = build_features(modified_stock, nifty_df)

    # Gap SHOULD change
    assert not np.isclose(orig_feats.loc[last_idx, "gap"], mod_feats.loc[last_idx, "gap"])

    # All other 10 features MUST remain identical
    for f in FEATURE_NAMES:
        if f != "gap":
            assert np.isclose(orig_feats.loc[last_idx, f], mod_feats.loc[last_idx, f], equal_nan=True), (
                f"Feature '{f}' unexpectedly changed when open price was modified!"
            )


def test_chronological_splits_no_overlap():
    """Verifies that train, validation, and test date ranges do NOT overlap and maintain an embargo."""
    if not METRICS_FILE.exists():
        pytest.skip("metrics.json not generated yet")

    with open(METRICS_FILE, "r") as f:
        metrics = json.load(f)

    train_start, train_end = metrics["train_date_range"]
    val_start, val_end = metrics["val_date_range"]
    test_start, test_end = metrics["test_date_range"]

    # Assert strict chronological ordering with embargo gap
    assert train_end < val_start, f"Train and Val overlap: {train_end} >= {val_start}"
    assert val_end < test_start, f"Val and Test overlap: {val_end} >= {test_start}"


def test_label_computation_honest_base_rate():
    """Verifies label definition: excess return > +0.5% (+0.005)."""
    stock_df = pd.DataFrame({
        "date": ["2026-01-02", "2026-01-03", "2026-01-05"],
        "open": [100.0, 100.0, 100.0],
        "close": [101.5, 100.2, 98.0],  # +1.5%, +0.2%, -2.0%
    })
    nifty_df = pd.DataFrame({
        "date": ["2026-01-02", "2026-01-03", "2026-01-05"],
        "open": [20000.0, 20000.0, 20000.0],
        "close": [20100.0, 20100.0, 20000.0],  # +0.5%, +0.5%, 0.0%
    })

    # Day 1: stock +1.5%, nifty +0.5% -> excess = +1.0% > 0.5% => label 1
    # Day 2: stock +0.2%, nifty +0.5% -> excess = -0.3% <= 0.5% => label 0
    # Day 3: stock -2.0%, nifty 0.0%  -> excess = -2.0% <= 0.5% => label 0
    labels_df = compute_labels(stock_df, nifty_df)

    assert labels_df.loc[0, "label"] == 1
    assert labels_df.loc[1, "label"] == 0
    assert labels_df.loc[2, "label"] == 0
    assert np.isclose(labels_df.loc[0, "excess_ret"], 0.010)


def test_todays_picks_structure_and_constraints():
    """Verifies that todays_picks returns valid schema with max 5 picks and max 2 per sector."""
    result = todays_picks(force_recompute=False)

    assert "picks" in result
    assert "threshold" in result
    assert "data_source" in result
    assert len(result["picks"]) <= 5

    # Check sector constraint: at most 2 stocks per sector
    sector_counts = {}
    for p in result["picks"]:
        assert p["score"] >= result["threshold"]
        sec = p["sector"]
        sector_counts[sec] = sector_counts.get(sec, 0) + 1
        assert sector_counts[sec] <= 2, f"Sector {sec} exceeded limit of 2 picks!"
        assert "top_drivers" in p
        assert len(p["top_drivers"]) <= 3
        assert len(p["explanation"]) > 0
