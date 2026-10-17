import json
import os
import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
from app.data.base import MarketDataProvider

CURRENT_DIR = Path(__file__).resolve().parent
SECTORS_FILE = CURRENT_DIR / "nse_sectors.json"
SAMPLE_DIR = CURRENT_DIR / "sample"

class SampleDataProvider(MarketDataProvider):
    """
    High-fidelity offline sample data provider for 55+ Indian Nifty stocks.
    Guarantees 100% system availability with realistic Indian market volatility,
    sectors, and daily OHLCV bars without external API reliance.
    """

    def __init__(self):
        self._universe: List[Dict[str, Any]] = []
        self._load_universe()
        self._ensure_sample_files()

    def _load_universe(self):
        if SECTORS_FILE.exists():
            with open(SECTORS_FILE, "r", encoding="utf-8") as f:
                self._universe = json.load(f)
        else:
            self._universe = [
                {"symbol": "RELIANCE", "name": "Reliance Industries Ltd", "sector": "Energy & Petrochemicals", "market_cap_category": "Large Cap", "base_price": 2980.0},
                {"symbol": "TCS", "name": "Tata Consultancy Services Ltd", "sector": "Information Technology", "market_cap_category": "Large Cap", "base_price": 4120.0},
                {"symbol": "HDFCBANK", "name": "HDFC Bank Ltd", "sector": "Banking & Financial Services", "market_cap_category": "Large Cap", "base_price": 1680.0},
                {"symbol": "INFY", "name": "Infosys Ltd", "sector": "Information Technology", "market_cap_category": "Large Cap", "base_price": 1910.0},
                {"symbol": "ICICIBANK", "name": "ICICI Bank Ltd", "sector": "Banking & Financial Services", "market_cap_category": "Large Cap", "base_price": 1240.0},
            ]

    def _ensure_sample_files(self):
        """Pre-populates app/data/sample/ with 1-year OHLCV for all 55+ stocks."""
        SAMPLE_DIR.mkdir(parents=True, exist_ok=True)
        for stock in self._universe:
            sym = stock["symbol"]
            file_path = SAMPLE_DIR / f"{sym}.json"
            if not file_path.exists():
                df = self._generate_synthetic_ohlcv(stock, days=252)
                # Save to JSON
                records = []
                for dt, row in df.iterrows():
                    records.append({
                        "date": dt.strftime("%Y-%m-%d"),
                        "open": round(float(row["Open"]), 2),
                        "high": round(float(row["High"]), 2),
                        "low": round(float(row["Low"]), 2),
                        "close": round(float(row["Close"]), 2),
                        "volume": int(row["Volume"]),
                    })
                with open(file_path, "w", encoding="utf-8") as f:
                    json.dump(records, f, indent=2)

    def _generate_synthetic_ohlcv(self, stock: Dict[str, Any], days: int = 252) -> pd.DataFrame:
        sym = stock["symbol"]
        base_price = float(stock.get("base_price", 1000.0))
        seed = abs(hash(sym)) % 100000
        rng = np.random.default_rng(seed)

        # Sector-tailored drift and volatility
        sector = stock.get("sector", "")
        if "Information Technology" in sector or "Consumer Tech" in sector:
            daily_vol = 0.016
            annual_drift = 0.12
        elif "Banking" in sector or "Financial" in sector:
            daily_vol = 0.015
            annual_drift = 0.14
        elif "Automobiles" in sector or "Defence" in sector:
            daily_vol = 0.018
            annual_drift = 0.22
        elif "Metals" in sector:
            daily_vol = 0.021
            annual_drift = 0.10
        elif "Pharmaceuticals" in sector or "Healthcare" in sector:
            daily_vol = 0.013
            annual_drift = 0.15
        else:
            daily_vol = 0.014
            annual_drift = 0.11

        daily_drift = annual_drift / 252.0
        returns = rng.normal(daily_drift, daily_vol, days)
        # Price path via geometric Brownian motion
        price_series = base_price * np.cumprod(1 + returns)

        # Normalize ending price around realistic base price
        ratio = base_price / price_series[-1]
        price_series = price_series * (0.8 + 0.2 * ratio)

        dates = pd.date_range(end=datetime.date.today(), periods=days, freq="B")

        open_pct = rng.uniform(-0.005, 0.005, days)
        high_pct = rng.uniform(0.004, 0.018, days)
        low_pct = rng.uniform(0.004, 0.018, days)

        open_prices = price_series * (1 + open_pct)
        high_prices = np.maximum(price_series, open_prices) * (1 + high_pct)
        low_prices = np.minimum(price_series, open_prices) * (1 - low_pct)
        volumes = rng.integers(250000, 7500000, days)

        df = pd.DataFrame(
            {
                "Open": np.round(open_prices, 2),
                "High": np.round(high_prices, 2),
                "Low": np.round(low_prices, 2),
                "Close": np.round(price_series, 2),
                "Volume": volumes,
            },
            index=dates,
        )
        return df

    async def get_universe(self) -> List[Dict[str, Any]]:
        return self._universe

    async def get_history(self, symbol: str, days: int = 252) -> pd.DataFrame:
        clean = symbol.strip().upper().replace(".NS", "").replace(".BO", "")
        file_path = SAMPLE_DIR / f"{clean}.json"

        if file_path.exists():
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                df = pd.DataFrame(data)
                df["date"] = pd.to_datetime(df["date"])
                df.set_index("date", inplace=True)
                df.rename(columns={"open": "Open", "high": "High", "low": "Low", "close": "Close", "volume": "Volume"}, inplace=True)
                return df.tail(days)
            except Exception as e:
                print(f"[SampleDataProvider] Error loading {file_path}: {e}")

        # Find matching stock meta or default
        matched = next((s for s in self._universe if s["symbol"] == clean), {"symbol": clean, "base_price": 1200.0, "sector": "Broad Market"})
        df = self._generate_synthetic_ohlcv(matched, days=days)
        return df

    async def get_quote(self, symbol: str) -> Dict[str, Any]:
        clean = symbol.strip().upper().replace(".NS", "").replace(".BO", "")
        matched = next((s for s in self._universe if s["symbol"] == clean), None)
        df = await self.get_history(clean, days=5)

        if not df.empty:
            last = df.iloc[-1]
            prev = df.iloc[-2] if len(df) > 1 else last
            ltp = float(last["Close"])
            prev_close = float(prev["Close"])
            change = round(ltp - prev_close, 2)
            change_pct = round((change / prev_close) * 100, 2) if prev_close else 0.0
            open_p = float(last["Open"])
            high_p = float(last["High"])
            low_p = float(last["Low"])
            volume = int(last["Volume"])
        else:
            base = matched["base_price"] if matched else 1000.0
            ltp = base
            prev_close = base
            change = 0.0
            change_pct = 0.0
            open_p = base
            high_p = base
            low_p = base
            volume = 1000000

        return {
            "symbol": clean,
            "company_name": matched["name"] if matched else f"{clean} Ltd",
            "sector": matched["sector"] if matched else "General",
            "market_cap_category": matched.get("market_cap_category", "Large Cap") if matched else "Large Cap",
            "ltp": ltp,
            "open": open_p,
            "high": high_p,
            "low": low_p,
            "close": prev_close,
            "change": change,
            "change_pct": change_pct,
            "volume": volume,
            "data_source": "sample",
            "timestamp": datetime.datetime.now().isoformat(),
        }

sample_provider = SampleDataProvider()
