import { Candle } from "../market/historical.service";

export interface TechnicalFeatureObject {
  rsi: number;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
    trend: "bullish" | "bearish";
  };
  ema20: number;
  ema50: number;
  ema200: number;
  sma50: number;
  sma200: number;
  atr: number;
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
    percentB: number;
  };
  volume_change: number; // % vs 20-day average
  support: number;
  resistance: number;
  trend: "bullish" | "bearish" | "neutral";
  signals: string[];
}

export class TechnicalIndicatorEngine {
  /**
   * Computes all quantitative indicators deterministically from OHLCV candles.
   */
  public static calculate(candles: Candle[]): TechnicalFeatureObject {
    if (!candles || candles.length < 20) {
      return this.getDefaultIndicators();
    }

    const closes = candles.map((c) => c.close);
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    const volumes = candles.map((c) => c.volume);
    const currentPrice = closes[closes.length - 1];

    // 1. Moving Averages
    const ema20 = this.calculateEMA(closes, 20);
    const ema50 = this.calculateEMA(closes, 50);
    const ema200 = this.calculateEMA(closes, Math.min(200, closes.length));
    const sma50 = this.calculateSMA(closes, Math.min(50, closes.length));
    const sma200 = this.calculateSMA(closes, Math.min(200, closes.length));

    // 2. RSI (14)
    const rsi = this.calculateRSI(closes, 14);

    // 3. MACD (12, 26, 9)
    const macdResult = this.calculateMACD(closes);

    // 4. ATR (14)
    const atr = this.calculateATR(highs, lows, closes, 14);

    // 5. Bollinger Bands (20, 2)
    const bb = this.calculateBollingerBands(closes, 20, 2);

    // 6. Volume Change (% vs 20-day volume SMA)
    const recentVolume = volumes[volumes.length - 1];
    const avgVolume20 = this.calculateSMA(volumes.slice(-20), 20);
    const volumeChange = avgVolume20 > 0
      ? Number((((recentVolume - avgVolume20) / avgVolume20) * 100).toFixed(1))
      : 0;

    // 7. Support & Resistance Levels
    const { support, resistance } = this.calculateSupportResistance(highs, lows, currentPrice);

    // 8. Overall deterministic technical trend & signals
    const signals: string[] = [];
    let bullishPoints = 0;
    let bearishPoints = 0;

    if (currentPrice > ema20) {
      bullishPoints++;
      signals.push("Price above 20 EMA");
    } else {
      bearishPoints++;
      signals.push("Price below 20 EMA");
    }

    if (ema20 > ema50) {
      bullishPoints++;
      signals.push("20 EMA above 50 EMA (Short-term Golden Cross)");
    } else {
      bearishPoints++;
    }

    if (currentPrice > ema200) {
      bullishPoints++;
      signals.push("Price above 200 EMA (Macro Bullish)");
    } else {
      bearishPoints++;
    }

    if (macdResult.histogram > 0) {
      bullishPoints++;
      signals.push("Positive MACD Histogram expansion");
    } else {
      bearishPoints++;
      signals.push("Negative MACD momentum");
    }

    if (rsi >= 50 && rsi <= 70) {
      bullishPoints++;
      signals.push("RSI in strong bullish momentum zone (50-70)");
    } else if (rsi > 70) {
      signals.push("RSI in overbought zone (>70)");
    } else if (rsi < 30) {
      signals.push("RSI in oversold zone (<30)");
    }

    if (volumeChange > 15) {
      signals.push(`Elevated volume surge (+${volumeChange}% vs 20d avg)`);
    }

    let trend: "bullish" | "bearish" | "neutral" = "neutral";
    if (bullishPoints >= 4) trend = "bullish";
    else if (bearishPoints >= 4) trend = "bearish";

    return {
      rsi,
      macd: macdResult,
      ema20,
      ema50,
      ema200,
      sma50,
      sma200,
      atr,
      bollingerBands: bb,
      volume_change: volumeChange,
      support,
      resistance,
      trend,
      signals,
    };
  }

  public static calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50.0;
    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const diff = prices[i] - prices[i - 1];
      if (diff >= 0) gains += diff;
      else losses -= diff;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period + 1; i < prices.length; i++) {
      const diff = prices[i] - prices[i - 1];
      if (diff >= 0) {
        avgGain = (avgGain * (period - 1) + diff) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = (avgLoss * (period - 1) - diff) / period;
      }
    }

    if (avgLoss === 0) return 100.0;
    const rs = avgGain / avgLoss;
    return Number((100 - 100 / (1 + rs)).toFixed(1));
  }

  public static calculateSMA(values: number[], period: number): number {
    if (values.length === 0) return 0;
    const slice = values.slice(-period);
    const sum = slice.reduce((a, b) => a + b, 0);
    return Number((sum / slice.length).toFixed(2));
  }

  public static calculateEMA(values: number[], period: number): number {
    if (values.length === 0) return 0;
    if (values.length < period) return this.calculateSMA(values, values.length);

    const k = 2 / (period + 1);
    let ema = values.slice(0, period).reduce((a, b) => a + b, 0) / period;

    for (let i = period; i < values.length; i++) {
      ema = values[i] * k + ema * (1 - k);
    }

    return Number(ema.toFixed(2));
  }

  public static calculateMACD(
    closes: number[],
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9
  ): { macd: number; signal: number; histogram: number; trend: "bullish" | "bearish" } {
    if (closes.length < slowPeriod + signalPeriod) {
      return { macd: 0, signal: 0, histogram: 0, trend: "bullish" };
    }

    const fastK = 2 / (fastPeriod + 1);
    const slowK = 2 / (slowPeriod + 1);
    const signalK = 2 / (signalPeriod + 1);

    // Initial SMAs
    let fastEMA = closes.slice(0, fastPeriod).reduce((a, b) => a + b, 0) / fastPeriod;
    let slowEMA = closes.slice(0, slowPeriod).reduce((a, b) => a + b, 0) / slowPeriod;

    for (let i = fastPeriod; i < slowPeriod; i++) {
      fastEMA = closes[i] * fastK + fastEMA * (1 - fastK);
    }

    const macdLine: number[] = [];
    for (let i = slowPeriod; i < closes.length; i++) {
      fastEMA = closes[i] * fastK + fastEMA * (1 - fastK);
      slowEMA = closes[i] * slowK + slowEMA * (1 - slowK);
      macdLine.push(fastEMA - slowEMA);
    }

    let signalEMA = macdLine.slice(0, signalPeriod).reduce((a, b) => a + b, 0) / signalPeriod;
    for (let i = signalPeriod; i < macdLine.length; i++) {
      signalEMA = macdLine[i] * signalK + signalEMA * (1 - signalK);
    }

    const currentMACD = macdLine[macdLine.length - 1];
    const histogram = currentMACD - signalEMA;

    return {
      macd: Number(currentMACD.toFixed(2)),
      signal: Number(signalEMA.toFixed(2)),
      histogram: Number(histogram.toFixed(2)),
      trend: histogram >= 0 ? "bullish" : "bearish",
    };
  }

  public static calculateATR(highs: number[], lows: number[], closes: number[], period: number = 14): number {
    if (highs.length < period + 1) return 15.0;

    const trs: number[] = [];
    for (let i = 1; i < highs.length; i++) {
      const hl = highs[i] - lows[i];
      const hc = Math.abs(highs[i] - closes[i - 1]);
      const lc = Math.abs(lows[i] - closes[i - 1]);
      trs.push(Math.max(hl, hc, lc));
    }

    let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < trs.length; i++) {
      atr = (atr * (period - 1) + trs[i]) / period;
    }

    return Number(atr.toFixed(2));
  }

  public static calculateBollingerBands(
    closes: number[],
    period: number = 20,
    multiplier: number = 2
  ): { upper: number; middle: number; lower: number; percentB: number } {
    if (closes.length < period) {
      const last = closes[closes.length - 1] || 100;
      return { upper: last * 1.05, middle: last, lower: last * 0.95, percentB: 0.5 };
    }

    const slice = closes.slice(-period);
    const middle = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - middle, 2), 0) / period;
    const stdDev = Math.sqrt(variance);

    const upper = middle + multiplier * stdDev;
    const lower = middle - multiplier * stdDev;
    const current = closes[closes.length - 1];
    const percentB = upper !== lower ? (current - lower) / (upper - lower) : 0.5;

    return {
      upper: Number(upper.toFixed(2)),
      middle: Number(middle.toFixed(2)),
      lower: Number(lower.toFixed(2)),
      percentB: Number(percentB.toFixed(2)),
    };
  }

  public static calculateSupportResistance(
    highs: number[],
    lows: number[],
    currentPrice: number
  ): { support: number; resistance: number } {
    const lookback = Math.min(60, highs.length);
    const recentHighs = highs.slice(-lookback);
    const recentLows = lows.slice(-lookback);

    const maxHigh = Math.max(...recentHighs);
    const minLow = Math.min(...recentLows);

    // Approximate pivot resistance and support
    const resistance = currentPrice < maxHigh ? Number(maxHigh.toFixed(2)) : Number((currentPrice * 1.05).toFixed(2));
    const support = currentPrice > minLow ? Number(minLow.toFixed(2)) : Number((currentPrice * 0.95).toFixed(2));

    return { support, resistance };
  }

  private static getDefaultIndicators(): TechnicalFeatureObject {
    return {
      rsi: 54.0,
      macd: { macd: 2.1, signal: 1.8, histogram: 0.3, trend: "bullish" },
      ema20: 1000,
      ema50: 980,
      ema200: 940,
      sma50: 980,
      sma200: 940,
      atr: 18.5,
      bollingerBands: { upper: 1050, middle: 1000, lower: 950, percentB: 0.5 },
      volume_change: 5.2,
      support: 960,
      resistance: 1040,
      trend: "neutral",
      signals: ["Baseline technical indicators initialized"],
    };
  }
}
