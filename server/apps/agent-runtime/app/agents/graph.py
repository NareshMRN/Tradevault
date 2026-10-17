import datetime
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
    AnalysisRunRequest,
)
from app.llm.router import router
from app.agents.prompts import ROLE_PROMPTS
from app.quant.factors import QuantFactorEngine
from app.forecasting.probabilistic import ProbabilisticForecastingEngine

class MultiAgentDebateGraph:
    """
    Orchestration graph implementing the 5-phase committee debate:
    1. Parallel Analysts (Fundamentals, Sentiment, News, Macro, Technical)
    2. Bull Researcher vs Bear Researcher Iterative Debate
    3. Trader Synthesis & Draft Proposal
    4. Risk Manager Veto & Limit Verification
    5. Portfolio Manager Final Sign-Off & Calibrated Confidence
    """

    @classmethod
    async def run(cls, req: AnalysisRunRequest) -> Dict[str, Any]:
        client = AsyncIOMotorClient(settings.MONGODB_URI)
        db = client.get_default_database()

        # Step 1: Ingest factors and forecast distribution
        factor_doc = await QuantFactorEngine.compute_and_save(req.ticker)
        forecast_doc = await ProbabilisticForecastingEngine.forecast(req.ticker, req.horizon)

        transcript_messages: List[Dict[str, Any]] = []
        sequence_index = 0

        async def record_message(role: str, provider: str, content: str, structured: Any):
            nonlocal sequence_index
            sequence_index += 1
            msg = {
                "runId": ObjectId(req.runId) if ObjectId.is_valid(req.runId) else req.runId,
                "agentRole": role,
                "llmProvider": provider,
                "sequenceIndex": sequence_index,
                "content": content,
                "structuredOutput": structured.model_dump() if hasattr(structured, "model_dump") else structured,
                "createdAt": datetime.datetime.utcnow(),
            }
            try:
                await db.agent_messages.insert_one(msg)
            except Exception as e:
                print(f"[Graph] Message save note: {e}")
            transcript_messages.append(msg)

        # ----------------------------------------------------
        # ----------------------------------------------------
        # Phase 1: Analyst Team
        # ----------------------------------------------------
        analyst_roles = [
            "fundamentals_analyst",
            "sentiment_analyst",
            "technical_analyst",
            "macro_analyst",
            "news_analyst",
        ]

        analyst_outputs: Dict[str, Any] = {}
        for role in analyst_roles:
            spec = AGENT_MODEL_MAPPING[role]
            provider = spec["provider"]
            model = spec["model"]

            user_prompt = (
                f"Ticker: {req.ticker}\n"
                f"Factor Scores: {factor_doc}\n"
                f"Forecast Distribution ({req.horizon}): {forecast_doc}\n"
                f"Analyze as {role}."
            )
            used_provider, result = await router.call_structured(
                provider=provider,
                model=model,
                system_prompt=ROLE_PROMPTS[role],
                user_prompt=user_prompt,
                response_model=AnalystOutput,
                api_keys=req.userApiKeys,
            )
            analyst_outputs[role] = result
            await record_message(role, used_provider, result.summary, result)

        # ----------------------------------------------------
        # Phase 2: Bull vs Bear Researcher Debate
        # ----------------------------------------------------
        rounds = min(max(req.debateRounds, 1), 3)
        last_bull_arg = ""
        last_bear_arg = ""

        bull_spec = AGENT_MODEL_MAPPING["bull_researcher"]
        bear_spec = AGENT_MODEL_MAPPING["bear_researcher"]

        for r in range(1, rounds + 1):
            # Bull Researcher turn (Groq Llama 3.3 70B)
            bull_prompt = (
                f"Ticker: {req.ticker} (Round {r}/{rounds})\n"
                f"Analyst Findings: {analyst_outputs}\n"
                f"Opponent's Last Point: {last_bear_arg or 'None (Round 1)'}\n"
                "Construct strongest long argument and counter opponent."
            )
            bull_prov, bull_res = await router.call_structured(
                provider=bull_spec["provider"],
                model=bull_spec["model"],
                system_prompt=ROLE_PROMPTS["bull_researcher"],
                user_prompt=bull_prompt,
                response_model=ResearcherOutput,
                api_keys=req.userApiKeys,
            )
            last_bull_arg = bull_res.argument
            await record_message("bull_researcher", bull_prov, bull_res.argument, bull_res)

            # Bear Researcher turn (Groq Llama 3.3 70B)
            bear_prompt = (
                f"Ticker: {req.ticker} (Round {r}/{rounds})\n"
                f"Analyst Findings: {analyst_outputs}\n"
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
            )
            last_bear_arg = bear_res.argument
            await record_message("bear_researcher", bear_prov, bear_res.argument, bear_res)

        # ----------------------------------------------------
        # Phase 3: Trader Synthesis (Agent Router: DeepSeek V4 Flash)
        # ----------------------------------------------------
        trader_spec = AGENT_MODEL_MAPPING["trader"]
        trader_prompt = (
            f"Ticker: {req.ticker}\n"
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
        )
        await record_message("trader", trader_prov, trader_res.rationale, trader_res)

        # ----------------------------------------------------
        # Phase 4: Risk Manager Review (Agent Router: Claude Opus 4.8)
        # ----------------------------------------------------
        risk_spec = AGENT_MODEL_MAPPING["risk_manager"]
        risk_prompt = (
            f"Trader Proposal: {trader_res.model_dump()}\n"
            "Verify max position size, max daily loss limits, and backtest status. Exercise veto if needed."
        )
        risk_prov, risk_res = await router.call_structured(
            provider=risk_spec["provider"],
            model=risk_spec["model"],
            system_prompt=ROLE_PROMPTS["risk_manager"],
            user_prompt=risk_prompt,
            response_model=RiskManagerOutput,
            api_keys=req.userApiKeys,
        )
        await record_message(
            "risk_manager",
            risk_prov,
            f"Decision: {risk_res.decision}. Veto Reason: {risk_res.veto_reason or 'None'}",
            risk_res,
        )

        # Determine if action survives veto
        action_allowed = trader_res.action
        if risk_res.decision == "veto":
            action_allowed = "hold"
        suggested_size = (
            risk_res.adjusted_size_pct
            if risk_res.decision == "approve_with_reduction"
            else trader_res.suggested_size_pct
        )

        # ----------------------------------------------------
        # Phase 5: Portfolio Manager Sign-Off (Agent Router: GPT 6 Astra)
        # ----------------------------------------------------
        pm_spec = AGENT_MODEL_MAPPING["portfolio_manager"]
        pm_prompt = (
            f"Surviving Action: {action_allowed}\n"
            f"Risk Review: {risk_res.model_dump()}\n"
            f"Forecast Dispersion (P10-P90): [{forecast_doc.get('p10')}, {forecast_doc.get('p90')}]\n"
            "Issue final decision, calibrated confidence score, and clear rationale."
        )
        pm_prov, pm_res = await router.call_structured(
            provider=pm_spec["provider"],
            model=pm_spec["model"],
            system_prompt=ROLE_PROMPTS["portfolio_manager"],
            user_prompt=pm_prompt,
            response_model=PortfolioManagerOutput,
            api_keys=req.userApiKeys,
        )
        await record_message("portfolio_manager", pm_prov, pm_res.rationale, pm_res)

        final_action = pm_res.final_action
        if risk_res.decision == "veto":
            final_action = "hold"

        return {
            "runId": req.runId,
            "ticker": req.ticker,
            "finalAction": final_action,
            "confidence": pm_res.final_confidence,
            "suggestedSizePct": suggested_size,
            "rationale": pm_res.rationale,
            "forecastDispersionNote": pm_res.forecast_dispersion_note,
            "messageCount": len(transcript_messages),
        }
