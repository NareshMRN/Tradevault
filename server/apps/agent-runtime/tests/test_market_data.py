import pytest
import pandas as pd
from app.data.sample_provider import SampleDataProvider
from app.data.angel_one import AngelOneProvider
from app.data.cache import CacheLayer
from app.data.router import MarketDataRouter

@pytest.mark.asyncio
async def test_sample_provider_universe_size():
    provider = SampleDataProvider()
    universe = await provider.get_universe()

    # Must contain at least 50 Indian Nifty stocks
    assert len(universe) >= 50, f"Expected at least 50 stocks, found {len(universe)}"

    symbols = [s["symbol"] for s in universe]
    assert "RELIANCE" in symbols
    assert "TCS" in symbols
    assert "HDFCBANK" in symbols
    assert "INFY" in symbols
    assert "BHARTIARTL" in symbols

    # Check sector diversity
    sectors = set(s.get("sector") for s in universe)
    assert len(sectors) >= 7, f"Expected diverse sectors, found: {sectors}"
    assert "Banking & Financial Services" in sectors
    assert "Information Technology" in sectors
    assert "Energy & Petrochemicals" in sectors

@pytest.mark.asyncio
async def test_sample_provider_history_candles():
    provider = SampleDataProvider()
    df = await provider.get_history("RELIANCE", days=252)

    assert isinstance(df, pd.DataFrame)
    assert len(df) >= 200, f"Expected ~252 candles, got {len(df)}"

    required_cols = ["Open", "High", "Low", "Close", "Volume"]
    for col in required_cols:
        assert col in df.columns

    # Verify candle math validity: High >= Low, High >= Open, High >= Close, Low <= Open, Low <= Close
    assert (df["High"] >= df["Low"]).all()
    assert (df["High"] >= df["Open"]).all()
    assert (df["High"] >= df["Close"]).all()
    assert (df["Low"] <= df["Open"]).all()
    assert (df["Low"] <= df["Close"]).all()
    assert (df["Volume"] > 0).all()

@pytest.mark.asyncio
async def test_sample_provider_quote():
    provider = SampleDataProvider()
    quote = await provider.get_quote("TCS")

    assert quote["symbol"] == "TCS"
    assert quote["company_name"] == "Tata Consultancy Services Ltd"
    assert quote["sector"] == "Information Technology"
    assert quote["ltp"] > 1000.0
    assert quote["data_source"] == "sample"
    assert "timestamp" in quote

@pytest.mark.asyncio
async def test_angel_one_unconfigured_handling():
    provider = AngelOneProvider()
    # In test environment, credentials are empty
    assert provider.is_configured() is False

    # Calling quote without config must raise RuntimeError to trigger graceful router fallback
    with pytest.raises(RuntimeError):
        await provider.get_quote("RELIANCE")

@pytest.mark.asyncio
async def test_cache_layer_ttl_and_source():
    cache = CacheLayer()
    cache.clear()

    # Verify cache miss
    miss = await cache.get_quote("INFY")
    assert miss is None

    # Set cache with short TTL
    test_quote = {
        "symbol": "INFY",
        "ltp": 1920.0,
        "company_name": "Infosys Ltd",
        "data_source": "live",
    }
    await cache.set_quote("INFY", test_quote, ttl_seconds=60)

    # Cache hit must return data with data_source='cache'
    hit = await cache.get_quote("INFY")
    assert hit is not None
    assert hit["symbol"] == "INFY"
    assert hit["ltp"] == 1920.0
    assert hit["data_source"] == "cache"

@pytest.mark.asyncio
async def test_market_data_router_fallback_and_metadata():
    router = MarketDataRouter()
    # Clear cache to test cold router fetch
    router.cache.clear()

    quote = await router.get_quote("SBIN")
    assert quote["symbol"] == "SBIN"
    assert quote["ltp"] > 0
    # Since Angel One is unconfigured in test env, router seamlessly falls back
    assert quote["data_source"] in ["live", "cache", "sample"]

    # Second call should be served from cache
    cached_quote = await router.get_quote("SBIN")
    assert cached_quote["data_source"] == "cache"

@pytest.mark.asyncio
async def test_market_router_sectors_and_filtering():
    router = MarketDataRouter()
    sectors = await router.get_sectors()
    assert len(sectors) >= 7

    it_stocks = await router.get_stocks_by_sector("Information Technology")
    assert len(it_stocks) >= 4
    it_symbols = [s["symbol"] for s in it_stocks]
    assert "TCS" in it_symbols
    assert "INFY" in it_symbols
