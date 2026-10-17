import pytest
import pyotp
import pandas as pd
from app.market.groww_client import GrowwAuthManager, GrowwMarketClient, groww_client
from app.config import AGENT_MODEL_MAPPING, settings


def test_groww_auth_manager_initialization():
    auth = GrowwAuthManager(
        api_key="test_groww_key",
        api_secret="test_secret",
        totp_secret="JBSWY3DPEHPK3PXP",
    )
    assert auth.api_key == "test_groww_key"
    assert auth.totp_secret == "JBSWY3DPEHPK3PXP"
    assert auth.is_configured() is True


def test_groww_symbol_normalization():
    client = GrowwMarketClient()

    ex, sym, name = client.normalize_symbol("RELIANCE.NS")
    assert ex == "NSE"
    assert sym == "RELIANCE"

    ex, sym, name = client.normalize_symbol("TCS.BO")
    assert ex == "BSE"
    assert sym == "TCS"

    ex, sym, name = client.normalize_symbol("NIFTY")
    assert ex == "NSE"
    assert sym == "NIFTY"
    assert "NIFTY 50" in name

    ex, sym, name = client.normalize_symbol("SENSEX")
    assert ex == "BSE"
    assert sym == "SENSEX"
    assert "BSE SENSEX" in name


def test_groww_get_ltp():
    client = GrowwMarketClient()
    nifty_ltp = client.get_ltp("NIFTY")
    assert isinstance(nifty_ltp, float)
    assert nifty_ltp > 10000.0  # NIFTY is around 24,000 - 26,000

    sensex_ltp = client.get_ltp("SENSEX")
    assert isinstance(sensex_ltp, float)
    assert sensex_ltp > 50000.0  # SENSEX is around 80,000+

    reliance_ltp = client.get_ltp("RELIANCE")
    assert isinstance(reliance_ltp, float)
    assert reliance_ltp > 100.0


def test_groww_get_quote_structure():
    client = GrowwMarketClient()
    quote = client.get_quote("NIFTY")

    assert quote["tradingSymbol"] == "NIFTY"
    assert quote["exchange"] == "NSE"
    assert quote["currency"] == "INR"
    assert quote["price"] > 0
    assert "marketDepth" in quote
    assert "asOf" in quote
    assert "change" in quote
    assert "changePct" in quote


def test_groww_get_benchmark_indices():
    client = GrowwMarketClient()
    indices = client.get_benchmark_indices()

    assert "nifty" in indices
    assert "sensex" in indices
    assert indices["nifty"]["currency"] == "INR"
    assert indices["sensex"]["currency"] == "INR"
    assert indices["nifty"]["price"] > 10000
    assert indices["sensex"]["price"] > 50000


def test_groww_get_candles_dataframe():
    client = GrowwMarketClient()
    df = client.get_candles("RELIANCE", days=30)

    assert isinstance(df, pd.DataFrame)
    assert len(df) >= 20
    for col in ["Open", "High", "Low", "Close", "Volume"]:
        assert col in df.columns
    assert (df["High"] >= df["Low"]).all()


def test_master_agent_model_mapping():
    """
    Verifies that all roles in the Master Role Assignment Table are accurately configured.
    """
    assert AGENT_MODEL_MAPPING["fundamentals_analyst"] == {
        "provider": "gemini",
        "model": "gemini-2.0-flash",
    }
    assert AGENT_MODEL_MAPPING["sentiment_analyst"] == {
        "provider": "gemini",
        "model": "gemini-2.0-flash",
    }
    assert AGENT_MODEL_MAPPING["technical_analyst"] == {
        "provider": "groq",
        "model": "llama-3.3-70b-versatile",
    }
    assert AGENT_MODEL_MAPPING["macro_analyst"] == {
        "provider": "nvidia",
        "model": "meta/llama-3.3-70b-instruct",
    }
    assert AGENT_MODEL_MAPPING["news_analyst"] == {
        "provider": "mistral",
        "model": "mistral-large-latest",
    }
    assert AGENT_MODEL_MAPPING["bull_researcher"] == {
        "provider": "groq",
        "model": "llama-3.3-70b-versatile",
    }
    assert AGENT_MODEL_MAPPING["bear_researcher"] == {
        "provider": "groq",
        "model": "llama-3.3-70b-versatile",
    }
    assert AGENT_MODEL_MAPPING["trader"] == {
        "provider": "agent_router",
        "model": "deepseek-v4-flash",
    }
    assert AGENT_MODEL_MAPPING["risk_manager"] == {
        "provider": "agent_router",
        "model": "claude-opus-4.8",
    }
    assert AGENT_MODEL_MAPPING["portfolio_manager"] == {
        "provider": "agent_router",
        "model": "gpt-6-astra",
    }
    assert AGENT_MODEL_MAPPING["fallback_provider"] == "openrouter"
