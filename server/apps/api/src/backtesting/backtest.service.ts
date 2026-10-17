import { HistoricalService, Candle } from "../market/historical.service";
import { TechnicalIndicatorEngine } from "../analysis/technicalIndicators";
import { HistoricalAnalysisEngine } from "../analysis/historicalAnalysis";
import { MetricsCalculator, BacktestMetrics } from "./metrics";
import { CalibrationService, ScoreCalibrationBin } from "./calibration.service";

export interface BacktestSimulationRequest {
  symbol: string;
  horizonDays: number; // e.g. 5 for 5D
  testPeriodDays?: number; // e.g. 180 or 365
}

export interface BacktestTradeRecord {
  date: string;
  entryPrice: number;
  exitPrice: number;
  direction: "bullish" | "bearish" | "neutral";
  predictedProbabilityUp: number;
  actualReturnPct: number;
  wasCorrect: boolean;
}

export interface BacktestReport {
  symbol: string;
  horizonDays: number;
  testPeriodDays: number;
  metrics: BacktestMetrics;
  calibrationBins: ScoreCalibrationBin[];
  sampleTrades: BacktestTradeRecord[];
  simulatedAt: string;
}

export class BacktestEngine {
  /**
   * Runs point-in-time backtesting strictly using past data before each simulated date to eliminate data leakage.
   */
  public static async runBacktest(
    request: BacktestSimulationRequest
  ): Promise<BacktestReport> {
    const symbol = request.symbol.trim().toUpperCase().replace(/\.NS$/, "").replace(/\.BO$/, "");
    const horizon = request.horizonDays || 5;
    const testDays = request.testPeriodDays || 250;

    // Fetch deep historical candles (e.g. 2 years to allow warm-up)
    const allCandles = await HistoricalService.getCandles(symbol, "3y");

    if (allCandles.length < testDays + horizon + 60) {
      throw new Error(`Insufficient historical data candles (${allCandles.length}) to run backtest`);
    }

    const trades: BacktestTradeRecord[] = [];
    const startIndex = allCandles.length - testDays - horizon;

    // Step forward day-by-day (or in 3-day steps to reduce trade overlap)
    const stepSize = Math.max(1, Math.floor(horizon / 2));

    for (let i = startIndex; i <= allCandles.length - horizon - 1; i += stepSize) {
      // 1. Point-in-time slice: ONLY candles up to index i are visible
      const visibleCandles = allCandles.slice(0, i + 1);
      const simulatedToday = visibleCandles[visibleCandles.length - 1];

      // 2. Generate deterministic technical indicators and historical returns
      const tech = TechnicalIndicatorEngine.calculate(visibleCandles);
      const hist = HistoricalAnalysisEngine.analyze(visibleCandles);

      // 3. Generate quantitative composite score (0-100)
      let score = 50;
      if (tech.trend === "bullish") score += 15;
      else if (tech.trend === "bearish") score -= 15;

      if (tech.rsi >= 50 && tech.rsi <= 68) score += 10;
      else if (tech.rsi > 70) score -= 6;
      else if (tech.rsi < 35) score -= 10;

      if (tech.macd.histogram > 0) score += 8;
      if (tech.volume_change > 15) score += 6;

      const clampedScore = Math.min(95, Math.max(15, score));
      const direction: "bullish" | "bearish" | "neutral" =
        clampedScore >= 58 ? "bullish" : clampedScore <= 42 ? "bearish" : "neutral";

      const predictedProbUp = Math.round(clampedScore * 0.75 + 10);

      // 4. Look strictly at future candle at index i + horizon
      const futureCandle = allCandles[i + horizon];
      const entryPrice = simulatedToday.close;
      const exitPrice = futureCandle.close;
      const returnPct = Number((((exitPrice - entryPrice) / entryPrice) * 100).toFixed(2));

      let wasCorrect = false;
      if (direction === "bullish" && returnPct > 0) wasCorrect = true;
      else if (direction === "bearish" && returnPct < 0) wasCorrect = true;
      else if (direction === "neutral" && Math.abs(returnPct) < 1.5) wasCorrect = true;

      trades.push({
        date: simulatedToday.date,
        entryPrice,
        exitPrice,
        direction,
        predictedProbabilityUp: predictedProbUp,
        actualReturnPct: returnPct,
        wasCorrect,
      });
    }

    const metrics = MetricsCalculator.calculate(trades);
    const calibrationBins = CalibrationService.getCalibrationTable();

    return {
      symbol,
      horizonDays: horizon,
      testPeriodDays: testDays,
      metrics,
      calibrationBins,
      sampleTrades: trades.slice(-15),
      simulatedAt: new Date().toISOString(),
    };
  }
}
