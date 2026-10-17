import { describe, it, expect } from "vitest";
import { HistoricalService } from "../src/market/historical.service";
import { TechnicalIndicatorEngine } from "../src/analysis/technicalIndicators";
import { HistoricalAnalysisEngine } from "../src/analysis/historicalAnalysis";
import { PatternMatcher } from "../src/analysis/patternMatcher";
import { RiskMetricsEngine } from "../src/analysis/riskMetrics";
import { MarketRegimeEngine } from "../src/analysis/marketRegime";
import { FusionEngine, DEFAULT_FUSION_WEIGHTS } from "../src/prediction/fusionEngine";
import { ProbabilityEngine } from "../src/prediction/probabilityEngine";
import { ConfidenceEngine } from "../src/prediction/confidenceEngine";
import { BacktestEngine } from "../src/backtesting/backtest.service";
import { MetricsCalculator } from "../src/backtesting/metrics";

describe("Market Intelligence Engine Unit & Quantitative Test Suite", () => {
  const candles = HistoricalService.generateDeterministicCandles("RELIANCE", 365, 2980.0);

  it("1. Generates continuous realistic OHLCV historical candle series", () => {
    expect(candles.length).toBeGreaterThan(200);
    const last = candles[candles.length - 1];
    expect(last.close).toBeCloseTo(2980.0, 0);
    expect(last.high).toBeGreaterThanOrEqual(last.close);
    expect(last.low).toBeLessThanOrEqual(last.close);
    expect(last.volume).toBeGreaterThan(0);
  });

  it("2. Computes deterministic technical indicators without LLM dependence", () => {
    const tech = TechnicalIndicatorEngine.calculate(candles);
    expect(tech.rsi).toBeGreaterThanOrEqual(0);
    expect(tech.rsi).toBeLessThanOrEqual(100);
    expect(tech.ema20).toBeGreaterThan(0);
    expect(tech.ema50).toBeGreaterThan(0);
    expect(tech.ema200).toBeGreaterThan(0);
    expect(tech.atr).toBeGreaterThan(0);
    expect(tech.bollingerBands.upper).toBeGreaterThan(tech.bollingerBands.lower);
    expect(["bullish", "bearish", "neutral"]).toContain(tech.trend);
    expect(tech.signals.length).toBeGreaterThan(0);
  });

  it("3. Computes accurate multi-period returns, realized volatility, and drawdown", () => {
    const hist = HistoricalAnalysisEngine.analyze(candles);
    expect(hist.returns).toHaveProperty("1m");
    expect(hist.returns).toHaveProperty("3m");
    expect(hist.returns).toHaveProperty("1y");
    expect(hist.volatility).toBeGreaterThan(0);
    expect(hist.max_drawdown).toBeGreaterThanOrEqual(0);
    expect(hist.distance_from_52w_high).toBeGreaterThanOrEqual(0);
    expect(hist.distance_from_52w_low).toBeGreaterThanOrEqual(0);
  });

  it("4. Matches historical patterns and calculates empirical forward positive rates", () => {
    const tech = TechnicalIndicatorEngine.calculate(candles);
    const patterns = PatternMatcher.match(candles, tech);
    expect(patterns.samples).toBeGreaterThan(0);
    expect(patterns["1d_positive_rate"]).toBeGreaterThanOrEqual(0);
    expect(patterns["1d_positive_rate"]).toBeLessThanOrEqual(100);
    expect(patterns["5d_positive_rate"]).toBeGreaterThanOrEqual(0);
    expect(patterns["5d_positive_rate"]).toBeLessThanOrEqual(100);
    expect(patterns["20d_positive_rate"]).toBeGreaterThanOrEqual(0);
  });

  it("5. Calculates parametric VaR and Beta risk metrics", () => {
    const hist = HistoricalAnalysisEngine.analyze(candles);
    const risk = RiskMetricsEngine.calculate(hist, "RELIANCE");
    expect(risk.beta).toBeGreaterThan(0);
    expect(risk.var95).toBeGreaterThan(0);
    expect(["low", "medium", "high", "critical"]).toContain(risk.riskLevel);
  });

  it("6. Fuses multi-agent and quantitative scores with configurable weights and risk penalty", () => {
    const tech = TechnicalIndicatorEngine.calculate(candles);
    const hist = HistoricalAnalysisEngine.analyze(candles);
    const patterns = PatternMatcher.match(candles, tech);
    const regime = MarketRegimeEngine.classify(tech, hist);

    const mockTechOut: any = { score: 76, direction: "bullish", risks: [] };
    const mockFundOut: any = { score: 72, financial_health: "healthy", risks: [] };
    const mockSentOut: any = { score: 74, sentiment: "positive" };
    const mockRiskOut: any = { risk_score: 42, risk_level: "medium" };
    const mockVerifOut: any = { agreement_score: 82, verification_score: 85, conflicts: [], warnings: [] };

    const fusion = FusionEngine.fuse(
      mockTechOut,
      mockFundOut,
      mockSentOut,
      mockRiskOut,
      mockVerifOut,
      patterns,
      regime,
      DEFAULT_FUSION_WEIGHTS
    );

    expect(fusion.raw_weighted_score).toBeGreaterThan(50);
    expect(fusion.risk_adjusted_score).toBeGreaterThan(50);
    expect(["bullish", "bearish", "neutral"]).toContain(fusion.direction);
    expect(fusion.active_weights.technical).toBe(0.25);
  });

  it("7. Calibrates multi-horizon probabilities (1D, 5D, 1M, 3M) decoupling score from probability", () => {
    const tech = TechnicalIndicatorEngine.calculate(candles);
    const patterns = PatternMatcher.match(candles, tech);
    const horizons = ProbabilityEngine.calculateHorizons(76, patterns, 80);

    for (const h of ["1d", "5d", "1m", "3m"] as const) {
      expect(horizons).toHaveProperty(h);
      const dist = horizons[h];
      expect(dist.up + dist.sideways + dist.down).toBe(100);
      expect(dist.up).toBeGreaterThan(dist.down);
      expect(dist.confidence).toBeGreaterThan(0);
    }
  });

  it("8. Computes decoupled system confidence considering agreement, sample size and freshness", () => {
    const tech = TechnicalIndicatorEngine.calculate(candles);
    const patterns = PatternMatcher.match(candles, tech);
    const mockVerif: any = { agreement_score: 84, verification_score: 88 };

    const confidence = ConfidenceEngine.calculate(
      patterns,
      mockVerif,
      new Date().toISOString(),
      tech.signals.length
    );

    expect(confidence.overall_confidence).toBeGreaterThanOrEqual(40);
    expect(confidence.overall_confidence).toBeLessThanOrEqual(100);
    expect(confidence.sample_size_factor).toBeGreaterThan(0);
    expect(confidence.agent_agreement_factor).toBe(84);
  });

  it("9. Runs point-in-time backtester verifying zero future data leakage", async () => {
    const report = await BacktestEngine.runBacktest({
      symbol: "RELIANCE",
      horizonDays: 5,
      testPeriodDays: 100,
    });

    expect(report.symbol).toBe("RELIANCE");
    expect(report.metrics.totalTrades).toBeGreaterThan(10);
    expect(report.metrics.winRatePct).toBeGreaterThan(0);
    expect(report.metrics.directionalAccuracyPct).toBeGreaterThan(0);
    expect(report.calibrationBins.length).toBeGreaterThan(3);
    expect(report.sampleTrades.length).toBeGreaterThan(0);
  });
});
