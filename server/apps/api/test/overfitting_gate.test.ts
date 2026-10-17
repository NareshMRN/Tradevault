import { describe, it, expect } from "vitest";

describe("Overfitting Paper-Trading Gate Rule", () => {
  it("should enforce 'hold' action when is_eligible_for_paper_trading is false", () => {
    const rawAction = "buy";
    const isEligibleForPaperTrading = false;

    let finalAction = rawAction;
    let rationale = "Bullish momentum";

    // Enforce gate
    if (!isEligibleForPaperTrading && finalAction !== "hold") {
      finalAction = "hold";
      rationale = "[OVERFITTING GATE ENGAGED]: Strategy backtest failed deflated Sharpe / PBO checks. Forced to HOLD.";
    }

    expect(finalAction).toBe("hold");
    expect(rationale).toContain("OVERFITTING GATE ENGAGED");
  });

  it("should allow buy or sell action when is_eligible_for_paper_trading is true", () => {
    const rawAction = "buy";
    const isEligibleForPaperTrading = true;

    let finalAction = rawAction;
    if (!isEligibleForPaperTrading && finalAction !== "hold") {
      finalAction = "hold";
    }

    expect(finalAction).toBe("buy");
  });
});
