import time
import os
import json
from typing import Optional, Dict, Any
import pandas as pd

class CacheLayer:
    """
    Two-tier caching layer for Indian Market quotes and historical bars:
    Tier 1: High-speed In-Memory dictionary with monotonic TTL expiry.
    Tier 2: Cloud Firestore collection ('market_cache') when running on GCP/Cloud Run or emulator.
    """

    def __init__(self):
        # In-memory dictionary: key -> {"data": Any, "expires_at": float}
        self._memory_cache: Dict[str, Dict[str, Any]] = {}
        self._firestore_db = None
        self._init_firestore()

    def _init_firestore(self):
        """Attempts to initialize Firestore client if credentials are present."""
        try:
            from google.cloud import firestore
            gcp_project = os.getenv("GCP_PROJECT_ID", "")
            if gcp_project or os.getenv("FIRESTORE_EMULATOR_HOST"):
                self._firestore_db = firestore.AsyncClient(project=gcp_project or "tradevault-dev")
        except Exception:
            self._firestore_db = None

    async def get_quote(self, symbol: str) -> Optional[Dict[str, Any]]:
        clean = symbol.strip().upper().replace(".NS", "").replace(".BO", "")
        key = f"quote:{clean}"
        now = time.time()

        # Check in-memory first
        if key in self._memory_cache:
            entry = self._memory_cache[key]
            if entry["expires_at"] > now:
                cached_data = dict(entry["data"])
                cached_data["data_source"] = "cache"
                return cached_data
            else:
                del self._memory_cache[key]

        # Check Firestore if available
        if self._firestore_db is not None:
            try:
                doc_ref = self._firestore_db.collection("market_cache").document(key)
                doc = await doc_ref.get()
                if doc.exists:
                    doc_data = doc.to_dict()
                    if doc_data.get("expires_at", 0) > now:
                        payload = doc_data.get("payload", {})
                        payload["data_source"] = "cache"
                        # populate local memory cache
                        self._memory_cache[key] = {"data": payload, "expires_at": doc_data["expires_at"]}
                        return payload
            except Exception:
                pass

        return None

    async def set_quote(self, symbol: str, quote_data: Dict[str, Any], ttl_seconds: int = 180) -> None:
        clean = symbol.strip().upper().replace(".NS", "").replace(".BO", "")
        key = f"quote:{clean}"
        expires_at = time.time() + ttl_seconds

        # Store in-memory
        self._memory_cache[key] = {
            "data": quote_data,
            "expires_at": expires_at,
        }

        # Store in Firestore if available
        if self._firestore_db is not None:
            try:
                doc_ref = self._firestore_db.collection("market_cache").document(key)
                await doc_ref.set({
                    "payload": quote_data,
                    "expires_at": expires_at,
                    "updated_at": time.time(),
                })
            except Exception:
                pass

    async def get_history(self, symbol: str, days: int) -> Optional[pd.DataFrame]:
        clean = symbol.strip().upper().replace(".NS", "").replace(".BO", "")
        key = f"history:{clean}:{days}"
        now = time.time()

        if key in self._memory_cache:
            entry = self._memory_cache[key]
            if entry["expires_at"] > now:
                return entry["data"].copy()
            else:
                del self._memory_cache[key]

        return None

    async def set_history(self, symbol: str, df: pd.DataFrame, ttl_seconds: int = 1800) -> None:
        clean = symbol.strip().upper().replace(".NS", "").replace(".BO", "")
        key = f"history:{clean}:{len(df)}"
        expires_at = time.time() + ttl_seconds

        self._memory_cache[key] = {
            "data": df.copy(),
            "expires_at": expires_at,
        }

    def clear(self):
        self._memory_cache.clear()

cache_layer = CacheLayer()
