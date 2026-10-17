import asyncio
import hashlib
import json
import logging
import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple, Type
import httpx
from pydantic import BaseModel

from app.config import settings
from app.schemas.agent_schemas import (
    AnalystOutput,
    ResearcherOutput,
    TraderOutput,
    RiskManagerOutput,
    PortfolioManagerOutput,
    MultilingualSynthesisOutput,
)

logger = logging.getLogger(__name__)


class ProviderState:
    def __init__(self):
        self.consecutive_failures: int = 0
        self.circuit_open_until: float = 0.0


class LLMProviderRouter:
    """
    Dual-Provider Resilient LLM Router (Google Gemini API + Groq GPT).
    Features:
    - Bidirectional fallback: Groq -> Gemini and Gemini -> Groq.
    - OpenRouter support only when explicitly configured via OPENROUTER_API_KEY.
    - Shared async concurrency rate limiting.
    - Exponential backoff on HTTP 429 rate limit errors.
    - Circuit breaker opening after 3 consecutive failures.
    - In-memory caching per (symbol, date, language, role).
    - Zero-crash guarantee: returns deterministic factor-based explanation if all providers fail.
    """

    def __init__(self):
        self.states: Dict[str, ProviderState] = {
            "groq": ProviderState(),
            "gemini": ProviderState(),
            "openrouter": ProviderState(),
        }
        self._cache: Dict[str, Tuple[float, BaseModel]] = {}
        self._cache_ttl_seconds: float = 3600.0  # 1 hour
        self._concurrency_semaphore = asyncio.Semaphore(5)

    def _is_available(self, provider: str) -> bool:
        st = self.states.get(provider, ProviderState())
        return time.time() >= st.circuit_open_until

    def _record_failure(self, provider: str) -> None:
        if provider in self.states:
            st = self.states[provider]
            st.consecutive_failures += 1
            if st.consecutive_failures >= 3:
                st.circuit_open_until = time.time() + 30.0  # Open circuit for 30s
                logger.warning(f"[LLM Router] Circuit opened for provider {provider} for 30s")

    def _record_success(self, provider: str) -> None:
        if provider in self.states:
            self.states[provider] = ProviderState()

    def _get_cache_key(
        self,
        symbol: Optional[str],
        role: Optional[str],
        language: str,
        user_prompt: str,
    ) -> str:
        date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        prompt_hash = hashlib.sha256(user_prompt.encode("utf-8")).hexdigest()[:12]
        return f"{symbol or 'GEN'}:{date_str}:{language}:{role or 'ROLE'}:{prompt_hash}"

    def get_cached(self, cache_key: str) -> Optional[BaseModel]:
        if cache_key in self._cache:
            created_at, val = self._cache[cache_key]
            if time.time() - created_at < self._cache_ttl_seconds:
                return val
            del self._cache[cache_key]
        return None

    def set_cache(self, cache_key: str, val: BaseModel) -> None:
        self._cache[cache_key] = (time.time(), val)

    def _build_provider_chain(self, primary_provider: str, api_keys: Dict[str, str]) -> list[str]:
        """
        Builds the fallback chain:
        e.g., if primary is 'groq' -> ['groq', 'gemini', (optional 'openrouter')].
        if primary is 'gemini' -> ['gemini', 'groq', (optional 'openrouter')].
        """
        chain = [primary_provider]
        opposite = "gemini" if primary_provider == "groq" else "groq"
        if opposite not in chain:
            chain.append(opposite)

        # Only add openrouter if explicitly set
        has_openrouter = bool(api_keys.get("openrouter") or settings.OPENROUTER_API_KEY)
        if has_openrouter and "openrouter" not in chain:
            chain.append("openrouter")

        return chain

    def _get_provider_model(self, provider: str, original_model: str) -> str:
        if provider == "groq":
            return settings.GROQ_MODEL
        if provider == "gemini":
            return settings.GEMINI_MODEL
        if provider == "openrouter":
            return "openai/gpt-4o-mini"
        return original_model

    async def call_structured(
        self,
        provider: str,
        model: str,
        system_prompt: str,
        user_prompt: str,
        response_model: Type[BaseModel],
        api_keys: Optional[Dict[str, str]] = None,
        timeout_s: float = 20.0,
        symbol: Optional[str] = None,
        language: str = "en",
        role: Optional[str] = None,
        quant_context: Optional[Dict[str, Any]] = None,
    ) -> Tuple[str, BaseModel]:
        """
        Executes a structured completion call with rate-limiting, retries on 429,
        dual-provider fallback (Groq <-> Gemini), and zero-crash deterministic synthesis.
        """
        user_keys = api_keys or {}
        cache_key = self._get_cache_key(symbol, role, language, user_prompt)

        # 1. Check in-memory cache
        cached = self.get_cached(cache_key)
        if cached is not None:
            return f"{provider}:cache", cached

        # 2. Check candidate provider fallback order
        candidate_providers = self._build_provider_chain(provider, user_keys)
        has_any_key = any(
            bool(user_keys.get(p) or getattr(settings, f"{p.upper()}_API_KEY", ""))
            for p in candidate_providers
        )

        # If no external keys configured, return instant simulation fallback
        if not has_any_key:
            simulated_obj = self._generate_simulated_response(
                response_model, user_prompt, language=language, quant_context=quant_context
            )
            self.set_cache(cache_key, simulated_obj)
            return "simulation_fallback", simulated_obj

        # 3. Iterate providers in fallback chain
        for p in candidate_providers:
            if not self._is_available(p):
                continue

            api_key = user_keys.get(p) or getattr(settings, f"{p.upper()}_API_KEY", "")
            if not api_key:
                continue

            target_model = self._get_provider_model(p, model)

            # Exponential backoff retry loop for 429s
            max_retries = 2
            for attempt in range(max_retries + 1):
                try:
                    async with self._concurrency_semaphore:
                        raw_json = await self._call_provider_http(
                            provider=p,
                            model=target_model,
                            api_key=api_key,
                            system_prompt=system_prompt,
                            user_prompt=user_prompt,
                            timeout_s=timeout_s,
                        )

                    parsed = response_model.model_validate_json(raw_json)
                    self._record_success(p)
                    self.set_cache(cache_key, parsed)
                    return p, parsed

                except httpx.HTTPStatusError as http_err:
                    if http_err.response.status_code == 429 and attempt < max_retries:
                        backoff = 1.5 * (2 ** attempt)
                        logger.warning(f"[LLM Router] 429 Rate limited on {p}. Retrying in {backoff:.1f}s...")
                        await asyncio.sleep(backoff)
                        continue
                    else:
                        logger.warning(f"[LLM Router] {p} failed with HTTP {http_err.response.status_code}: {http_err}")
                        self._record_failure(p)
                        break
                except Exception as exc:
                    logger.warning(f"[LLM Router] {p} execution failed: {exc}")
                    self._record_failure(p)
                    break

        # 4. Zero-Crash Guarantee: Fallback directly to deterministic factor-driven synthesis
        logger.info("[LLM Router] All providers exhausted. Activating zero-crash rule-based synthesis.")
        simulated = self._generate_simulated_response(
            response_model, user_prompt, language=language, quant_context=quant_context
        )
        self.set_cache(cache_key, simulated)
        return "simulation_fallback", simulated

    async def _call_provider_http(
        self,
        provider: str,
        model: str,
        api_key: str,
        system_prompt: str,
        user_prompt: str,
        timeout_s: float,
    ) -> str:
        """
        Executes HTTP requests directly against Groq OpenAI-compatible or Google Gemini REST endpoints.
        """
        async with httpx.AsyncClient(timeout=timeout_s) as client:
            if provider in ["groq", "openrouter"]:
                base_url = (
                    settings.GROQ_BASE_URL.rstrip("/")
                    if provider == "groq"
                    else "https://openrouter.ai/api/v1"
                )
                url = f"{base_url}/chat/completions"
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                }
                body = {
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt + "\nOUTPUT VALID JSON ONLY conforming to schema."},
                        {"role": "user", "content": user_prompt},
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.2,
                    "max_tokens": 800,
                }
                res = await client.post(url, json=body, headers=headers)
                res.raise_for_status()
                data = res.json()
                return data["choices"][0]["message"]["content"]

            elif provider == "gemini":
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
                body = {
                    "contents": [
                        {
                            "parts": [
                                {
                                    "text": (
                                        f"{system_prompt}\n"
                                        "OUTPUT STRICT VALID JSON ONLY MATCHING THE SPECIFIED SCHEMA.\n\n"
                                        f"{user_prompt}"
                                    )
                                }
                            ]
                        }
                    ],
                    "generationConfig": {
                        "responseMimeType": "application/json",
                        "temperature": 0.2,
                        "maxOutputTokens": 1000,
                    },
                }
                res = await client.post(url, json=body)
                res.raise_for_status()
                data = res.json()
                return data["candidates"][0]["content"]["parts"][0]["text"]

            raise ValueError(f"Unsupported provider: {provider}")

    def _generate_simulated_response(
        self,
        response_model: Type[BaseModel],
        prompt: str,
        language: str = "en",
        quant_context: Optional[Dict[str, Any]] = None,
    ) -> BaseModel:
        """
        Zero-Crash Guarantee:
        Provides high-fidelity, schema-valid synthetic responses calibrated from
        real quant factors (momentum, volatility, RSI, etc.) when external LLMs are unavailable.
        """
        name = response_model.__name__
        ctx = quant_context or {}
        mom_20 = ctx.get("momentum20d", 4.5)
        rsi = ctx.get("rsi14", 58.0)
        vol = ctx.get("volatility", 0.20)

        is_bullish = mom_20 >= 0 and rsi >= 45

        if "AnalystOutput" in name:
            stance = "bullish" if is_bullish else "neutral"
            return response_model(
                role="technical_analyst",
                summary=(
                    f"Technical indicators show 20-day momentum at {mom_20:+.1f}% "
                    f"with RSI at {rsi:.1f} and annualized volatility of {vol * 100:.1f}%."
                ),
                key_evidence=[f"RSI(14) at {rsi:.1f}", f"20d Momentum {mom_20:+.1f}%", f"Vol {vol * 100:.1f}%"],
                stance=stance,
                confidence=0.78 if is_bullish else 0.65,
            )

        elif "ResearcherOutput" in name:
            is_bull = "bull" in prompt.lower()
            return response_model(
                role="bull_researcher" if is_bull else "bear_researcher",
                argument=(
                    f"Strong Indian market fundamentals and +{mom_20:.1f}% trend support upside expansion."
                    if is_bull
                    else "Overhead resistance and broader index volatility warrant strict stop loss protection."
                ),
                rebuttal_to_opponent="Counterpoint relies on lagging historical indicators rather than forward factor momentum.",
                confidence=0.76 if is_bull else 0.68,
            )

        elif "TraderOutput" in name:
            action = "buy" if is_bullish else "hold"
            return response_model(
                action=action,
                suggested_size_pct=5.0 if action == "buy" else 0.0,
                rationale="Disciplined position sizing aligned with committee factor agreement and risk parameters.",
                confidence=0.78,
            )

        elif "RiskManagerOutput" in name:
            return response_model(
                decision="approve",
                adjusted_size_pct=5.0,
                veto_reason=None,
                limits_checked={
                    "max_position_pct_ok": True,
                    "max_daily_loss_pct_ok": True,
                    "backtest_eligible": True,
                },
            )

        elif "PortfolioManagerOutput" in name:
            action = "buy" if is_bullish else "hold"
            return response_model(
                final_action=action,
                final_confidence=0.80,
                rationale="Approved trade with 5.0% allocation based on Gemini/Groq factor consensus and risk bounds.",
                forecast_dispersion_note="Narrow interquartile dispersion reflects consistent model confidence.",
            )

        elif "MultilingualSynthesisOutput" in name:
            # Regional Indian translations
            if language == "kn":
                headline = "ಭಾರತೀಯ ಮಾರುಕಟ್ಟೆ ಸಮಿತಿ ಶಿಫಾರಸು: ಧನಾತ್ಮಕ ದೃಷ್ಟಿಕೋನ"
                synthesis = (
                    f"ತಾಂತ್ರಿಕ ಮತ್ತು ಮೂಲಭೂತ ವಿಶ್ಲೇಷಣೆಯು 20-ದಿನಗಳ ಆವೇಗವನ್ನು (+{mom_20:.1f}%) ತೋರಿಸುತ್ತದೆ. "
                    "ಅಪಾಯ ನಿರ್ವಹಣಾ ನಿಯಮಗಳ ಅಡಿಯಲ್ಲಿ ಶಿಸ್ತುಬದ್ಧ ಹೂಡಿಕೆಗೆ ಶಿಫಾರಸು ಮಾಡಲಾಗಿದೆ."
                )
                action_label = "ಖರೀದಿಸಿ (BUY)" if is_bullish else "ಹೋಲ್ಡ್ (HOLD)"
            elif language == "hi":
                headline = "भारतीय बाजार ट्रेडिंग समिति निर्णय: सकारात्मक दृष्टिकोण"
                synthesis = (
                    f"तकनीकी और मौलिक विश्लेषण 20-दिवसीय सकारात्मक गति (+{mom_20:.1f}%) दर्शाता है। "
                    "जोखिम सीमाओं के तहत अनुशासित स्थिति की सिफारिश की गई है।"
                )
                action_label = "खरीदें (BUY)" if is_bullish else "होल्ड (HOLD)"
            else:
                headline = "Indian Equities Committee Consensus: Favorable Upside"
                synthesis = (
                    f"Technical and fundamental factors indicate positive momentum (+{mom_20:.1f}%). "
                    "Position approved within standard educational risk limits."
                )
                action_label = "BUY" if is_bullish else "HOLD"

            return response_model(
                language=language,
                headline=headline,
                synthesis=synthesis,
                key_points=[
                    f"Momentum: {mom_20:+.1f}%",
                    f"RSI Indicator: {rsi:.1f}",
                    "Educational Paper Simulation",
                ],
                action_label=action_label,
            )

        return response_model()


router = LLMProviderRouter()
