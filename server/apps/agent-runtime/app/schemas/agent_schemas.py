from typing import Literal, List, Optional, Dict, Any
from pydantic import BaseModel, Field

# ==========================================
# 1. Analyst Schema (Section 15.1)
# ==========================================
class AnalystOutput(BaseModel):
    role: Literal[
        "fundamentals_analyst",
        "sentiment_analyst",
        "news_analyst",
        "technical_analyst",
        "macro_analyst",
    ]
    summary: str = Field(..., max_length=1000)
    key_evidence: List[str] = Field(..., min_items=1, max_items=5)
    stance: Literal["bullish", "bearish", "neutral"]
    confidence: float = Field(..., ge=0.0, le=1.0)

# ==========================================
# 2. Researcher Debate Schema (Section 15.2)
# ==========================================
class ResearcherOutput(BaseModel):
    role: Literal["bull_researcher", "bear_researcher"]
    argument: str = Field(..., max_length=1200)
    rebuttal_to_opponent: str = Field(..., max_length=600)
    confidence: float = Field(..., ge=0.0, le=1.0)

# ==========================================
# 3. Trader Proposal Schema (Section 15.3)
# ==========================================
class TraderOutput(BaseModel):
    action: Literal["buy", "sell", "hold"]
    suggested_size_pct: float = Field(..., ge=0.0, le=25.0)
    rationale: str = Field(..., max_length=1200)
    confidence: float = Field(..., ge=0.0, le=1.0)

# ==========================================
# 4. Risk Manager Review Schema (Section 15.4)
# ==========================================
class RiskLimitsChecked(BaseModel):
    max_position_pct_ok: bool
    max_daily_loss_pct_ok: bool
    backtest_eligible: bool

class RiskManagerOutput(BaseModel):
    decision: Literal["approve", "approve_with_reduction", "veto"]
    adjusted_size_pct: float = Field(..., ge=0.0, le=25.0)
    veto_reason: Optional[str] = Field(None, max_length=600)
    limits_checked: RiskLimitsChecked

# ==========================================
# 5. Portfolio Manager Final Decision Schema (Section 15.5)
# ==========================================
class PortfolioManagerOutput(BaseModel):
    final_action: Literal["buy", "sell", "hold"]
    final_confidence: float = Field(..., ge=0.0, le=1.0)
    rationale: str = Field(..., max_length=1500)
    forecast_dispersion_note: str = Field(..., max_length=400)

# ==========================================
# API Request / Response Payloads
# ==========================================
class AnalysisRunRequest(BaseModel):
    runId: str
    userId: str
    ticker: str
    horizon: Literal["1d", "5d", "20d"] = "5d"
    minConfidence: float = 0.65
    debateRounds: int = 1
    requireUnanimousConvergence: bool = False
    userApiKeys: Optional[Dict[str, str]] = None

class FactorComputeRequest(BaseModel):
    ticker: str

class ProbabilisticForecastRequest(BaseModel):
    ticker: str
    horizon: Literal["1d", "5d", "20d"] = "5d"

class BacktestRequest(BaseModel):
    strategyName: str
    tickerUniverse: List[str]
    startDate: str
    endDate: str

class PositionSizingRequest(BaseModel):
    ticker: str
    action: Literal["buy", "sell", "hold"]
    confidence: float
    currentPrice: float
    allocatableCapital: float
    maxPositionPct: float
    stdDev: float
    riskManagerSizePct: float
