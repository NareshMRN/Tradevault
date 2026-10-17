import { HistoricalAnalysisResult } from "./historicalAnalysis";

export interface RiskMetricsObject {
  beta: number;
  volatility: number;
  var95: number; // 1-day 95% Value at Risk in %
  cvar95: number; // Conditional VaR / Expected Shortfall in %
  downsideDeviation: number;
  sharpeRatio: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  maxDrawdown: number;
}


export class RiskMetricsEngine {
  /**
   * Computes risk metrics from historical analysis and returns.
   */
  public static calculate(hist: HistoricalAnalysisResult, symbol: string): RiskMetricsObject {
    const dailyReturns = hist.daily_returns || [];
    const vol = hist.volatility;
    const maxDrawdown = hist.max_drawdown;

    // Beta proxy (broad benchmark has beta = 1.0, high-growth/tech > 1.15, defensives < 0.9)
    let beta = 1.05;
    if (symbol.includes("NIFTY") || symbol.includes("SENSEX")) beta = 1.0;
    else if (["TCS", "INFY", "WIPRO"].includes(symbol)) beta = 0.92;
    else if (["RELIANCE", "HDFCBANK", "ICICIBANK"].includes(symbol)) beta = 1.08;
    else if (vol > 28) beta = 1.35;
    else if (vol < 16) beta = 0.82;

    // 1-Day 95% Parametric VaR = 1.645 * daily_std
    const dailyStd = vol / Math.sqrt(252);
    const var95 = Number((1.645 * dailyStd).toFixed(2));
    const cvar95 = Number((2.06 * dailyStd).toFixed(2));

    // Downside deviation from negative daily returns
    const negativeReturns = dailyReturns.filter((r) => r < 0);
    let downsideDev = dailyStd * 0.75;
    if (negativeReturns.length > 2) {
      const sumSq = negativeReturns.reduce((sum, r) => sum + r * r, 0);
      downsideDev = Math.sqrt(sumSq / negativeReturns.length) * Math.sqrt(252) * 100;
    }

    // Annualized Sharpe Ratio = (Annual Return - Risk Free Rate (6.5% INR)) / Volatility
    const annualReturn = hist.returns["1y"];
    const riskFreeRate = 6.5;
    const sharpe = vol > 0 ? Number(((annualReturn - riskFreeRate) / vol).toFixed(2)) : 0.8;

    let riskLevel: "low" | "medium" | "high" | "critical" = "medium";
    if (vol > 35 || maxDrawdown > 25) riskLevel = "high";
    else if (vol > 45 || maxDrawdown > 35) riskLevel = "critical";
    else if (vol < 18 && maxDrawdown < 12) riskLevel = "low";

    return {
      beta: Number(beta.toFixed(2)),
      volatility: vol,
      var95,
      cvar95,
      downsideDeviation: Number(downsideDev.toFixed(2)),
      sharpeRatio: sharpe,
      riskLevel,
      maxDrawdown,
    };
  }
}

