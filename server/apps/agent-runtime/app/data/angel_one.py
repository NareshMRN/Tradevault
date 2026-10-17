import asyncio
import datetime
import time
from typing import Dict, Any, List, Optional
import httpx
import pyotp
import pandas as pd
from app.config import settings
from app.data.base import MarketDataProvider
from app.data.sample_provider import sample_provider

class AngelOneProvider(MarketDataProvider):
    """
    Live Market Data Provider for Angel One SmartAPI (NSE Equities).
    Features automated TOTP generation, transparent JWT token management,
    instrument token resolution, and rate-limited batching.
    """

    BASE_URL = "https://apiconnect.angelone.in"

    def __init__(self):
        self._jwt_token: Optional[str] = None
        self._refresh_token: Optional[str] = None
        self._feed_token: Optional[str] = None
        self._token_expiry: float = 0.0
        self._token_map: Dict[str, str] = {}
        self._lock = asyncio.Lock()
        self._last_request_time: float = 0.0
        self._init_token_map()

    def is_configured(self) -> bool:
        return bool(
            settings.ANGEL_CLIENT_ID
            and settings.ANGEL_PIN
            and settings.ANGEL_API_KEY
            and settings.ANGEL_TOTP_SECRET
        )

    def _init_token_map(self):
        """Loads static symbol-to-token map from sample universe as base."""
        for stock in sample_provider._universe:
            sym = stock["symbol"]
            token = stock.get("token")
            if token:
                self._token_map[sym] = str(token)

    async def _throttle(self, min_interval: float = 0.35):
        """Ensures compliance with Angel One rate limits (max 3 req/sec)."""
        now = time.time()
        elapsed = now - self._last_request_time
        if elapsed < min_interval:
            await asyncio.sleep(min_interval - elapsed)
        self._last_request_time = time.time()

    async def _authenticate(self) -> bool:
        """Performs TOTP authentication with Angel One SmartAPI."""
        if not self.is_configured():
            return False

        async with self._lock:
            # Check if existing token is valid for at least 5 more minutes
            if self._jwt_token and self._token_expiry > time.time() + 300:
                return True

            try:
                totp = pyotp.TOTP(settings.ANGEL_TOTP_SECRET.strip()).now()
                headers = {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "X-UserType": "USER",
                    "X-SourceID": "WEB",
                    "X-ClientLocalIP": "127.0.0.1",
                    "X-ClientPublicIP": "106.193.147.98",
                    "X-MACAddress": "fe80::216e:6507:4b9c:904",
                    "X-PrivateKey": settings.ANGEL_API_KEY.strip(),
                }
                body = {
                    "clientcode": settings.ANGEL_CLIENT_ID.strip(),
                    "password": settings.ANGEL_PIN.strip(),
                    "totp": totp,
                }

                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(
                        f"{self.BASE_URL}/rest/auth/angelbroking/user/v1/loginByPassword",
                        headers=headers,
                        json=body,
                    )
                    data = resp.json()

                    if resp.status_code == 200 and data.get("status") and data.get("data"):
                        res_data = data["data"]
                        self._jwt_token = res_data.get("jwtToken")
                        self._refresh_token = res_data.get("refreshToken")
                        self._feed_token = res_data.get("feedToken")
                        # Angel One JWT tokens are typically valid for ~24 hours
                        self._token_expiry = time.time() + (20 * 3600)
                        print("[AngelOneProvider] Successfully authenticated session with SmartAPI.")
                        return True
                    else:
                        print(f"[AngelOneProvider] Authentication failed: {data.get('message', resp.text)}")
                        return False
            except Exception as e:
                print(f"[AngelOneProvider] Authentication exception: {e}")
                return False

    async def get_universe(self) -> List[Dict[str, Any]]:
        # Returns Nifty 50/100 universe with Angel One metadata
        return await sample_provider.get_universe()

    def get_symbol_token(self, symbol: str) -> Optional[str]:
        clean = symbol.strip().upper().replace(".NS", "").replace(".BO", "")
        return self._token_map.get(clean)

    async def get_quote(self, symbol: str) -> Dict[str, Any]:
        """Fetches live market quote from Angel One SmartAPI."""
        clean = symbol.strip().upper().replace(".NS", "").replace(".BO", "")
        token = self.get_symbol_token(clean)

        if not self.is_configured() or not token:
            raise RuntimeError(f"Angel One not configured or token missing for {clean}")

        is_auth = await self._authenticate()
        if not is_auth:
            raise RuntimeError("Failed to authenticate with Angel One SmartAPI")

        await self._throttle(0.35)

        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-UserType": "USER",
            "X-SourceID": "WEB",
            "X-ClientLocalIP": "127.0.0.1",
            "X-ClientPublicIP": "106.193.147.98",
            "X-MACAddress": "fe80::216e:6507:4b9c:904",
            "X-PrivateKey": settings.ANGEL_API_KEY.strip(),
            "Authorization": f"Bearer {self._jwt_token}",
        }

        body = {
            "mode": "FULL",
            "exchangeTokens": {
                "NSE": [token],
            },
        }

        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(
                f"{self.BASE_URL}/rest/secure/angelbroking/market/v1/quote/",
                headers=headers,
                json=body,
            )
            data = resp.json()

            if resp.status_code == 200 and data.get("status") and data.get("data"):
                fetched = data["data"].get("fetched", [])
                if fetched:
                    item = fetched[0]
                    ltp = float(item.get("ltp", 0.0))
                    close_p = float(item.get("close", ltp))
                    change = float(item.get("change", ltp - close_p))
                    change_pct = float(item.get("percentChange", 0.0))
                    open_p = float(item.get("open", ltp))
                    high_p = float(item.get("high", ltp))
                    low_p = float(item.get("low", ltp))
                    volume = int(item.get("tradeVolume", 0))

                    matched = next((s for s in sample_provider._universe if s["symbol"] == clean), None)
                    return {
                        "symbol": clean,
                        "company_name": matched["name"] if matched else f"{clean} Ltd",
                        "sector": matched["sector"] if matched else "Broad Market",
                        "market_cap_category": matched.get("market_cap_category", "Large Cap") if matched else "Large Cap",
                        "ltp": ltp,
                        "open": open_p,
                        "high": high_p,
                        "low": low_p,
                        "close": close_p,
                        "change": change,
                        "change_pct": change_pct,
                        "volume": volume,
                        "data_source": "live",
                        "timestamp": datetime.datetime.now().isoformat(),
                    }

            raise RuntimeError(f"Angel One quote fetch failed: {data.get('message', resp.text)}")

    async def get_history(self, symbol: str, days: int = 252) -> pd.DataFrame:
        """Fetches daily candle OHLCV data from Angel One SmartAPI."""
        clean = symbol.strip().upper().replace(".NS", "").replace(".BO", "")
        token = self.get_symbol_token(clean)

        if not self.is_configured() or not token:
            raise RuntimeError(f"Angel One not configured or token missing for {clean}")

        is_auth = await self._authenticate()
        if not is_auth:
            raise RuntimeError("Failed to authenticate with Angel One SmartAPI")

        await self._throttle(0.40)

        to_date = datetime.date.today()
        from_date = to_date - datetime.timedelta(days=int(days * 1.5))

        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-UserType": "USER",
            "X-SourceID": "WEB",
            "X-ClientLocalIP": "127.0.0.1",
            "X-ClientPublicIP": "106.193.147.98",
            "X-MACAddress": "fe80::216e:6507:4b9c:904",
            "X-PrivateKey": settings.ANGEL_API_KEY.strip(),
            "Authorization": f"Bearer {self._jwt_token}",
        }

        body = {
            "exchange": "NSE",
            "symboltoken": token,
            "interval": "ONE_DAY",
            "fromdate": from_date.strftime("%Y-%m-%d 09:15"),
            "todate": to_date.strftime("%Y-%m-%d 15:30"),
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{self.BASE_URL}/rest/secure/angelbroking/historical/v1/getCandleData",
                headers=headers,
                json=body,
            )
            data = resp.json()

            if resp.status_code == 200 and data.get("status") and data.get("data"):
                raw_candles = data["data"]
                # Candle format: [timestamp, open, high, low, close, volume]
                records = []
                for c in raw_candles:
                    records.append({
                        "date": pd.to_datetime(c[0]),
                        "Open": float(c[1]),
                        "High": float(c[2]),
                        "Low": float(c[3]),
                        "Close": float(c[4]),
                        "Volume": int(c[5]),
                    })
                df = pd.DataFrame(records)
                df.set_index("date", inplace=True)
                df.sort_index(inplace=True)
                return df.tail(days)

            raise RuntimeError(f"Angel One candle fetch failed: {data.get('message', resp.text)}")

angel_one_provider = AngelOneProvider()
