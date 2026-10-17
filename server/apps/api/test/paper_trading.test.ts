import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../src/server";
import { PaperTradingService } from "../src/services/paperTradingService";

describe("Paper Trading Engine & Portfolio Service (INR)", () => {
  const testUserId = "test-trader-uuid-101";

  beforeEach(() => {
    // Reset test user portfolio to fresh ₹10,00,000 INR
    PaperTradingService.resetPortfolio(testUserId, 1000000.0);
  });

  it("should initialize user account with ₹10,00,000 virtual INR capital and summary metrics", async () => {
    const summary = await PaperTradingService.getSummary(testUserId);
    expect(summary.currency).toBe("INR");
    expect(summary.initialCapital).toBe(1000000);
    expect(summary.cash).toBe(1000000);
    expect(summary.portfolioValue).toBe(1000000);
    expect(summary.invested).toBe(0);
    expect(summary.positionCount).toBe(0);
  });

  it("should execute virtual paper BUY order and update cash and position", async () => {
    const buyOrder = await PaperTradingService.executeOrder(testUserId, {
      ticker: "INFY",
      side: "buy",
      quantity: 10,
      orderType: "market",
    });

    expect(buyOrder.status).toBe("filled");
    expect(buyOrder.ticker).toBe("INFY");
    expect(buyOrder.quantity).toBe(10);
    expect(buyOrder.executedPrice).toBeGreaterThan(0);
    expect(buyOrder.totalAmount).toBe(buyOrder.quantity * buyOrder.executedPrice);

    const positions = await PaperTradingService.getPositions(testUserId);
    const infyPos = positions.find((p) => p.ticker === "INFY");
    expect(infyPos).toBeDefined();
    expect(infyPos!.quantity).toBe(10);
    expect(infyPos!.averagePrice).toBe(buyOrder.executedPrice);
    expect(infyPos!.sector).toBe("IT");

    const summary = await PaperTradingService.getSummary(testUserId);
    expect(summary.cash).toBe(1000000 - buyOrder.totalAmount);
    expect(summary.invested).toBe(buyOrder.totalAmount);
  });

  it("should execute virtual paper SELL order, calculate realized PnL, and update active holding", async () => {
    // 1. Buy 20 shares of ICICIBANK
    await PaperTradingService.executeOrder(testUserId, {
      ticker: "ICICIBANK",
      side: "buy",
      quantity: 20,
      orderType: "market",
    });

    // 2. Partial Sell: sell 10 shares
    const sellOrder = await PaperTradingService.executeOrder(testUserId, {
      ticker: "ICICIBANK",
      side: "sell",
      quantity: 10,
      orderType: "market",
    });

    expect(sellOrder.status).toBe("filled");
    expect(sellOrder.side).toBe("sell");
    expect(sellOrder.quantity).toBe(10);

    let positions = await PaperTradingService.getPositions(testUserId);
    let iciciPos = positions.find((p) => p.ticker === "ICICIBANK");
    expect(iciciPos).toBeDefined();
    expect(iciciPos!.quantity).toBe(10);

    // 3. Full Sell: sell remaining 10 shares -> position removed
    await PaperTradingService.executeOrder(testUserId, {
      ticker: "ICICIBANK",
      side: "sell",
      quantity: 10,
      orderType: "market",
    });

    positions = await PaperTradingService.getPositions(testUserId);
    iciciPos = positions.find((p) => p.ticker === "ICICIBANK");
    expect(iciciPos).toBeUndefined();
  });

  it("should reject BUY orders when order amount exceeds available cash", async () => {
    await expect(
      PaperTradingService.executeOrder(testUserId, {
        ticker: "RELIANCE",
        side: "buy",
        quantity: 10000, // Exceeds ₹10,00,000 cash balance
        orderType: "market",
      })
    ).rejects.toThrow(/Insufficient virtual cash balance/);
  });

  it("should reject SELL orders when attempting to sell shares not held", async () => {
    await expect(
      PaperTradingService.executeOrder(testUserId, {
        ticker: "TATAMOTORS",
        side: "sell",
        quantity: 50,
        orderType: "market",
      })
    ).rejects.toThrow(/Cannot sell 50 shares of TATAMOTORS/);
  });

  it("should reset portfolio back to initial virtual capital", async () => {
    await PaperTradingService.executeOrder(testUserId, {
      ticker: "ITC",
      side: "buy",
      quantity: 50,
      orderType: "market",
    });

    const resetAccount = PaperTradingService.resetPortfolio(testUserId, 1500000.0);
    expect(resetAccount.cash).toBe(1500000.0);
    expect(resetAccount.positions.size).toBe(0);
    expect(resetAccount.orders.length).toBe(0);
  });

  // ==========================================
  // HTTP Gateway API Routes
  // ==========================================
  describe("HTTP Gateway API Endpoints", () => {
    it("GET /api/paper-portfolio should return portfolio summary", async () => {
      const res = await request(app).get("/api/paper-portfolio");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("cash");
      expect(res.body).toHaveProperty("portfolioValue");
      expect(res.body).toHaveProperty("currency", "INR");
      expect(res.body).toHaveProperty("winRatePct");
    });

    it("GET /api/paper-portfolio/positions should return positions array", async () => {
      const res = await request(app).get("/api/paper-portfolio/positions");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("positions");
      expect(Array.isArray(res.body.positions)).toBe(true);
    });

    it("POST /api/paper-portfolio/orders should execute new paper trade", async () => {
      const res = await request(app)
        .post("/api/paper-portfolio/orders")
        .send({
          ticker: "SBIN",
          side: "buy",
          quantity: 25,
          orderType: "market",
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("order");
      expect(res.body.order.ticker).toBe("SBIN");
      expect(res.body.order.status).toBe("filled");
      expect(res.body).toHaveProperty("summary");
      expect(res.body).toHaveProperty("message");
    });

    it("GET /api/paper-portfolio/orders should return order history", async () => {
      const res = await request(app).get("/api/paper-portfolio/orders");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("orders");
      expect(Array.isArray(res.body.orders)).toBe(true);
    });

    it("POST /api/paper-portfolio/reset should reset portfolio", async () => {
      const res = await request(app)
        .post("/api/paper-portfolio/reset")
        .send({ initialCapital: 1000000 });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("message");
      expect(res.body.summary.cash).toBe(1000000);
      expect(res.body.summary.positionCount).toBe(0);
    });
  });
});
