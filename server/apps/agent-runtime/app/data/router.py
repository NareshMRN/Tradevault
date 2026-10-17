import asyncio
import logging
from typing import Dict, Any, List, Optional
import pandas as pd
from app.data.base import MarketDataProvider
from app.data.angel_one import angel_one_provider, AngelOneProvider
from app.data.groww_provider import groww_provider, GrowwProvider
from app.data.sample_provider import sample_provider, SampleDataProvider
from app.data.cache import cache_layer

logger = logging.getLogger("MarketDataRouter")

class MarketDataRouter(MarketDataProvider):
    """
    Unified, resilient Indian Market Data Router.
    Hierarchical fallback:
    1. Angel One SmartAPI (Live)
    2. Groww Trading API (Live Secondary)
    3. Cache Layer (Memory / Firestore with TTL)
    4. Offline Sample Data Provider (Guaranteed 55+ Nifty stocks)

    Every return payload explicitly includes:
    `data_source: "live" | "cache" | "sample"`
    """

    def __init__(self):
        self.angel = angel_one_provider
        self.groww = groww_provider
        self.sample = sample_provider
        self.cache = cache_layer

    async def get_universe(self) -> List[Dict[str, Any]]:
        """Returns the complete list of 55+ NSE stocks mapped to sectors."""
        return await self.sample.get_universe()

    async def get_sectors(self) -> List[str]:
        """Returns unique sector names in universe."""
        universe = await self.get_universe()
        sectors = sorted(list(set(s["sector"] for s in universe if s.get("sector"))))
        return sectors

    async def get_stocks_by_sector(self, sector: str) -> List[Dict[str, Any]]:
        """Returns all stocks belonging to a specific sector."""
        universe = await self.get_universe()
        return [s for s in universe if s.get("sector", "").lower() == sector.lower()]

    async def get_quote(self, symbol: str) -> Dict[str, Any]:
        """
        Fetches quote with transparent multi-tier fallback.
        Ensures `data_source` is explicitly tagged.
        """
        clean = symbol.strip().upper().replace(".NS", "").replace(".BO", "")

        # 1. Check Cache Layer first
        cached = await self.cache.get_quote(clean)
        if cached:
            return cached

        # 2. Try Angel One (Live Primary)
        if self.angel.is_configured():
            try:
                quote = await self.angel.get_quote(clean)
                quote["data_source"] = "live"
                # Store in cache with 180s TTL
                await self.cache.set_quote(clean, quote, ttl_seconds=180)
                return quote
            except Exception as e:
                logger.warning(f"[MarketRouter] Angel One quote failed for {clean}: {e}")

        # 3. Try Groww (Live Secondary)
        if self.groww.is_configured():
            try:
                quote = await self.groww.get_quote(clean)
                quote["data_source"] = "live"
                await self.cache.set_quote(clean, quote, ttl_seconds=180)
                return quote
            except Exception as e:
                logger.warning(f"[MarketRouter] Groww quote failed for {clean}: {e}")

        # 4. Fallback: Sample Data Provider (Guaranteed)
        sample_quote = await self.sample.get_quote(clean)
        sample_quote["data_source"] = "sample"
        # Cache sample quote so repeated scans are fast
        await self.cache.set_quote(clean, sample_quote, ttl_seconds=300)
        return sample_quote

    async def get_history(self, symbol: str, days: int = 252) -> pd.DataFrame:
        """
        Fetches historical daily OHLCV bars with multi-tier fallback.
        """
        clean = symbol.strip().upper().replace(".NS", "").replace(".BO", "")

        # 1. Check Cache
        cached_df = await self.cache.get_history(clean, days)
        if cached_df is not None and len(cached_df) >= min(days, 20):
            cached_df.attrs["data_source"] = "cache"
            return cached_df

        # 2. Try Angel One (Live Primary)
        if self.angel.is_configured():
            try:
                df = await self.angel.get_history(clean, days=days)
                if df is not None and not df.empty and len(df) >= 20:
                    df.attrs["data_source"] = "live"
                    await self.cache.set_history(clean, df, ttl_seconds=1800)
                    return df
            except Exception as e:
                logger.warning(f"[MarketRouter] Angel One history failed for {clean}: {e}")

        # 3. Try Groww (Live Secondary)
        if self.groww.is_configured():
            try:
                df = await self.groww.get_history(clean, days=days)
                if df is not None and not df.empty and len(df) >= 20:
                    df.attrs["data_source"] = "live"
                    await self.cache.set_history(clean, df, ttl_seconds=1800)
                    return df
            except Exception as e:
                logger.warning(f"[MarketRouter] Groww history failed for {clean}: {e}")

        # 4. Fallback: Sample Data Provider (Guaranteed)
        df = await self.sample.get_history(clean, days=days)
        df.attrs["data_source"] = "sample"
        await self.cache.set_history(clean, df, ttl_seconds=3600)
        return df

market_router = MarketDataRouter()
