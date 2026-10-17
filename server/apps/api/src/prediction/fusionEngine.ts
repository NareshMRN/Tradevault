import { TechnicalAgentOutput } from "../agents/technical.agent";
import { FundamentalAgentOutput } from "../agents/fundamental.agent";
import { SentimentAgentOutput } from "../agents/sentiment.agent";
import { RiskAgentOutput } from "../agents/risk.agent";
import { VerificationAgentOutput } from "../agents/verification.agent";
import { PatternMatchResult } from "../analysis/patternMatcher";
import { MarketRegimeObject } from "../analysis/marketRegime";

export interface FusionWeights {
  technical: number;
  historical: number;
  fundamental: number;
  sentiment: number;
  market: number;
}

export const DEFAULT_FUSION_WEIGHTS: FusionWeights = {
  technical: 0.25,
  historical: 0.25,
  fundamental: 0.20,
  sentiment: 0.15,
  market: 0.15,
};

export interface FusionResult {
  raw_weighted_score: number; // 0 to 100
  risk_adjusted_score: number; // 0 to 100
  direction: "bullish" | "bearish" | "neutral";
  component_scores: {
    technical: number;
    historical: number;
    fundamental: number;
    sentiment: number;
    market: number;
  };
  active_weights: FusionWeights;
  risk_penalty: number;
  verification_adjustment: number;
}

export class FusionEngine {
  /**
   * Combines multi-agent outputs, historical pattern match rates, and market regime into a synthesized score.
   */
  public static fuse(
    tech: TechnicalAgentOutput,
    fund: FundamentalAgentOutput,
    sent: SentimentAgentOutput,
    risk: RiskAgentOutput,
    verification: VerificationAgentOutput,
    patterns: PatternMatchResult,
    regime: MarketRegimeObject,
    customWeights?: Partial<FusionWeights>
  ): FusionResult {
    const weights: FusionWeights = { ...DEFAULT_FUSION_WEIGHTS, ...customWeights };

    // 1. Normalize individual component scores (0 to 100)
    const technicalScore = tech.score;
    const historicalScore = patterns["5d_positive_rate"] ? Math.min(100, Math.max(0, patterns["5d_positive_rate"])) : 50;
    const fundamentalScore = fund.score;
    const sentimentScore = sent.score;
    const marketScore = regime.regimeScore;

    // 2. Compute base weighted score
    const totalWeight = weights.technical + weights.historical + weights.fundamental + weights.sentiment + weights.market;
    const rawWeighted = (
      technicalScore * weights.technical +
      historicalScore * weights.historical +
      fundamentalScore * weights.fundamental +
      sentimentScore * weights.sentiment +
      marketScore * weights.market
    ) / (totalWeight || 1.0);

    // 3. Risk Adjustment: Penalize if Risk Agent reports high/critical risk (>60)
    let riskPenalty = 0;
    if (risk.risk_score > 60) {
      // Deduct up to 15 points proportional to excess risk
      riskPenalty = ((risk.risk_score - 60) / 40) * 15;
    }

    // 4. Verification Adjustment: If verification finds conflicts or low agreement, dampen extreme scores
    let verificationAdjustment = 0;
    if (verification.agreement_score < 60) {
      const penalty = ((60 - verification.agreement_score) / 60) * 10;
      verificationAdjustment = -penalty;
    }

    // 5. Final calibrated score
    let adjustedScore = rawWeighted - riskPenalty + verificationAdjustment;
    adjustedScore = Math.min(98, Math.max(10, Number(adjustedScore.toFixed(1))));

    const direction: "bullish" | "bearish" | "neutral" =
      adjustedScore >= 58 ? "bullish" : adjustedScore <= 42 ? "bearish" : "neutral";

    return {
      raw_weighted_score: Number(rawWeighted.toFixed(1)),
      risk_adjusted_score: adjustedScore,
      direction,
      component_scores: {
        technical: technicalScore,
        historical: historicalScore,
        fundamental: fundamentalScore,
        sentiment: sentimentScore,
        market: marketScore,
      },
      active_weights: weights,
      risk_penalty: Number(riskPenalty.toFixed(1)),
      verification_adjustment: Number(verificationAdjustment.toFixed(1)),
    };
  }
}
