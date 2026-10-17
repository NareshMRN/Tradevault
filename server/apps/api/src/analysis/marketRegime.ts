import { TechnicalFeatureObject } from "./technicalIndicators";
import { HistoricalAnalysisResult } from "./historicalAnalysis";

export interface MarketRegimeObject {
  regime: "bullish_trend" | "bearish_trend" | "consolidation" | "high_volatility";
  label: string;
  summary: string;
  supportLevel: number;
  resistanceLevel: number;
  regimeScore: number; // 0 to 100
}

export class MarketRegimeEngine {
  public static classify(tech: TechnicalFeatureObject, hist: HistoricalAnalysisResult): MarketRegimeObject {
    const isHighVol = hist.volatility > 28;
    const isAbove50 = tech.signals.some((s) => s.includes("20 EMA above 50 EMA"));
    const isAbove200 = tech.signals.some((s) => s.includes("200 EMA"));

    if (isHighVol && Math.abs(tech.macd.histogram) < 1.0) {
      return {
        regime: "high_volatility",
        label: "High Volatility Expansion",
        summary: "Elevated market fluctuations and wider daily ranges warrant tighter risk controls.",
        supportLevel: tech.support,
        resistanceLevel: tech.resistance,
        regimeScore: 50,
      };
    }

    if (tech.trend === "bullish" && isAbove200) {
      return {
        regime: "bullish_trend",
        label: "Bullish Trend Confirmation",
        summary: "Sustained positive price action above key long-term moving averages with expanding volume.",
        supportLevel: tech.support,
        resistanceLevel: tech.resistance,
        regimeScore: 78,
      };
    }

    if (tech.trend === "bearish") {
      return {
        regime: "bearish_trend",
        label: "Bearish Distribution",
        summary: "Price under pressure below major moving averages with negative momentum bias.",
        supportLevel: tech.support,
        resistanceLevel: tech.resistance,
        regimeScore: 32,
      };
    }

    return {
      regime: "consolidation",
      label: "Range-Bound Consolidation",
      summary: "Price oscillating within defined support and resistance boundaries awaiting directional catalyst.",
      supportLevel: tech.support,
      resistanceLevel: tech.resistance,
      regimeScore: 55,
    };
  }
}
