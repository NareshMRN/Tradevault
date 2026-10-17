from typing import Dict, Any, List, Optional
import pandas as pd
from app.data.base import MarketDataProvider
from app.market.groww_client import groww_client
from app.data.sample_provider import sample_provider

class GrowwProvider(MarketDataProvider):
    """
    Groww API Market Data Provider implementing MarketDataProvider interface.
    Serves as an extensible secondary broker provider alongside Angel One.
    """

    def __init__(self):
        self._client = groww_client

    def is_configured(self) -> bool:
        return bool(self._client and hasattr(self._client, "auth") and self._client.auth.is_configured())

    async def get_universe(self) -> List[Dict[str, Any]]:
        return await sample_provider.get_universe()

    async def get_history(self, symbol: str, days: int = 252) -> pd.DataFrame:
        clean = symbol.strip().upper().replace(".NS", "").replace(".BO", "")
        df = self._client.get_candles(clean, days=days)
        if df is not None and not df.empty and len(df) >= 10:
            return df
        raise RuntimeError(f"Groww candle data unavailable for {symbol}")

    async def get_quote(self, symbol: str) -> Dict[str, Any]:
        clean = symbol.strip().upper().replace(".NS", "").replace(".BO", "")
        raw = self._client.get_quote(clean)

        matched = next((s for s in sample_provider._universe if s["symbol"] == clean), None)
        ltp = float(raw.get("ltp") or raw.get("price") or 0.0)
        close_p = float(raw.get("previous_close") or raw.get("close") or ltp)
        change = float(raw.get("change") or (ltp - close_p))
        change_pct = float(raw.get("change_pct") or 0.0)

        return {
            "symbol": clean,
            "company_name": matched["name"] if matched else f"{clean} Ltd",
            "sector": matched["sector"] if matched else "General",
            "market_cap_category": matched.get("market_cap_category", "Large Cap") if matched else "Large Cap",
            "ltp": ltp,
            "open": float(raw.get("open") or ltp),
            "high": float(raw.get("high") or ltp),
            "low": float(raw.get("low") or ltp),
            "close": close_p,
            "change": round(change, 2),
            "change_pct": round(change_pct, 2),
            "volume": int(raw.get("volume") or 0),
            "data_source": "live",
            "timestamp": raw.get("timestamp"),
        }

groww_provider = GrowwProvider()
