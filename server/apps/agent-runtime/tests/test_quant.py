import pytest
import numpy as np
import pandas as pd
from app.quant.factors import QuantFactorEngine
from app.quant.backtest import OverfittingValidationEngine
from app.execution.sizing import RLSizingEngine
from app.schemas.agent_schemas import PositionSizingRequest

def test_factor_computation_bounds():
    # Generate dummy OHLCV dataframe
    days = 100
    prices = 100.0 * np.cumprod(1 + np.random.normal(0.001, 0.02, days))
    df = pd.DataFrame(
        {
            "Open": prices * 0.99,
            "High": prices * 1.02,
            "Low": prices * 0.98,
            "Close": prices,
            "Volume": [1000000] * days,
        }
    )

    factors = QuantFactorEngine.compute_factors(df)

    assert "momentumScore" in factors
    assert "volatilityScore" in factors
    assert "meanReversionScore" in factors
    assert "valueProxyScore" in factors
    assert "technicalScore" in factors
    assert "compositeScore" in factors

    # All scores must be normalized between -1.0 and 1.0
    for key, val in factors.items():
        assert -1.0 <= val <= 1.0, f"Factor {key} out of bounds: {val}"

def test_deflated_sharpe_and_pbo():
    returns = np.random.normal(0.001, 0.015, 252)
    observed_sr = float(np.mean(returns) / np.std(returns) * np.sqrt(252))

    dsr = OverfittingValidationEngine.compute_deflated_sharpe_ratio(observed_sr, returns)
    pbo = OverfittingValidationEngine.compute_pbo(returns)

    assert 0.0 <= dsr <= 1.0, f"DSR out of [0, 1]: {dsr}"
    assert 0.0 <= pbo <= 1.0, f"PBO out of [0, 1]: {pbo}"

def test_rl_sizing_bounded_by_risk_manager():
    req = PositionSizingRequest(
        ticker="AAPL",
        action="buy",
        confidence=0.85,
        currentPrice=150.0,
        allocatableCapital=50000.0,
        maxPositionPct=15.0,
        stdDev=4.5,
        riskManagerSizePct=8.0,  # Risk Manager restricts to 8%
    )

    result = RLSizingEngine.calculate_sizing(req)

    assert result["action"] == "buy"
    assert result["suggestedSizePct"] <= 8.0, "RL sizing exceeded Risk Manager cap!"
    assert result["suggestedQuantity"] > 0
