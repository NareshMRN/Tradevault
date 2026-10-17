import { describe, it, expect, vi } from "vitest";
import { AlpacaService } from "../src/services/alpacaService";
import { RiskProfile } from "../src/db/models";

describe("Alpaca Broker Integration & Safety Rails", () => {
  it("should default to paper execution safely", async () => {
    const result = await AlpacaService.submitOrder({
      userId: "user-paper-test-1",
      ticker: "AAPL",
      side: "buy",
      quantity: 10,
      isPaper: true,
    });

    expect(result.ticker).toBe("AAPL");
    expect(result.side).toBe("buy");
    expect(result.quantity).toBe(10);
    expect(result.isPaper).toBe(true);
    expect(result.status).toBe("filled");
  });

  it("should reject live order if liveTradingEnabled is false on risk profile", async () => {
    vi.spyOn(RiskProfile, "findOne").mockResolvedValueOnce({
      liveTradingEnabled: false,
    } as any);

    await expect(
      AlpacaService.submitOrder({
        userId: "user-live-unconfirmed",
        ticker: "AAPL",
        side: "buy",
        quantity: 5,
        isPaper: false, // Attempt live
      })
    ).rejects.toThrow();
  });
});
