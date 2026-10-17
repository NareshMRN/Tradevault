export interface BacktestMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRatePct: number;
  directionalAccuracyPct: number;
  precisionPct: number;
  recallPct: number;
  profitFactor: number;
  averageReturnPct: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
}

export class MetricsCalculator {
  public static calculate(
    trades: Array<{
      direction: "bullish" | "bearish" | "neutral";
      entryPrice: number;
      exitPrice: number;
      actualReturnPct: number;
      wasCorrect: boolean;
    }>
  ): BacktestMetrics {
    if (trades.length === 0) {
      return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRatePct: 0,
        directionalAccuracyPct: 0,
        precisionPct: 0,
        recallPct: 0,
        profitFactor: 0,
        averageReturnPct: 0,
        maxDrawdownPct: 0,
        sharpeRatio: 0,
      };
    }

    let wins = 0;
    let losses = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let sumReturns = 0;

    let truePositives = 0; // predicted bull, went up
    let falsePositives = 0; // predicted bull, went down
    let falseNegatives = 0; // predicted neutral/bear, went up

    for (const t of trades) {
      sumReturns += t.actualReturnPct;
      if (t.actualReturnPct > 0) {
        wins++;
        grossProfit += t.actualReturnPct;
      } else if (t.actualReturnPct < 0) {
        losses++;
        grossLoss += Math.abs(t.actualReturnPct);
      }

      if (t.direction === "bullish") {
        if (t.actualReturnPct > 0) truePositives++;
        else falsePositives++;
      } else {
        if (t.actualReturnPct > 0) falseNegatives++;
      }
    }

    const totalTrades = trades.length;
    const winRate = Number(((wins / totalTrades) * 100).toFixed(1));
    const correctCount = trades.filter((t) => t.wasCorrect).length;
    const directionalAccuracy = Number(((correctCount / totalTrades) * 100).toFixed(1));

    const precision = (truePositives + falsePositives) > 0
      ? Number(((truePositives / (truePositives + falsePositives)) * 100).toFixed(1))
      : 0;

    const recall = (truePositives + falseNegatives) > 0
      ? Number(((truePositives / (truePositives + falseNegatives)) * 100).toFixed(1))
      : 0;

    const profitFactor = grossLoss > 0 ? Number((grossProfit / grossLoss).toFixed(2)) : Number((grossProfit).toFixed(2));
    const avgReturn = Number((sumReturns / totalTrades).toFixed(2));

    // Calculate maximum equity drawdown
    let peak = 100;
    let running = 100;
    let maxDd = 0;
    const returnsArray = trades.map((t) => t.actualReturnPct);

    for (const r of returnsArray) {
      running = running * (1 + r / 100);
      if (running > peak) peak = running;
      const dd = ((peak - running) / peak) * 100;
      if (dd > maxDd) maxDd = dd;
    }

    // Sharpe ratio proxy
    const mean = sumReturns / totalTrades;
    const variance = returnsArray.reduce((acc, r) => acc + Math.pow(r - mean, 2), 0) / Math.max(1, totalTrades - 1);
    const std = Math.sqrt(variance);
    const sharpe = std > 0 ? Number(((mean / std) * Math.sqrt(52)).toFixed(2)) : 1.2;

    return {
      totalTrades,
      winningTrades: wins,
      losingTrades: losses,
      winRatePct: winRate,
      directionalAccuracyPct: directionalAccuracy,
      precisionPct: precision,
      recallPct: recall,
      profitFactor,
      averageReturnPct: avgReturn,
      maxDrawdownPct: Number(maxDd.toFixed(2)),
      sharpeRatio: sharpe,
    };
  }
}
