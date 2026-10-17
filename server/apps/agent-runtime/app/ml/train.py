"""
STEP 3: Training and Honest Evaluation Pipeline for NSE Stock Screening.

Splits data strictly by date:
  - Oldest 60% Train
  - 5-day embargo gap
  - Next 20% Validation
  - 5-day embargo gap
  - Newest 20% Test

Model:
  - LightGBM with conservative parameters (regularized, small leaves, early stopping)
  - Baseline Logistic Regression
  - Probability calibration on Validation set (IsotonicRegression)
  - Decision threshold selection STRICTLY on Validation set
  - Single-shot final evaluation on Test set with cost-adjusted returns
"""

import os
import sys
import json
from pathlib import Path

# Ensure UTF-8 output on Windows
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
import joblib
import numpy as np
import pandas as pd
from lightgbm import LGBMClassifier, early_stopping, log_evaluation
from sklearn.linear_model import LogisticRegression
from sklearn.isotonic import IsotonicRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import precision_score, roc_auc_score, accuracy_score

from app.ml.features import build_features, FEATURE_NAMES
from app.ml.labels import compute_labels

# Paths
CURRENT_DIR = Path(__file__).resolve().parent
ML_DIR = CURRENT_DIR
DATA_DIR = ML_DIR / "data"
ARTIFACTS_DIR = ML_DIR / "artifacts"
SECTORS_FILE = ML_DIR / "sectors.json"


def load_dataset() -> pd.DataFrame:
    """Loads all stock CSVs, computes features and labels against Nifty benchmark."""
    nifty_file = DATA_DIR / "NSEI.csv"
    if not nifty_file.exists():
        raise FileNotFoundError(f"Benchmark file {nifty_file} not found! Run export_history.py first.")

    nifty_df = pd.read_csv(nifty_file)

    with open(SECTORS_FILE, "r") as f:
        sectors_map = json.load(f)

    all_rows = []
    print(f"Loading data and building non-lookahead features for {len(sectors_map)} stocks...")

    for sym, sector in sectors_map.items():
        clean_name = sym.replace("^", "")
        stock_file = DATA_DIR / f"{clean_name}.csv"
        if not stock_file.exists():
            continue

        stock_df = pd.read_csv(stock_file)
        if len(stock_df) < 200:
            continue

        # 1. Build features (strictly prior to market open)
        feats_df = build_features(stock_df, nifty_df)

        # 2. Compute labels (intraday outperformance > +0.5%)
        labels_df = compute_labels(stock_df, nifty_df)

        # 3. Merge features and labels on date
        merged = pd.merge(feats_df, labels_df, on="date", how="inner")
        merged["symbol"] = sym
        merged["sector"] = sector

        all_rows.append(merged)

    full_df = pd.concat(all_rows, ignore_index=True)
    # Drop rows with NaNs in features
    clean_df = full_df.dropna(subset=FEATURE_NAMES + ["label", "excess_ret"]).copy()
    clean_df = clean_df.sort_values("date").reset_index(drop=True)

    print(f"Total dataset: {len(clean_df)} observations across {clean_df['date'].nunique()} unique dates.")
    base_rate = clean_df["label"].mean()
    print(f"Overall Label Base Rate (Intraday Outperformance > +0.5%): {base_rate:.4f} ({base_rate * 100:.2f}%)")

    return clean_df


def train_and_evaluate():
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    df = load_dataset()

    # Unique dates for time-series split
    unique_dates = np.array(sorted(df["date"].unique()))
    n_dates = len(unique_dates)

    # 60% Train, 20% Val, 20% Test
    idx_train_end = int(n_dates * 0.60)
    idx_val_start = idx_train_end + 5  # 5-day embargo gap
    idx_val_end = int(n_dates * 0.80)
    idx_test_start = idx_val_end + 5  # 5-day embargo gap

    train_dates = set(unique_dates[:idx_train_end])
    val_dates = set(unique_dates[idx_val_start:idx_val_end])
    test_dates = set(unique_dates[idx_test_start:])

    max_train_date = max(train_dates)
    min_val_date = min(val_dates)
    max_val_date = max(val_dates)
    min_test_date = min(test_dates)
    max_test_date = max(test_dates)

    # Verification of chronological non-overlapping splits
    assert max_train_date < min_val_date, f"Split error: {max_train_date} >= {min_val_date}"
    assert max_val_date < min_test_date, f"Split error: {max_val_date} >= {min_test_date}"

    print("\n" + "=" * 60)
    print("TIME-SERIES CHRONOLOGICAL SPLITS:")
    print(f"  Train : {min(train_dates)} to {max_train_date} ({len(train_dates)} dates)")
    print(f"  Val   : {min_val_date} to {max_val_date} ({len(val_dates)} dates)")
    print(f"  Test  : {min_test_date} to {max_test_date} ({len(test_dates)} dates)")
    print("=" * 60)

    train_mask = df["date"].isin(train_dates)
    val_mask = df["date"].isin(val_dates)
    test_mask = df["date"].isin(test_dates)

    train_df = df[train_mask].copy()
    val_df = df[val_mask].copy()
    test_df = df[test_mask].copy()

    X_train, y_train = train_df[FEATURE_NAMES].values, train_df["label"].values
    X_val, y_val = val_df[FEATURE_NAMES].values, val_df["label"].values
    X_test, y_test = test_df[FEATURE_NAMES].values, test_df["label"].values

    print(f"\nSamples: Train={len(X_train)}, Val={len(X_val)}, Test={len(X_test)}")
    base_rate_train = np.mean(y_train)
    base_rate_val = np.mean(y_val)
    base_rate_test = np.mean(y_test)
    print(f"Base rates: Train={base_rate_train:.3f}, Val={base_rate_val:.3f}, Test={base_rate_test:.3f}")

    # Baseline 1: Logistic Regression
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)
    X_test_scaled = scaler.transform(X_test)

    lr = LogisticRegression(C=0.1, max_iter=1000, random_state=42)
    lr.fit(X_train_scaled, y_train)
    lr_val_probs = lr.predict_proba(X_val_scaled)[:, 1]
    lr_test_probs = lr.predict_proba(X_test_scaled)[:, 1]
    lr_auc = roc_auc_score(y_test, lr_test_probs)
    lr_acc = accuracy_score(y_test, (lr_test_probs >= 0.5).astype(int))
    print(f"\n[Baseline] Logistic Regression -> Test AUC: {lr_auc:.4f}, Accuracy: {lr_acc:.4f}")

    # Model: LightGBM with conservative hyperparameters
    print("\nTraining LightGBM Classifier...")
    lgb_model = LGBMClassifier(
        n_estimators=300,
        learning_rate=0.03,
        num_leaves=15,
        min_child_samples=100,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        verbosity=-1,
    )

    lgb_model.fit(
        X_train,
        y_train,
        eval_set=[(X_val, y_val)],
        eval_metric="binary_logloss",
        callbacks=[early_stopping(stopping_rounds=30, verbose=False)],
    )

    # Raw probabilities on validation set
    raw_val_probs = lgb_model.predict_proba(X_val)[:, 1]
    raw_val_auc = roc_auc_score(y_val, raw_val_probs)
    print(f"LightGBM Validation ROC-AUC: {raw_val_auc:.4f}")

    # Calibrate probabilities on the validation set (IsotonicRegression)
    print("Fitting probability calibrator (IsotonicRegression) on Validation set...")
    calibrator = IsotonicRegression(out_of_bounds="clip", y_min=0.0, y_max=1.0)
    calibrator.fit(raw_val_probs, y_val)

    cal_val_probs = np.clip(calibrator.predict(raw_val_probs), 0.0, 1.0)

    # Choose decision threshold STRICTLY on the VALIDATION set
    print("\nSelecting decision threshold on Validation set (target: ~1-3 picks/day with best precision)...")
    val_dates_count = len(val_dates)
    best_thresh = 0.50
    best_val_precision = 0.0
    best_avg_picks = 0.0

    threshold_candidates = np.arange(0.50, 0.81, 0.02)
    threshold_search_results = []

    for th in threshold_candidates:
        picks = cal_val_probs >= th
        n_picks = np.sum(picks)
        avg_picks = n_picks / val_dates_count
        precision = np.mean(y_val[picks]) if n_picks > 0 else 0.0

        threshold_search_results.append({
            "threshold": round(float(th), 2),
            "n_picks": int(n_picks),
            "avg_picks_per_day": round(float(avg_picks), 2),
            "precision": round(float(precision), 4),
        })

        # We look for a threshold with sensible coverage (~0.8 to 3.5 picks/day) and top precision
        if 0.6 <= avg_picks <= 4.0:
            if precision > best_val_precision:
                best_val_precision = precision
                best_thresh = th
                best_avg_picks = avg_picks

    # Fallback threshold if no candidate met the strict range
    if best_val_precision == 0.0:
        best_thresh = 0.52
        best_val_precision = np.mean(y_val[cal_val_probs >= best_thresh]) if np.sum(cal_val_probs >= best_thresh) > 0 else base_rate_val
        best_avg_picks = np.sum(cal_val_probs >= best_thresh) / val_dates_count

    print(f"Optimal Validation Threshold Selected: {best_thresh:.2f}")
    print(f"  Val Precision: {best_val_precision:.4f} (Base Rate: {base_rate_val:.4f})")
    print(f"  Val Avg Picks/Day: {best_avg_picks:.2f}")

    # =========================================================================
    # SINGLE-SHOT HONEST EVALUATION ON TEST SET (NEVER USED FOR SELECTION)
    # =========================================================================
    print("\n" + "=" * 60)
    print("HONEST SINGLE-SHOT TEST SET EVALUATION:")
    print("=" * 60)

    raw_test_probs = lgb_model.predict_proba(X_test)[:, 1]
    cal_test_probs = np.clip(calibrator.predict(raw_test_probs), 0.0, 1.0)
    test_auc = roc_auc_score(y_test, cal_test_probs)

    test_picks = cal_test_probs >= best_thresh
    n_test_picks = int(np.sum(test_picks))
    test_dates_count = len(test_dates)
    test_avg_picks_per_day = round(float(n_test_picks / test_dates_count), 2)

    test_precision = float(np.mean(y_test[test_picks])) if n_test_picks > 0 else float(base_rate_test)
    lift = float((test_precision / base_rate_test) - 1.0) if base_rate_test > 0 else 0.0

    print(f"Test Set ROC-AUC           : {test_auc:.4f}")
    print(f"Test Base Rate             : {base_rate_test:.4f} ({base_rate_test * 100:.2f}%)")
    print(f"Picks at Threshold ({best_thresh:.2f})  : {n_test_picks} total ({test_avg_picks_per_day:.2f} per day)")
    print(f"Precision at Threshold     : {test_precision:.4f} ({test_precision * 100:.2f}%)")
    print(f"Lift over Base Rate        : {lift * 100:+.2f}%")

    # Leakage check warning: in an outperformance binary classification with ~30% base rate,
    # test precision exceeding 65% is statistically improbable in liquid equities and indicates leakage.
    if test_precision > 0.65:
        print("\n[!] " + "=" * 55 + " [!]")
        print("LOUD WARNING: Test precision unusually high (>65%).")
        print("Check for potential lookahead leakage in features or date overlap!")
        print("[!] " + "=" * 55 + " [!]\n")
    else:
        print("[OK] Leakage check passed: test precision is within realistic large-cap quant expectations.")

    # Top-5 Daily Hit Rate & Excess Return After Costs (0.1% daily transaction cost)
    test_df_eval = test_df.copy()
    test_df_eval["score"] = cal_test_probs

    daily_hit_counts = []
    daily_excess_returns = []

    for d, group in test_df_eval.groupby("date"):
        # Sort descending by score
        sorted_group = group.sort_values("score", ascending=False)
        top5 = sorted_group.head(5)
        # Check if excess return > 0 (beat Nifty)
        beat_nifty = (top5["excess_ret"] > 0.005).astype(int)
        daily_hit_counts.extend(beat_nifty.tolist())
        # Subtract 0.1% transaction cost (0.001)
        net_excess = (top5["excess_ret"] - 0.001).tolist()
        daily_excess_returns.extend(net_excess)

    top5_hit_rate = float(np.mean(daily_hit_counts)) if daily_hit_counts else 0.0
    top5_avg_excess_ret_after_costs = float(np.mean(daily_excess_returns)) if daily_excess_returns else 0.0

    print(f"Top-5 Daily Outperformance Hit Rate: {top5_hit_rate * 100:.2f}%")
    print(f"Top-5 Avg Excess Return (net 0.1% cost): {top5_avg_excess_ret_after_costs * 100:+.2f}% per day")

    # Feature Importances
    importances = lgb_model.feature_importances_
    feat_imp = sorted(zip(FEATURE_NAMES, importances), key=lambda x: x[1], reverse=True)
    print("\nFeature Importances (split count):")
    for fname, imp in feat_imp:
        print(f"  {fname:20s}: {imp:4d}")

    # Metrics JSON structure
    metrics = {
        "base_rate": round(float(base_rate_test), 4),
        "threshold": round(float(best_thresh), 2),
        "n_test_rows": int(len(test_df)),
        "n_picks": n_test_picks,
        "precision_at_threshold": round(test_precision, 4),
        "lift_over_base_rate": round(lift, 4),
        "avg_picks_per_day": test_avg_picks_per_day,
        "top5_daily_hit_rate": round(top5_hit_rate, 4),
        "top5_avg_excess_return_after_costs": round(top5_avg_excess_ret_after_costs, 5),
        "train_date_range": [min(train_dates), max_train_date],
        "val_date_range": [min_val_date, max_val_date],
        "test_date_range": [min_test_date, max_test_date],
        "baseline_model": {
            "name": "Logistic Regression (Standardized)",
            "test_auc": round(float(lr_auc), 4),
            "test_accuracy": round(float(lr_acc), 4),
        },
        "lgbm_test_auc": round(float(test_auc), 4),
        "feature_importances": {k: int(v) for k, v in feat_imp},
        "limitations": [
            "Survivorship bias: Model trained on current liquid Nifty 50 constituents only.",
            "Modest edge expected: In liquid Indian large caps, honest model edge is 2-8% above base rate.",
            "Execution slippage: Opening bell prices at 9:15 AM IST may deviate from ideal theoretical fills.",
            "Educational screening tool: The model provides probabilistic ranking, not guaranteed price forecasts or SEBI-registered financial advice.",
        ],
    }

    # Save metrics.json
    metrics_file = ARTIFACTS_DIR / "metrics.json"
    with open(metrics_file, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"\nSaved metrics -> {metrics_file}")

    # Save model.joblib
    model_payload = {
        "model": lgb_model,
        "calibrator": calibrator,
        "feature_names": FEATURE_NAMES,
        "threshold": float(best_thresh),
        "metrics": metrics,
    }
    model_file = ARTIFACTS_DIR / "model.joblib"
    joblib.dump(model_payload, model_file)
    print(f"Saved model artifact -> {model_file}")

    return metrics


if __name__ == "__main__":
    train_and_evaluate()
