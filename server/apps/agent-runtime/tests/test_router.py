import pytest
from app.llm.router import LLMProviderRouter
from app.schemas.agent_schemas import TraderOutput

@pytest.mark.asyncio
async def test_llm_router_simulation_fallback():
    router = LLMProviderRouter()

    # Call with unconfigured provider in test mode
    provider, result = await router.call_structured(
        provider="groq",
        model="deepseek-r1-distill-llama-70b",
        system_prompt="Test system prompt",
        user_prompt="Analyze ticker AAPL",
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
