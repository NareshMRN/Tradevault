import pytest
from app.llm.router import LLMProviderRouter
from app.schemas.agent_schemas import (
    TraderOutput,
    MultilingualSynthesisOutput,
    AnalysisRunRequest,
)
from app.agents.graph import MultiAgentDebateGraph


@pytest.mark.asyncio
async def test_llm_router_simulation_fallback():
    router = LLMProviderRouter()

    # Call with unconfigured provider in test mode
    provider, result = await router.call_structured(
        provider="groq",
        model="openai/gpt-oss-120b",
        system_prompt="Test system prompt",
        user_prompt="Analyze NSE ticker RELIANCE",
        response_model=TraderOutput,
    )

    assert result is not None
    assert result.action in ["buy", "sell", "hold"]
    assert 0.0 <= result.suggested_size_pct <= 25.0
    assert 0.0 <= result.confidence <= 1.0


def test_circuit_breaker_mechanism():
    router = LLMProviderRouter()

    # Record 3 failures
    router._record_failure("groq")
    router._record_failure("groq")
    router._record_failure("groq")

    assert router._is_available("groq") is False, "Circuit breaker should have opened after 3 failures"

    # Success resets breaker
    router._record_success("groq")
    assert router._is_available("groq") is True, "Circuit breaker should reset after recorded success"


def test_bidirectional_fallback_chain_construction():
    router = LLMProviderRouter()

    # Groq primary -> Gemini secondary (no openrouter if unset)
    chain_groq = router._build_provider_chain("groq", {})
    assert chain_groq == ["groq", "gemini"]

    # Gemini primary -> Groq secondary
    chain_gemini = router._build_provider_chain("gemini", {})
    assert chain_gemini == ["gemini", "groq"]

    # With explicit OpenRouter key
    chain_with_openrouter = router._build_provider_chain("groq", {"openrouter": "sk-or-test-key"})
    assert chain_with_openrouter == ["groq", "gemini", "openrouter"]


@pytest.mark.asyncio
async def test_in_memory_llm_cache():
    router = LLMProviderRouter()

    # First call -> computes / simulates
    prov1, res1 = await router.call_structured(
        provider="gemini",
        model="gemini-2.5-flash",
        system_prompt="Analyze fundamentals",
        user_prompt="NSE: HDFCBANK balance sheet",
        response_model=TraderOutput,
        symbol="HDFCBANK",
        role="fundamentals_analyst",
        language="en",
    )
    assert prov1 == "simulation_fallback"

    # Second call with same parameters -> hits cache
    prov2, res2 = await router.call_structured(
        provider="gemini",
        model="gemini-2.5-flash",
        system_prompt="Analyze fundamentals",
        user_prompt="NSE: HDFCBANK balance sheet",
        response_model=TraderOutput,
        symbol="HDFCBANK",
        role="fundamentals_analyst",
        language="en",
    )
    assert prov2 == "gemini:cache"
    assert res2.action == res1.action


@pytest.mark.asyncio
async def test_multilingual_synthesis_outputs():
    router = LLMProviderRouter()

    # Kannada synthesis
    prov_kn, res_kn = await router.call_structured(
        provider="gemini",
        model="gemini-2.5-flash",
        system_prompt="Synthesize in Kannada",
        user_prompt="Final summary for RELIANCE",
        response_model=MultilingualSynthesisOutput,
        language="kn",
    )
    assert isinstance(res_kn, MultilingualSynthesisOutput)
    assert res_kn.language == "kn"
    assert "ಖರೀದಿಸಿ" in res_kn.action_label or "ಹೋಲ್ಡ್" in res_kn.action_label

    # Hindi synthesis
    prov_hi, res_hi = await router.call_structured(
        provider="gemini",
        model="gemini-2.5-flash",
        system_prompt="Synthesize in Hindi",
        user_prompt="Final summary for RELIANCE",
        response_model=MultilingualSynthesisOutput,
        language="hi",
    )
    assert isinstance(res_hi, MultilingualSynthesisOutput)
    assert res_hi.language == "hi"
    assert "खरीदें" in res_hi.action_label or "होल्ड" in res_hi.action_label


@pytest.mark.asyncio
async def test_multiagent_debate_graph_with_agreement_and_multilingual():
    req = AnalysisRunRequest(
        runId="test-run-101",
        userId="trader-user-1",
        ticker="TCS",
        horizon="5d",
        minConfidence=0.70,
        debateRounds=1,
        language="kn",
    )

    result = await MultiAgentDebateGraph.run(req)

    assert result["runId"] == "test-run-101"
    assert result["ticker"] == "TCS"
    assert result["finalAction"] in ["buy", "sell", "hold"]
    assert 0.0 <= result["confidence"] <= 1.0
    assert 0.0 <= result["suggestedSizePct"] <= 25.0
    assert 0.0 <= result["geminiGroqAgreement"] <= 1.0
    assert isinstance(result["divergenceFlag"], bool)
    assert result["language"] == "kn"
    assert "multilingualSynthesis" in result
    assert result["multilingualSynthesis"]["language"] == "kn"
    assert len(result["analysts"]) >= 4
