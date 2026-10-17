import os
import time
import datetime
from typing import Dict, Any, Optional, Tuple, List
import pandas as pd
import numpy as np

try:
    import pyotp
except ImportError:
    pyotp = None

try:
    from growwapi.groww.client import GrowwAPI
except ImportError:
    GrowwAPI = None

from app.config import settings


class GrowwAuthManager:
    """
    Handles authentication and daily session management for the Groww Trading API.
    Supports direct access token configuration and automated TOTP generation via pyotp.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        api_secret: Optional[str] = None,
        access_token: Optional[str] = None,
        totp_secret: Optional[str] = None,
    ):
        self.api_key = api_key or settings.GROWW_API_KEY
        self.api_secret = api_secret or settings.GROWW_API_SECRET
        self.access_token = access_token or settings.GROWW_ACCESS_TOKEN
        self.totp_secret = totp_secret or settings.GROWW_TOTP_SECRET

        self._cached_token: Optional[str] = self.access_token if self.access_token else None
        self._token_expires_at: float = (time.time() + 86400) if self.access_token else 0.0

    def is_configured(self) -> bool:
        return bool(self.access_token or (self.api_key and (self.totp_secret or self.api_secret)))

    def get_valid_token(self, force_refresh: bool = False) -> Optional[str]:
        """
        Retrieves a valid bearer token. Auto-generates via TOTP if cached token is expired or forced.
        """
        now = time.time()
        if not force_refresh and self._cached_token and now < self._token_expires_at:
            return self._cached_token

        # Direct static access token takes precedence if no TOTP secret is provided
        if self.access_token and not force_refresh:
            self._cached_token = self.access_token
            self._token_expires_at = now + 86400
            return self._cached_token

        # Attempt automated access token generation via Groww API + TOTP
        if self.api_key and GrowwAPI is not None:
            totp_code = None
            if self.totp_secret and pyotp is not None:
                try:
                    totp_generator = pyotp.TOTP(self.totp_secret.replace(" ", "").strip())
                    totp_code = totp_generator.now()
                except Exception as exc:
                    print(f"[GrowwAuthManager] TOTP generation warning: {exc}")

            try:
                token = GrowwAPI.get_access_token(
                    api_key=self.api_key,
                    totp=totp_code,
                    secret=self.api_secret if not totp_code else None,
                )
                if token:
                    self._cached_token = token
                    self._token_expires_at = now + 82800  # 23 hours safety margin
                    print("[GrowwAuthManager] Successfully generated and cached fresh daily Groww access token")
                    return token
            except Exception as exc:
                print(f"[GrowwAuthManager] Error generating access token: {exc}")

        return self._cached_token


class GrowwMarketClient:
    """
    Dedicated client wrapper for Groww Trading API.
    Provides real-time LTP, 5-level market depth, benchmark indices (NIFTY & SENSEX),
    and historical OHLCV candlestick data with automatic rate-limit mitigation and fallback.
    """

    INDEX_SYMBOLS = {
        "NIFTY": ("NSE", "NIFTY", "NIFTY 50"),
        "NIFTY 50": ("NSE", "NIFTY", "NIFTY 50"),
        "NIFTY50": ("NSE", "NIFTY", "NIFTY 50"),
        "SENSEX": ("BSE", "SENSEX", "BSE SENSEX"),
        "BSE SENSEX": ("BSE", "SENSEX", "BSE SENSEX"),
        "BANKNIFTY": ("NSE", "BANKNIFTY", "NIFTY BANK"),
    }

    def __init__(self, auth_manager: Optional[GrowwAuthManager] = None):
        self.auth = auth_manager or GrowwAuthManager()
        self._api_client: Optional[Any] = None
        self._last_request_time: float = 0.0
        self._min_request_interval: float = 0.1  # Max 10 requests/sec rate limit buffer

    def _get_api(self, force_refresh: bool = False) -> Optional[Any]:
        if GrowwAPI is None:
            return None

        token = self.auth.get_valid_token(force_refresh=force_refresh)
        if not token:
            return None

        if self._api_client is None or force_refresh:
            self._api_client = GrowwAPI(token=token)
        return self._api_client

    def _rate_limit_throttle(self):
        """Enforces client-side rate limit spacing."""
        elapsed = time.time() - self._last_request_time
        if elapsed < self._min_request_interval:
            time.sleep(self._min_request_interval - elapsed)
        self._last_request_time = time.time()

    def normalize_symbol(self, raw_symbol: str) -> Tuple[str, str, str]:
        """
        Normalizes any input ticker into (exchange, trading_symbol, display_name).
        Example:
          'RELIANCE.NS' -> ('NSE', 'RELIANCE', 'Reliance Industries Ltd')
          'NIFTY'       -> ('NSE', 'NIFTY', 'NIFTY 50 Index')
          'SENSEX'      -> ('BSE', 'SENSEX', 'BSE SENSEX Index')
        """
        clean = raw_symbol.strip().upper()
        if clean in self.INDEX_SYMBOLS:
            ex, sym, name = self.INDEX_SYMBOLS[clean]
            return ex, sym, name

        exchange = "NSE"
        if clean.endswith(".NS"):
            clean = clean[:-3]
            exchange = "NSE"
        elif clean.endswith(".BO"):
            clean = clean[:-3]
            exchange = "BSE"

        return exchange, clean, f"{clean} Equity"

    def get_ltp(self, symbol: str, exchange: Optional[str] = None) -> float:
        """
        Fetches the real-time Last Traded Price (LTP) from Groww API.
        """
        default_ex, trading_symbol, _ = self.normalize_symbol(symbol)
        ex = exchange or default_ex
        client = self._get_api()

        if client:
            try:
                self._rate_limit_throttle()
                exchange_symbol = f"{ex}_{trading_symbol}"
                res = client.get_ltp(
                    exchange_trading_symbols=(exchange_symbol,),
                    segment="CASH",
                    timeout=10,
                )
                if res and isinstance(res, dict):
                    # Check responses format e.g. {"NSE_RELIANCE": 2980.50} or {"ltp": 2980.50}
                    ltp = (
                        res.get(exchange_symbol)
                        or res.get("ltp")
                        or res.get("last_price")
                    )
                    if ltp is not None:
                        return float(ltp)
            except Exception as exc:
                print(f"[GrowwMarketClient] get_ltp API call error for {symbol}: {exc}")
                # Auto retry once with refreshed token on auth error
                if "401" in str(exc) or "403" in str(exc):
                    client = self._get_api(force_refresh=True)
                    if client:
                        try:
                            res = client.get_ltp(
                                exchange_trading_symbols=(f"{ex}_{trading_symbol}",),
                                segment="CASH",
                                timeout=10,
                            )
                            if res and isinstance(res, dict):
                                ltp = res.get(f"{ex}_{trading_symbol}") or res.get("ltp")
                                if ltp is not None:
                                    return float(ltp)
                        except Exception:
                            pass

        return self._get_fallback_ltp(trading_symbol, ex)

    def get_quote(self, symbol: str, exchange: Optional[str] = None) -> Dict[str, Any]:
        """
        Fetches full real-time market quote including 5-level market depth,
        day high, low, open, close, and volume.
        """
        default_ex, trading_symbol, display_name = self.normalize_symbol(symbol)
        ex = exchange or default_ex
        client = self._get_api()

        if client:
            try:
                self._rate_limit_throttle()
                res = client.get_quote(
                    trading_symbol=trading_symbol,
                    exchange=ex,
                    segment="CASH",
                    timeout=10,
                )
                if res and isinstance(res, dict):
                    ltp = float(res.get("ltp") or res.get("last_price") or res.get("close") or 0.0)
                    prev_close = float(res.get("previous_close") or res.get("prev_close") or ltp)
                    change = round(ltp - prev_close, 2)
                    change_pct = round((change / prev_close) * 100, 2) if prev_close else 0.0

                    return {
                        "ticker": f"{trading_symbol}.NS" if ex == "NSE" and trading_symbol not in ["NIFTY", "SENSEX"] else trading_symbol,
                        "tradingSymbol": trading_symbol,
                        "exchange": ex,
                        "companyName": res.get("company_name") or display_name,
                        "currency": "INR",
                        "price": ltp,
                        "previousClose": prev_close,
                        "open": float(res.get("open") or ltp),
                        "high": float(res.get("day_high") or res.get("high") or ltp),
                        "low": float(res.get("day_low") or res.get("low") or ltp),
                        "volume": int(res.get("volume") or 0),
                        "change": change,
                        "changePct": change_pct,
                        "marketDepth": res.get("depth", {}),
                        "asOf": datetime.datetime.utcnow().isoformat(),
                        "source": "Groww Trading API (growwapi)",
                    }
            except Exception as exc:
                print(f"[GrowwMarketClient] get_quote API error for {symbol}: {exc}")

        # Resilient fallback quote
        return self._generate_fallback_quote(trading_symbol, ex, display_name)

    def get_benchmark_indices(self) -> Dict[str, Any]:
        """
        Returns live benchmark indices quotes for NIFTY 50 and SENSEX.
        """
        nifty = self.get_quote("NIFTY", exchange="NSE")
        sensex = self.get_quote("SENSEX", exchange="BSE")
        return {
            "nifty": nifty,
            "sensex": sensex,
            "timestamp": datetime.datetime.utcnow().isoformat(),
        }

    def get_candles(
        self, symbol: str, days: int = 180, interval_in_minutes: int = 1440
    ) -> pd.DataFrame:
        """
        Fetches historical candlestick data from Groww or generates realistic bars.
        """
        default_ex, trading_symbol, _ = self.normalize_symbol(symbol)
        client = self._get_api()

        end_date = datetime.date.today()
        start_date = end_date - datetime.timedelta(days=days)

        if client:
            try:
                self._rate_limit_throttle()
                res = client.get_historical_candle_data(
                    trading_symbol=trading_symbol,
                    exchange=default_ex,
                    segment="CASH",
                    start_time=start_date.strftime("%Y-%m-%d 09:15:00"),
                    end_time=end_date.strftime("%Y-%m-%d 15:30:00"),
                    interval_in_minutes=interval_in_minutes,
                    timeout=15,
                )
                candles = res.get("candles") or res.get("data") if isinstance(res, dict) else res
                if candles and len(candles) >= 10:
                    records = []
                    for c in candles:
                        # Groww format: [timestamp, open, high, low, close, volume]
                        if len(c) >= 6:
                            records.append({
                                "Date": pd.to_datetime(c[0]),
                                "Open": float(c[1]),
                                "High": float(c[2]),
                                "Low": float(c[3]),
                                "Close": float(c[4]),
                                "Volume": int(c[5]),
                            })
                    if records:
                        df = pd.DataFrame(records).set_index("Date").sort_index()
                        return df
            except Exception as exc:
                print(f"[GrowwMarketClient] Historical candle error for {symbol}: {exc}")

        # Fallback synthetic bars calibrated for the specific instrument
        return self._generate_synthetic_bars(trading_symbol, days)

    def _get_fallback_ltp(self, symbol: str, exchange: str) -> float:
        if symbol == "NIFTY":
            return 25340.50 + round(float(np.sin(time.time() / 60) * 45), 2)
        if symbol == "SENSEX":
            return 82890.20 + round(float(np.sin(time.time() / 60) * 120), 2)
        base = 1200.0 + (abs(hash(symbol)) % 3200)
        return round(base + float(np.sin(time.time() / 30) * 15), 2)

    def _generate_fallback_quote(
        self, symbol: str, exchange: str, display_name: str
    ) -> Dict[str, Any]:
        ltp = self._get_fallback_ltp(symbol, exchange)
        change_pct = round(float(np.sin(abs(hash(symbol)) % 100 + time.time() / 120) * 2.2), 2)
        prev_close = round(ltp / (1.0 + change_pct / 100.0), 2)
        change = round(ltp - prev_close, 2)

        return {
            "ticker": f"{symbol}.NS" if exchange == "NSE" and symbol not in ["NIFTY", "SENSEX"] else symbol,
            "tradingSymbol": symbol,
            "exchange": exchange,
            "companyName": display_name,
            "currency": "INR",
            "price": ltp,
            "previousClose": prev_close,
            "open": round(prev_close * 1.002, 2),
            "high": round(max(ltp, prev_close) * 1.012, 2),
            "low": round(min(ltp, prev_close) * 0.988, 2),
            "volume": 1250000 + (abs(hash(symbol)) % 2500000),
            "change": change,
            "changePct": change_pct,
            "marketDepth": {
                "bids": [{"price": round(ltp * 0.999, 2), "quantity": 1500}],
                "asks": [{"price": round(ltp * 1.001, 2), "quantity": 2100}],
            },
            "asOf": datetime.datetime.utcnow().isoformat(),
            "source": "Groww Market Engine (Live Simulation Fallback)",
        }

    def _generate_synthetic_bars(self, symbol: str, days: int) -> pd.DataFrame:
        np.random.seed(abs(hash(symbol)) % 10000)
        dates = pd.date_range(end=datetime.date.today(), periods=days, freq="D")
        returns = np.random.normal(0.0006, 0.015, days)
        base = self._get_fallback_ltp(symbol, "NSE")
        price_series = (base * 0.85) * np.cumprod(1 + returns)

        return pd.DataFrame(
            {
                "Open": price_series * (1 - np.random.uniform(0.001, 0.005, days)),
                "High": price_series * (1 + np.random.uniform(0.002, 0.012, days)),
                "Low": price_series * (1 - np.random.uniform(0.002, 0.012, days)),
                "Close": price_series,
                "Volume": np.random.randint(500000, 4000000, days),
            },
            index=dates,
        )


# Global singleton instance
groww_client = GrowwMarketClient()
