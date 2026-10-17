import secrets
from typing import Optional
from fastapi import FastAPI, Header, HTTPException, Depends, Query
from app.config import settings
from app.schemas.agent_schemas import (
    AnalysisRunRequest,
    FactorComputeRequest,
    ProbabilisticForecastRequest,
    BacktestRequest,
    PositionSizingRequest,
)
from app.agents.graph import MultiAgentDebateGraph
from app.quant.factors import QuantFactorEngine
from app.forecasting.probabilistic import ProbabilisticForecastingEngine
from app.quant.backtest import OverfittingValidationEngine
from app.execution.sizing import RLSizingEngine
from app.market.groww_client import groww_client
from app.data.router import market_router
from app.scanner.engine import scanner_engine

app = FastAPI(
    title="TradeVault Indian Market Agent Runtime",
    version="2.0.0",
    description="Python microservice for Multi-Agent Debate, Quant Factor Mining, Angel One & Indian Market Feeds",
)

def verify_internal_secret(x_internal_secret: str = Header(None)):
    """Constant-time comparison for internal secret security on public hosts like Render."""
    expected = settings.AGENT_RUNTIME_INTERNAL_SECRET
    if not x_internal_secret or not secrets.compare_digest(x_internal_secret, expected):
        raise HTTPException(status_code=403, detail="Forbidden: Invalid internal secret")

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "tradevault-agent-runtime",
        "market": "NSE",
        "models": {
            "gemini_primary": settings.GEMINI_MODEL,
            "groq_reasoning": settings.GROQ_MODEL,
            "fallback": settings.OPENROUTER_API_KEY and "openrouter" or "deterministic_calibrated",
        },
        "data_providers": {
            "angel_one_configured": market_router.angel.is_configured(),
            "groww_configured": market_router.groww.is_configured(),
            "sample_available": True,
            "sample_universe_size": len(await market_router.get_universe()),
        },
    }

@app.post("/internal/analysis/run", dependencies=[Depends(verify_internal_secret)])
async def run_analysis(req: AnalysisRunRequest):
    try:
        result = await MultiAgentDebateGraph.run(req)
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@app.post("/internal/quant/compute-factors", dependencies=[Depends(verify_internal_secret)])
async def compute_factors(req: FactorComputeRequest):
    try:
        result = await QuantFactorEngine.compute_and_save(req.ticker)
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@app.post("/internal/forecasting/predict", dependencies=[Depends(verify_internal_secret)])
async def predict_forecast(req: ProbabilisticForecastRequest):
    try:
        result = await ProbabilisticForecastingEngine.forecast(req.ticker, req.horizon)
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@app.post("/internal/quant/backtest", dependencies=[Depends(verify_internal_secret)])
async def run_backtest(req: BacktestRequest):
    try:
        result = await OverfittingValidationEngine.run_validation(
            strategy_name=req.strategyName,
            ticker_universe=req.tickerUniverse,
            start_date=req.startDate,
            end_date=req.endDate,
        )
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@app.post("/internal/execution/size", dependencies=[Depends(verify_internal_secret)])
async def calculate_size(req: PositionSizingRequest):
    try:
        result = RLSizingEngine.calculate_sizing(req)
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

# ==============================================================================
# Unified Indian Market Data Endpoints
# ==============================================================================

@app.get("/internal/market/quote/{ticker}", dependencies=[Depends(verify_internal_secret)])
async def get_market_quote(ticker: str):
    """
    Fetches real-time market quote using unified multi-tier provider:
    Angel One SmartAPI -> Groww API -> Cache -> Sample Provider.
    Includes `data_source: 'live' | 'cache' | 'sample'`.
    """
    try:
        quote = await market_router.get_quote(ticker)
        return quote
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@app.get("/internal/market/history/{ticker}", dependencies=[Depends(verify_internal_secret)])
async def get_market_history(ticker: str, days: int = Query(252, ge=5, le=1000)):
    """
    Fetches daily historical OHLCV candle series.
    """
    try:
        df = await market_router.get_history(ticker, days=days)
        records = []
        for dt, row in df.iterrows():
            records.append({
                "date": dt.strftime("%Y-%m-%d") if hasattr(dt, "strftime") else str(dt),
                "open": round(float(row["Open"]), 2),
                "high": round(float(row["High"]), 2),
                "low": round(float(row["Low"]), 2),
                "close": round(float(row["Close"]), 2),
                "volume": int(row["Volume"]),
            })
        return {
            "symbol": ticker.upper(),
            "candles": records,
            "data_source": getattr(df, "attrs", {}).get("data_source", "sample"),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@app.get("/internal/market/universe", dependencies=[Depends(verify_internal_secret)])
async def get_market_universe():
    """
    Returns full universe of 55+ Indian Nifty stocks with sector mappings.
    """
    try:
        universe = await market_router.get_universe()
        return universe
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@app.get("/internal/market/sectors", dependencies=[Depends(verify_internal_secret)])
async def get_market_sectors():
    """
    Returns list of distinct Indian market sectors.
    """
    try:
        sectors = await market_router.get_sectors()
        return sectors
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@app.get("/internal/market/indices", dependencies=[Depends(verify_internal_secret)])
async def get_market_indices():
    """
    Fetches live benchmark index quotes for NIFTY 50 and SENSEX.
    """
    try:
        indices = groww_client.get_benchmark_indices()
        return indices
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

# ==============================================================================
# Discovery Scanner Endpoints (NSE Sectors & Top Picks)
# ==============================================================================

@app.post("/internal/scanner/run", dependencies=[Depends(verify_internal_secret)])
async def run_discovery_scan(risk: str = Query("balanced", pattern="^(conservative|balanced|aggressive|low|medium|high)$")):
    """
    Executes a complete quant discovery scan across all Indian sectors & stocks.
    Generates multi-agent debate synthesis on the top 5 picks and caches results.
    """
    try:
        result = await scanner_engine.run_full_scan(risk_profile=risk)
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@app.get("/internal/scanner/sectors", dependencies=[Depends(verify_internal_secret)])
async def get_scanner_sectors():
    """
    Returns latest sector momentum scores and ranking (normalized in [-1.0, 1.0]).
    """
    try:
        cached = scanner_engine.get_cached_scan()
        if cached and "sectors" in cached:
            return cached["sectors"]
        sectors = await scanner_engine.sector_scores()
        return sectors
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@app.get("/internal/scanner/picks", dependencies=[Depends(verify_internal_secret)])
async def get_scanner_picks(
    risk: str = Query("balanced", pattern="^(conservative|balanced|aggressive|low|medium|high)$"),
    sector: str = Query(None),
    limit: int = Query(10, ge=1, le=50),
):
    """
    Returns ranked stock picks tailored to specified risk profile and optional sector filter.
    Includes top 5 debate summaries when applicable.
    """
    try:
        picks = await scanner_engine.top_stocks(sector=sector, risk_profile=risk, limit=limit)
        # Attach debate summaries if matches top picks
        cached = scanner_engine.get_cached_scan()
        if cached and "topPicks" in cached:
            top_dict = {p["symbol"]: p.get("debateSummary") for p in cached["topPicks"]}
            for p in picks:
                if p["symbol"] in top_dict and top_dict[p["symbol"]]:
                    p["debateSummary"] = top_dict[p["symbol"]]
        return picks
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@app.get("/internal/scanner/latest", dependencies=[Depends(verify_internal_secret)])
async def get_scanner_latest():
    """
    Returns the most recent complete scan result.
    """
    try:
        cached = scanner_engine.get_cached_scan()
        if not cached:
            cached = await scanner_engine.run_full_scan(risk_profile="balanced")
        return cached
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ==============================================================================
# ML Stock Screening Pipeline Endpoints (Trained LightGBM Outperformance Model)
# ==============================================================================

@app.post("/internal/ml/run", dependencies=[Depends(verify_internal_secret)])
async def run_ml_screening(demo_state: Optional[str] = Query(None)):
    """
    Recomputes today's ML stock screening picks using trained model, saves to cache and returns.
    Blocked when market state is WEEKEND, HOLIDAY, OVERNIGHT, PRE_OPEN or before 09:20 IST.
    """
    try:
        from app.market.status import get_market_status, IST_TZ
        from app.ml.predict import todays_picks, get_latest_picks
        import datetime

        status = get_market_status(demo_state=demo_state)
        now_ist = datetime.datetime.now(IST_TZ)

        is_allowed = False
        blocked_reason = None

        if status.get("is_demo"):
            is_allowed = (status["state"] == "OPEN")
            if not is_allowed:
                blocked_reason = f"Market is simulated {status['state']}. Screening can only execute when market is OPEN."
        else:
            if status["state"] in ("WEEKEND", "HOLIDAY", "OVERNIGHT", "PRE_OPEN"):
                blocked_reason = f"Market is currently {status['state']}. Screening is blocked when market is closed or in pre-open."
            elif status["state"] == "AFTER_CLOSE":
                blocked_reason = "Market closed for today at 3:30 PM IST. Showing final session picks."
            elif status["state"] == "OPEN":
                # Check >= 09:20 IST
                if now_ist.time() < datetime.time(9, 20):
                    blocked_reason = "Fresh screening runs only after 09:20 AM IST to allow opening price discovery."
                else:
                    is_allowed = True
            else:
                blocked_reason = f"Market is currently {status['state']}."

        if not is_allowed:
            latest = get_latest_picks(demo_state=demo_state)
            return {
                "status": "BLOCKED_MARKET_CLOSED",
                "message": blocked_reason or "Market is closed. Showing latest saved picks.",
                "market_status": status,
                **latest,
            }

        result = todays_picks(force_recompute=True, demo_state=demo_state)
        return {
            "status": "OK",
            "message": "Fresh screening completed successfully.",
            **result,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"ML screening run failed: {str(exc)}")


@app.get("/internal/ml/picks", dependencies=[Depends(verify_internal_secret)])
async def get_ml_picks(demo_state: Optional[str] = Query(None)):
    """
    Returns latest saved ML picks (+ generated_at, data_source, threshold, stale, for_session_date).
    Never returns an empty page when market is closed.
    """
    try:
        from app.ml.predict import get_latest_picks
        result = get_latest_picks(demo_state=demo_state)
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve ML picks: {str(exc)}")


@app.get("/internal/ml/metrics", dependencies=[Depends(verify_internal_secret)])
async def get_ml_metrics():
    """
    Returns metrics.json from honest time-series test set evaluation.
    """
    try:
        import json
        from app.ml.predict import METRICS_FILE
        if not METRICS_FILE.exists():
            from app.ml.train import train_and_evaluate
            metrics = train_and_evaluate()
            return metrics
        with open(METRICS_FILE, "r") as f:
            metrics = json.load(f)
        return metrics
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load ML metrics: {str(exc)}")


# ==============================================================================
# Market Hours Awareness Endpoints (Asia/Kolkata IST)
# ==============================================================================

@app.get("/internal/market/status", dependencies=[Depends(verify_internal_secret)])
async def get_market_status_endpoint(demo_state: Optional[str] = Query(None)):
    """
    Returns real-time NSE market hours status in Asia/Kolkata (IST).
    Supports optional demo_state override (OPEN, PRE_OPEN, AFTER_CLOSE, OVERNIGHT, WEEKEND, HOLIDAY, CLOSED).
    """
    try:
        from app.market.status import get_market_status
        return get_market_status(demo_state=demo_state)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Market status calculation failed: {str(exc)}")



