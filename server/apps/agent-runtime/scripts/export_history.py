"""
STEP 1: Export ~5 years of adjusted daily OHLCV data for ~40 Nifty 50 stocks + ^NSEI.
Saves CSVs to app/ml/data/<symbol>.csv with columns: date, open, high, low, close, volume.
"""

import os
import sys
import json
from pathlib import Path
import pandas as pd
import yfinance as yf

# Base paths
CURRENT_DIR = Path(__file__).resolve().parent
RUNTIME_DIR = CURRENT_DIR.parent
ML_DIR = RUNTIME_DIR / "app" / "ml"
DATA_DIR = ML_DIR / "data"
SECTORS_FILE = ML_DIR / "sectors.json"

MIN_ROWS = 500  # Drop symbols with fewer than ~2 years of daily data


def main():
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    if not SECTORS_FILE.exists():
        print(f"Error: {SECTORS_FILE} not found!")
        sys.exit(1)

    with open(SECTORS_FILE, "r") as f:
        sectors_map = json.load(f)

    symbols = list(sectors_map.keys())
    # Add benchmark index
    benchmark_symbol = "^NSEI"
    all_symbols = [benchmark_symbol] + symbols

    print(f"Exporting ~5 years daily OHLCV data for {len(all_symbols)} symbols...")

    saved_counts = {}
    dropped_symbols = []

    for sym in all_symbols:
        try:
            print(f"Fetching {sym}...", end=" ", flush=True)
            ticker = yf.Ticker(sym)
            df = ticker.history(period="5y", interval="1d", auto_adjust=True)

            if df is None or df.empty or len(df) < MIN_ROWS:
                print(f"DROPPED (insufficient data: {len(df) if df is not None else 0} rows)")
                if sym != benchmark_symbol:
                    dropped_symbols.append(sym)
                continue

            # Standardize columns: date, open, high, low, close, volume
            df = df.reset_index()
            # yfinance returns 'Date' or 'Datetime'
            date_col = "Date" if "Date" in df.columns else ("Datetime" if "Datetime" in df.columns else df.columns[0])
            df["date"] = pd.to_datetime(df[date_col]).dt.strftime("%Y-%m-%d")

            cols_map = {
                "Open": "open",
                "High": "high",
                "Low": "low",
                "Close": "close",
                "Volume": "volume",
            }
            # Handle multi-level columns if any
            if isinstance(df.columns, pd.MultiIndex):
                df.columns = [c[0] for c in df.columns]

            renamed = {}
            for orig, target in cols_map.items():
                match = [c for c in df.columns if str(c).lower() == orig.lower()]
                if match:
                    renamed[match[0]] = target

            df = df.rename(columns=renamed)
            required = ["date", "open", "high", "low", "close", "volume"]
            df = df[[c for c in required if c in df.columns]]

            # Ensure numeric types
            for c in ["open", "high", "low", "close", "volume"]:
                df[c] = pd.to_numeric(df[c], errors="coerce")

            df = df.dropna().sort_values("date").reset_index(drop=True)

            if len(df) < MIN_ROWS:
                print(f"DROPPED after cleaning ({len(df)} rows)")
                if sym != benchmark_symbol:
                    dropped_symbols.append(sym)
                continue

            # Save clean CSV: sanitize filename for index e.g. ^NSEI -> NSEI.csv
            file_symbol = sym.replace("^", "")
            out_file = DATA_DIR / f"{file_symbol}.csv"
            df.to_csv(out_file, index=False)
            saved_counts[sym] = len(df)
            print(f"SAVED ({len(df)} rows -> {out_file.name})")

        except Exception as e:
            print(f"FAILED ({e})")
            if sym != benchmark_symbol:
                dropped_symbols.append(sym)

    # If any symbols were dropped, update sectors.json
    if dropped_symbols:
        print(f"\nDropping {len(dropped_symbols)} symbols with insufficient data from sectors.json:")
        for s in dropped_symbols:
            print(f" - {s}")
            sectors_map.pop(s, None)
        with open(SECTORS_FILE, "w") as f:
            json.dump(sectors_map, f, indent=2)

    print("\n" + "=" * 50)
    print("DATA EXPORT COMPLETE SUMMARY:")
    print(f"Total symbols successfully exported: {len(saved_counts)}")
    for sym, count in saved_counts.items():
        print(f"  {sym:15s}: {count:4d} rows")
    print("=" * 50)


if __name__ == "__main__":
    main()
