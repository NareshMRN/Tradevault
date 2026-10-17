from fastapi import FastAPI, Header, HTTPException, Depends
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

app = FastAPI(
    title="TradeVault Agent Runtime",
    version="1.0.0",
    description="Python microservice for Multi-Agent Debate, Quant Factor Mining, Probabilistic Forecasting & Backtest Validation",
)

def verify_internal_secret(x_internal_secret: str = Header(None)):
    if x_internal_secret != settings.AGENT_RUNTIME_INTERNAL_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden: Invalid internal secret")

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "tradevault-agent-runtime",
        "models": {
            "groq_reasoning": settings.GROQ_REASONING_MODEL,
            "gemini": settings.GEMINI_MODEL,
            "nvidia": settings.NVIDIA_MODEL,
            "mistral": settings.MISTRAL_MODEL,
            "trader": settings.AGENT_ROUTER_TRADER_MODEL,
            "risk_manager": settings.AGENT_ROUTER_RISK_MANAGER_MODEL,
            "portfolio_manager": settings.AGENT_ROUTER_PORTFOLIO_MANAGER_MODEL,
            "fallback": settings.OPENROUTER_MODEL,
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

@app.get("/internal/market/quote/{ticker}", dependencies=[Depends(verify_internal_secret)])
async def get_market_quote(ticker: str):
    """
    Fetches real-time market quote using Groww Trading API (growwapi).
    """
    try:
        quote = groww_client.get_quote(ticker)
        return quote
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@app.get("/internal/market/indices", dependencies=[Depends(verify_internal_secret)])
async def get_market_indices():
    """
    Fetches live benchmark index quotes for NIFTY 50 and SENSEX via Groww API.
    """
    try:
        indices = groww_client.get_benchmark_indices()
        return indices
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
