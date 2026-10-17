import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings
from app.scanner.engine import scanner_engine


@pytest.mark.asyncio
async def test_sector_scores_bounds_and_structure():
    """
    Verifies that sector scores aggregate correctly across Indian market sectors,
    remain bounded in [-1.0, 1.0], and include leading stocks.
    """
    sectors = await scanner_engine.sector_scores()
    assert isinstance(sectors, list)
    assert len(sectors) >= 5  # At least 5-10 sectors defined in nse_sectors.json

    for sec in sectors:
        assert "sector" in sec
        assert "score" in sec
        assert -1.0 <= sec["score"] <= 1.0
        assert sec["trend"] in ["bullish", "bearish", "neutral"]
        assert "changePct5d" in sec
        assert "changePct20d" in sec
        assert "changePct60d" in sec
        assert "volumeTrend" in sec
        assert "volatility" in sec
        assert sec["stockCount"] > 0
        assert isinstance(sec["topStocks"], list)
        assert len(sec["topStocks"]) > 0


@pytest.mark.asyncio
async def test_top_stocks_risk_profiles_and_filtering():
    """
    Verifies risk profile differentiation and sector filtering.
    """
    # Conservative profile
    conservative_picks = await scanner_engine.top_stocks(risk_profile="conservative", limit=5)
    assert len(conservative_picks) == 5
    for p in conservative_picks:
        assert p["riskTier"] == "conservative"
        assert p["score"] is not None
        assert p["price"] > 0
        assert len(p["signals"]) > 0
        assert "momentum20d" in p["quantMetrics"]
        assert "rsi14" in p["quantMetrics"]
        assert p["dataSource"] in ["live", "cache", "sample"]

    # Aggressive profile
    aggressive_picks = await scanner_engine.top_stocks(risk_profile="aggressive", limit=5)
    assert len(aggressive_picks) == 5
    for p in aggressive_picks:
        assert p["riskTier"] == "aggressive"

    # Sector filter
    banking_picks = await scanner_engine.top_stocks(sector="Banking", limit=5)
    assert len(banking_picks) > 0
    for p in banking_picks:
        assert "Banking" in p["sector"]


@pytest.mark.asyncio
async def test_run_full_scan_and_top5_debate_summary():
    """
    Verifies full scan execution and that multi-agent debate synthesis
    is strictly produced for top 5 picks.
    """
    result = await scanner_engine.run_full_scan(risk_profile="balanced")
    assert "scanId" in result
    assert "timestamp" in result
    assert result["benchmark"] == "NIFTY 50"
    assert len(result["sectors"]) >= 5
    assert len(result["picks"]) > 0
    assert len(result["topPicks"]) <= 5
    assert result["dataSource"] in ["live", "cache", "sample"]

    for top in result["topPicks"]:
        assert "debateSummary" in top
        ds = top["debateSummary"]
        assert ds["consensus"] in ["buy", "sell", "hold"]
        assert 0.5 <= ds["confidence"] <= 1.0
        assert len(ds["bullCase"]) > 20
        assert len(ds["bearCase"]) > 20
        assert len(ds["synthesis"]) > 20
        assert ds["llmSource"] in ["live", "cache", "fallback"]


def test_scanner_internal_endpoints_security_and_responses():
    """
    Verifies FastAPI internal scanner endpoints require constant-time secret
    and return valid JSON.
    """
    client = TestClient(app)

    # Missing header -> 403 Forbidden
    res_unauth = client.get("/internal/scanner/sectors")
    assert res_unauth.status_code == 403

    # Invalid header -> 403 Forbidden
    res_bad = client.get(
        "/internal/scanner/sectors",
        headers={"x-internal-secret": "wrong-secret-token"},
    )
    assert res_bad.status_code == 403

    # Authorized header
    headers = {"x-internal-secret": settings.AGENT_RUNTIME_INTERNAL_SECRET}

    res_sectors = client.get("/internal/scanner/sectors", headers=headers)
    assert res_sectors.status_code == 200
    sectors_data = res_sectors.json()
    assert isinstance(sectors_data, list)
    assert len(sectors_data) >= 5

    res_picks = client.get("/internal/scanner/picks?risk=conservative&limit=5", headers=headers)
    assert res_picks.status_code == 200
    picks_data = res_picks.json()
    assert isinstance(picks_data, list)
    assert len(picks_data) == 5

    res_run = client.post("/internal/scanner/run?risk=balanced", headers=headers)
    assert res_run.status_code == 200
    scan_data = res_run.json()
    assert "scanId" in scan_data
    assert "topPicks" in scan_data
