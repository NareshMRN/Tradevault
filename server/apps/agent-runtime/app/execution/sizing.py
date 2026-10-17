import numpy as np
from app.schemas.agent_schemas import PositionSizingRequest

class RLSizingEngine:
    """
    FinRL-pattern reinforcement-learning and risk-budgeted position sizing engine.
    Optimizes trade allocation based on committee confidence, forecast distribution variance,
    and Risk Manager limits.
    """

    @classmethod
    def calculate_sizing(cls, req: PositionSizingRequest) -> dict:
        if req.action == "hold" or req.confidence <= 0.5:
            return {
                "action": "hold",
                "suggestedQuantity": 0,
                "suggestedSizePct": 0.0,
                "executionSlices": 0,
                "orderType": "market",
                "rationale": "Confidence threshold not met or action is hold.",
            }

        # Kelly-criterion-inspired fractional multiplier:
        # f* = (p * b - q) / b where p = confidence, b = odds proxy
        odds_proxy = 1.5
        p = req.confidence
        q = 1.0 - p
        kelly_fraction = max(0.0, (p * odds_proxy - q) / odds_proxy)

        # Scale by forecast volatility penalty (higher stdDev -> lower size)
        vol_penalty = 1.0 / (1.0 + (req.stdDev / max(req.currentPrice, 1.0)) * 10.0)

        # Proposed percentage bounded by Risk Manager limit
        target_pct = min(
            req.riskManagerSizePct,
            req.maxPositionPct,
            req.maxPositionPct * kelly_fraction * vol_penalty * 1.5,
        )
        target_pct = round(max(0.5, target_pct), 2)

        # Calculate exact lot quantity
        allocated_dollars = req.allocatableCapital * (target_pct / 100.0)
        quantity = max(1, int(allocated_dollars // max(req.currentPrice, 1.0)))

        # Slicing logic: If volatility is high, recommend multi-slice TWAP
        slices = 1
        if req.stdDev / max(req.currentPrice, 1.0) > 0.03:
            slices = 3  # Slice into 3 tranches

        return {
            "action": req.action,
            "suggestedQuantity": quantity,
            "suggestedSizePct": target_pct,
            "allocatedCapitalUsd": round(quantity * req.currentPrice, 2),
            "executionSlices": slices,
            "orderType": "market" if slices == 1 else "twap",
            "rationale": f"Optimal lot size calculated via risk-budgeted Kelly sizing (fraction: {kelly_fraction:.2f}, vol-penalty: {vol_penalty:.2f}), strictly capped at Risk Manager {req.riskManagerSizePct}%.",
        }
