from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List
import pandas as pd

class MarketDataProvider(ABC):
    """
    Abstract interface for Indian Market (NSE/BSE) data providers.
    Ensures uniform data structures across Live (Angel One/Groww), Cache, and Sample feeds.
    """

    @abstractmethod
    async def get_universe(self) -> List[Dict[str, Any]]:
        """
        Returns universe of tradable Indian equities with sector categorization.
        [
            {
                "symbol": "RELIANCE",
                "trading_symbol": "RELIANCE-EQ",
                "name": "Reliance Industries Ltd",
                "sector": "Energy & Petrochemicals",
                "market_cap_category": "Large Cap",
                "base_price": 2980.0
            },
            ...
        ]
        """
        pass

    @abstractmethod
    async def get_history(self, symbol: str, days: int = 252) -> pd.DataFrame:
        """
        Returns historical daily OHLCV dataframe.
        DataFrame must contain columns: ['Open', 'High', 'Low', 'Close', 'Volume']
        with DatetimeIndex sorted chronologically.
        """
        pass

    @abstractmethod
    async def get_quote(self, symbol: str) -> Dict[str, Any]:
        """
        Returns real-time or simulated market quote for an equity symbol.
        {
            "symbol": "RELIANCE",
            "company_name": "Reliance Industries Ltd",
            "sector": "Energy & Petrochemicals",
            "ltp": 2985.50,
            "open": 2970.00,
            "high": 3005.00,
            "low": 2962.00,
            "close": 2968.20,
            "change": 17.30,
            "change_pct": 0.58,
            "volume": 4820190,
            "data_source": "live" | "cache" | "sample",
            "timestamp": "2026-10-17T13:00:00+05:30"
        }
        """
        pass
