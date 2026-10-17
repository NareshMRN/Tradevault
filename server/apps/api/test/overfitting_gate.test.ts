import { describe, it, expect } from "vitest";

describe("Overfitting Soft Override & Reliability Gate Rule", () => {
  it("should preserve original recommendation and attach reliability notice when isEligibleForPaperTrading is false", () => {
    const rawAction = "buy";
    const isEligibleForPaperTrading = false;
    const deflatedSharpeRatio = 0.72;
    const pbo = 0.52;

    const finalAction = rawAction; // Soft override: do not coerce to 'hold'
    const reliabilityScore = Math.max(0, Math.min(100, Math.round((deflatedSharpeRatio * 50) + ((1 - pbo) * 50))));

    let rationale = "Strong momentum confirmed by technical indicators.";
    if (!isEligibleForPaperTrading) {
      rationale += ` [RELIABILITY NOTICE]: Strategy backtest indicates elevated overfitting probability (Reliability Score: ${reliabilityScore}/100, DSR: ${deflatedSharpeRatio}, PBO: ${pbo}). Action maintained as ${finalAction} for educational evaluation.`;
    }

    expect(finalAction).toBe("buy");
    expect(reliabilityScore).toBe(60);
    expect(rationale).toContain("RELIABILITY NOTICE");
    expect(rationale).toContain("Reliability Score: 60/100");
  });

  it("should allow buy or sell action without warning when isEligibleForPaperTrading is true", () => {
    const rawAction = "buy";
    const isEligibleForPaperTrading = true;
    const deflatedSharpeRatio = 1.15;
    const pbo = 0.18;

    const finalAction = rawAction;
    const reliabilityScore = Math.max(0, Math.min(100, Math.round((deflatedSharpeRatio * 50) + ((1 - pbo) * 50))));

    let rationale = "Solid multi-agent consensus.";
    if (!isEligibleForPaperTrading) {
      rationale += " [RELIABILITY NOTICE]";
    }

    expect(finalAction).toBe("buy");
    expect(reliabilityScore).toBe(99);
    expect(rationale).not.toContain("RELIABILITY NOTICE");
  });
});
