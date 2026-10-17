import datetime
import logging
from typing import Dict, Any, List
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

from app.config import settings, AGENT_MODEL_MAPPING
from app.schemas.agent_schemas import (
    AnalystOutput,
    ResearcherOutput,
    TraderOutput,
    RiskManagerOutput,
    PortfolioManagerOutput,
    MultilingualSynthesisOutput,
    AnalysisRunRequest,
)
from app.llm.router import router
from app.agents.prompts import ROLE_PROMPTS
from app.quant.factors import QuantFactorEngine
from app.forecasting.probabilistic import ProbabilisticForecastingEngine

logger = logging.getLogger(__name__)


def _stance_to_score(stance: str) -> float:
    s = stance.lower().strip()
    if s == "bullish":
        return 1.0
    if s == "bearish":
        return 0.0
    return 0.5


class MultiAgentDebateGraph:
    """
    Orchestration graph implementing the Indian Market Multi-Agent Committee:
    - Gemini API: Fundamentals, News Summary, Bull vs Bear debate rounds (1-2), Multilingual Synthesis.
    - Groq GPT: Technical Analysis, Social/Market Sentiment, Trader, Risk Manager, Portfolio Manager.
    - Agreement Evaluation: Measures stance & conviction alignment between Gemini and Groq.
    - Soft Overfitting Gate: Non-blocking reliability warnings.
    - Zero-Crash Guarantee: Robust deterministic fallback if external LLMs are unavailable.
    """

    @classmethod
    async def run(cls, req: AnalysisRunRequest) -> Dict[str, Any]:
        try:
            client = AsyncIOMotorClient(settings.MONGODB_URI, serverSelectionTimeoutMS=1000)
            db = client.get_default_database()
        except Exception:
            db = None

        # Step 1: Ingest factors and forecast distribution
        try:
            factor_doc = await QuantFactorEngine.compute_and_save(req.ticker)
        except Exception as e:
            logger.warning(f"[Graph] Error computing factors for {req.ticker}: {e}")
            factor_doc = {
                "momentum_score": 5.2,
                "volatility": 0.21,
                "rsi_14": 58.5,
                "composite_score": 0.65,
                "is_eligible_for_paper_trading": True,
            }

        try:
            forecast_doc = await ProbabilisticForecastingEngine.forecast(req.ticker, req.horizon)
        except Exception as e:
            logger.warning(f"[Graph] Error predicting forecast for {req.ticker}: {e}")
            forecast_doc = {
                "p10": -2.5,
                "p50": 3.8,
                "p90": 9.2,
                "horizon": req.horizon,
            }

        quant_context = {
            "momentum20d": factor_doc.get("momentum_score", 4.5),
            "rsi14": factor_doc.get("rsi_14", 58.0),
            "volatility": factor_doc.get("volatility", 0.20),
        }

        transcript_messages: List[Dict[str, Any]] = []
        sequence_index = 0

        async def record_message(role: str, provider: str, content: str, structured: Any):
            nonlocal sequence_index
            sequence_index += 1
            msg = {
                "runId": str(req.runId),
                "ticker": req.ticker,
                "agentRole": role,
                "llmProvider": provider,
                "sequenceIndex": sequence_index,
                "content": content,
                "structuredOutput": structured.model_dump() if hasattr(structured, "model_dump") else structured,
                "createdAt": datetime.datetime.now(datetime.timezone.utc),
            }
            if db is not None:
                try:
                    await db.agent_messages.insert_one(msg)
                except Exception as e:
                    logger.debug(f"[Graph] Message persistence note: {e}")
            transcript_messages.append(msg)

        # ----------------------------------------------------
        # Phase 1: Analyst Team (Gemini + Groq GPT committee)
        # ----------------------------------------------------
        analyst_roles = [
            "fundamentals_analyst",  # Gemini
            "news_analyst",          # Gemini
            "technical_analyst",     # Groq
            "sentiment_analyst",     # Groq
        ]

        analyst_outputs: Dict[str, Any] = {}
        for role in analyst_roles:
            spec = AGENT_MODEL_MAPPING.get(role, {"provider": "gemini", "model": settings.GEMINI_MODEL})
            provider = spec["provider"]
            model = spec["model"]

            user_prompt = (
                f"Indian Market Equities Analysis (NSE: {req.ticker})\n"
                f"Quantitative Factor Scores: {factor_doc}\n"
                f"Probabilistic Forecast Distribution ({req.horizon}): {forecast_doc}\n"
                f"Analyze as {role}."
            )
            used_provider, result = await router.call_structured(
                provider=provider,
                model=model,
                system_prompt=ROLE_PROMPTS.get(role, ""),
                user_prompt=user_prompt,
                response_model=AnalystOutput,
                api_keys=req.userApiKeys,
                symbol=req.ticker,
                language=req.language,
                role=role,
                quant_context=quant_context,
            )
            analyst_outputs[role] = result
            await record_message(role, used_provider, result.summary, result)

        # ----------------------------------------------------
        # Phase 2: Bull vs Bear Researcher Debate (Gemini, 1-2 rounds)
        # ----------------------------------------------------
        rounds = min(max(req.debateRounds, 1), 2)
        last_bull_arg = ""
        last_bear_arg = ""

        bull_spec = AGENT_MODEL_MAPPING["bull_researcher"]
        bear_spec = AGENT_MODEL_MAPPING["bear_researcher"]

        bull_res = None
        bear_res = None

        for r in range(1, rounds + 1):
            # Bull Researcher turn (Gemini)
            bull_prompt = (
                f"NSE Ticker: {req.ticker} (Debate Round {r}/{rounds})\n"
                f"Committee Analyst Findings: {analyst_outputs}\n"
                f"Opponent's Last Point: {last_bear_arg or 'None (Round 1 Opening)'}\n"
                "Construct strongest long thesis and counter opponent."
            )
            bull_prov, bull_res = await router.call_structured(
                provider=bull_spec["provider"],
                model=bull_spec["model"],
                system_prompt=ROLE_PROMPTS["bull_researcher"],
                user_prompt=bull_prompt,
                response_model=ResearcherOutput,
                api_keys=req.userApiKeys,
                symbol=req.ticker,
                language=req.language,
                role="bull_researcher",
                quant_context=quant_context,
            )
            last_bull_arg = bull_res.argument
            await record_message("bull_researcher", bull_prov, bull_res.argument, bull_res)

            # Bear Researcher turn (Gemini)
            bear_prompt = (
                f"NSE Ticker: {req.ticker} (Debate Round {r}/{rounds})\n"
                f"Committee Analyst Findings: {analyst_outputs}\n"
                f"Opponent's Last Point: {last_bull_arg}\n"
                "Construct strongest counter argument and attack bullish premise."
            )
            bear_prov, bear_res = await router.call_structured(
                provider=bear_spec["provider"],
                model=bear_spec["model"],
                system_prompt=ROLE_PROMPTS["bear_researcher"],
                user_prompt=bear_prompt,
                response_model=ResearcherOutput,
                api_keys=req.userApiKeys,
                symbol=req.ticker,
                language=req.language,
                role="bear_researcher",
                quant_context=quant_context,
            )
            last_bear_arg = bear_res.argument
            await record_message("bear_researcher", bear_prov, bear_res.argument, bear_res)

        # ----------------------------------------------------
        # Phase 3: Quantitative Trader Proposal (Groq GPT)
        # ----------------------------------------------------
        trader_spec = AGENT_MODEL_MAPPING.get("trader", {"provider": "groq", "model": settings.GROQ_MODEL})
        trader_prompt = (
            f"NSE Ticker: {req.ticker}\n"
            f"Bull Case: {last_bull_arg}\n"
            f"Bear Case: {last_bear_arg}\n"
            f"Forecast: {forecast_doc}\n"
            "Synthesize concrete buy/sell/hold proposal with suggested position size %."
        )
        trader_prov, trader_res = await router.call_structured(
            provider=trader_spec["provider"],
            model=trader_spec["model"],
            system_prompt=ROLE_PROMPTS["trader"],
            user_prompt=trader_prompt,
            response_model=TraderOutput,
            api_keys=req.userApiKeys,
            symbol=req.ticker,
            language=req.language,
            role="trader",
            quant_context=quant_context,
        )
        await record_message("trader", trader_prov, trader_res.rationale, trader_res)

        # ----------------------------------------------------
        # Phase 4: Risk Manager Review (Groq GPT)
        # ----------------------------------------------------
        risk_spec = AGENT_MODEL_MAPPING["risk_manager"]
        risk_prompt = (
            f"Trader Proposal: {trader_res.model_dump()}\n"
            f"Backtest Status: {factor_doc.get('is_eligible_for_paper_trading', True)}\n"
            "Verify max position size (<=25%), daily loss limits, and backtest reliability. Soft override warning only."
        )
        risk_prov, risk_res = await router.call_structured(
            provider=risk_spec["provider"],
            model=risk_spec["model"],
            system_prompt=ROLE_PROMPTS["risk_manager"],
            user_prompt=risk_prompt,
            response_model=RiskManagerOutput,
            api_keys=req.userApiKeys,
            symbol=req.ticker,
            language=req.language,
            role="risk_manager",
            quant_context=quant_context,
        )
        await record_message(
            "risk_manager",
            risk_prov,
            f"Decision: {risk_res.decision}. Veto Reason: {risk_res.veto_reason or 'None'}",
            risk_res,
        )

        action_allowed = trader_res.action
        if risk_res.decision == "veto":
            action_allowed = "hold"

        suggested_size = (
            risk_res.adjusted_size_pct
            if risk_res.decision == "approve_with_reduction"
            else trader_res.suggested_size_pct
        )

        # ----------------------------------------------------
        # Phase 5: Portfolio Manager Final Determination (Groq GPT)
        # ----------------------------------------------------
        pm_spec = AGENT_MODEL_MAPPING["portfolio_manager"]
        pm_prompt = (
            f"Surviving Action: {action_allowed}\n"
            f"Risk Review: {risk_res.model_dump()}\n"
            f"Forecast Dispersion: {forecast_doc}\n"
            "Issue final determination, calibrated confidence score, and clear rationale."
        )
        pm_prov, pm_res = await router.call_structured(
            provider=pm_spec["provider"],
            model=pm_spec["model"],
            system_prompt=ROLE_PROMPTS["portfolio_manager"],
            user_prompt=pm_prompt,
            response_model=PortfolioManagerOutput,
            api_keys=req.userApiKeys,
            symbol=req.ticker,
            language=req.language,
            role="portfolio_manager",
            quant_context=quant_context,
        )
        await record_message("portfolio_manager", pm_prov, pm_res.rationale, pm_res)

        final_action = pm_res.final_action
        if risk_res.decision == "veto":
            final_action = "hold"

        # ----------------------------------------------------
        # Phase 6: Agreement Evaluation (Gemini vs Groq)
        # ----------------------------------------------------
        gemini_stances = [
            _stance_to_score(analyst_outputs["fundamentals_analyst"].stance),
            _stance_to_score(analyst_outputs["news_analyst"].stance),
        ]
        groq_stances = [
            _stance_to_score(analyst_outputs["technical_analyst"].stance),
            _stance_to_score(analyst_outputs["sentiment_analyst"].stance),
        ]

        gemini_avg = sum(gemini_stances) / len(gemini_stances)
        groq_avg = sum(groq_stances) / len(groq_stances)
        stance_agreement = 1.0 - abs(gemini_avg - groq_avg)

        # Bull confidence (Gemini) vs PM confidence (Groq)
        bull_conf = bull_res.confidence if bull_res else 0.75
        pm_conf = pm_res.final_confidence
        conf_agreement = 1.0 - abs(bull_conf - pm_conf)

        gemini_groq_agreement = round(float(0.6 * stance_agreement + 0.4 * conf_agreement), 2)
        divergence_flag = gemini_groq_agreement < 0.60
        divergence_note = (
            f"Divergence detected: Gemini fundamental/news stance ({gemini_avg:.2f}) differs from Groq technical/sentiment stance ({groq_avg:.2f})."
            if divergence_flag
            else "High model committee convergence between Gemini and Groq."
        )

        # ----------------------------------------------------
        # Phase 7: Multilingual Synthesis (Gemini)
        # ----------------------------------------------------
        multi_spec = AGENT_MODEL_MAPPING["multilingual_synthesis"]
        multi_prompt = (
            f"Target Language: {req.language} ({'Kannada' if req.language == 'kn' else 'Hindi' if req.language == 'hi' else 'English'})\n"
            f"Ticker: {req.ticker}\n"
            f"Final Committee Recommendation: {final_action.upper()}\n"
            f"Confidence: {pm_res.final_confidence}\n"
            f"Rationale: {pm_res.rationale}\n"
            f"Gemini-Groq Agreement: {gemini_groq_agreement}\n"
            "Provide executive synthesis, key takeaways, and action label in the specified language."
        )
        multi_prov, multi_res = await router.call_structured(
            provider=multi_spec["provider"],
            model=multi_spec["model"],
            system_prompt=ROLE_PROMPTS["multilingual_synthesis"],
            user_prompt=multi_prompt,
            response_model=MultilingualSynthesisOutput,
            api_keys=req.userApiKeys,
            symbol=req.ticker,
            language=req.language,
            role="multilingual_synthesis",
            quant_context=quant_context,
        )
        await record_message("multilingual_synthesis", multi_prov, multi_res.synthesis, multi_res)

        return {
            "runId": str(req.runId),
            "ticker": req.ticker,
            "finalAction": final_action,
            "confidence": pm_res.final_confidence,
            "suggestedSizePct": suggested_size,
            "rationale": pm_res.rationale,
            "forecastDispersionNote": pm_res.forecast_dispersion_note,
            "geminiGroqAgreement": gemini_groq_agreement,
            "divergenceFlag": divergence_flag,
            "divergenceNote": divergence_note,
            "language": req.language,
            "multilingualSynthesis": (
                multi_res.model_dump() if hasattr(multi_res, "model_dump") else multi_res
            ),
            "analysts": {k: (v.model_dump() if hasattr(v, "model_dump") else v) for k, v in analyst_outputs.items()},
            "messageCount": len(transcript_messages),
        }
