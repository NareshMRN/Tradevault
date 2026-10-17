import { VerificationAgentOutput } from "../agents/verification.agent";
import { PatternMatchResult } from "../analysis/patternMatcher";

export interface ConfidenceBreakdown {
  overall_confidence: number; // 0 to 100
  sample_size_factor: number; // 0 to 100
  agent_agreement_factor: number; // 0 to 100
  data_freshness_factor: number; // 0 to 100
  verification_factor: number; // 0 to 100
  signals_strength_factor: number; // 0 to 100
  rationale: string;
}

export class ConfidenceEngine {
  /**
   * Computes a decoupled system confidence score independent from directional probability.
   */
  public static calculate(
    patterns: PatternMatchResult,
    verification: VerificationAgentOutput,
    marketDataTimestamp: string,
    signalsCount: number
  ): ConfidenceBreakdown {
    // 1. Sample Size Factor (0 to 100): 50+ samples gives maximum confidence
    const samples = patterns.samples || 0;
    const sampleSizeFactor = Math.min(100, Math.max(30, Math.round((samples / 50) * 100)));

    // 2. Agent Agreement Factor (0 to 100)
    const agreementFactor = Math.min(100, Math.max(20, verification.agreement_score || 70));

    // 3. Verification Score Factor (0 to 100)
    const verificationFactor = Math.min(100, Math.max(30, verification.verification_score || 75));

    // 4. Data Freshness Factor: Age of market quote in minutes
    let dataFreshnessFactor = 95;
    try {
      const dataAgeMs = Date.now() - new Date(marketDataTimestamp).getTime();
      const ageMinutes = dataAgeMs / (1000 * 60);
      if (ageMinutes > 60) dataFreshnessFactor = 75;
      if (ageMinutes > 1440) dataFreshnessFactor = 60; // >1 day old
    } catch (e) {
      dataFreshnessFactor = 85;
    }

    // 5. Signal Strength Factor: Count of concordant signals
    const signalsStrengthFactor = Math.min(100, Math.max(40, 50 + signalsCount * 8));

    // Weighted synthesis of confidence components
    // Weights: Agreement (30%), Verification (25%), Sample size (25%), Freshness (10%), Signal strength (10%)
    const overall = Math.round(
      agreementFactor * 0.30 +
      verificationFactor * 0.25 +
      sampleSizeFactor * 0.25 +
      dataFreshnessFactor * 0.10 +
      signalsStrengthFactor * 0.10
    );

    const clampedConfidence = Math.min(96, Math.max(35, overall));

    const rationale = `Confidence rated at ${clampedConfidence}/100 grounded in ${samples} historical pattern matches, ${agreementFactor}% cross-agent consensus, and ${verificationFactor}% model verification rigor.`;

    return {
      overall_confidence: clampedConfidence,
      sample_size_factor: sampleSizeFactor,
      agent_agreement_factor: agreementFactor,
      data_freshness_factor: dataFreshnessFactor,
      verification_factor: verificationFactor,
      signals_strength_factor: signalsStrengthFactor,
      rationale,
    };
  }
}
