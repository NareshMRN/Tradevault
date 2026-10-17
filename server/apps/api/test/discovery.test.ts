import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../src/server";

describe("Discovery Scanner API Routes", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should return Indian market sectors with scores and trends", async () => {
    const res = await request(app).get("/api/discovery/sectors");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("sectors");
    expect(Array.isArray(res.body.sectors)).toBe(true);
    expect(res.body.sectors.length).toBeGreaterThan(0);

    const first = res.body.sectors[0];
    expect(first).toHaveProperty("sector");
    expect(first).toHaveProperty("score");
    expect(first).toHaveProperty("trend");
    expect(["bullish", "bearish", "neutral"]).toContain(first.trend);
    expect(first).toHaveProperty("topStocks");
    expect(Array.isArray(first.topStocks)).toBe(true);
  });

  it("should return stock picks with risk profile and quant metrics", async () => {
    const res = await request(app)
      .get("/api/discovery/picks")
      .query({ risk: "conservative", limit: 5 });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("picks");
    expect(Array.isArray(res.body.picks)).toBe(true);
    expect(res.body.picks.length).toBeGreaterThan(0);

    const pick = res.body.picks[0];
    expect(pick).toHaveProperty("symbol");
    expect(pick).toHaveProperty("companyName");
    expect(pick).toHaveProperty("sector");
    expect(pick).toHaveProperty("price");
    expect(pick).toHaveProperty("score");
    expect(pick).toHaveProperty("quantMetrics");
    expect(pick.quantMetrics).toHaveProperty("momentum20d");
    expect(pick.quantMetrics).toHaveProperty("rsi14");
    expect(pick).toHaveProperty("signals");
    expect(Array.isArray(pick.signals)).toBe(true);
  });

  it("should trigger discovery scan and return top 5 picks with debate summaries", async () => {
    const res = await request(app)
      .post("/api/discovery/run")
      .send({ risk: "balanced" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("scanId");
    expect(res.body).toHaveProperty("timestamp");
    expect(res.body).toHaveProperty("benchmark", "NIFTY 50");
    expect(res.body).toHaveProperty("sectors");
    expect(res.body).toHaveProperty("picks");
    expect(res.body).toHaveProperty("topPicks");

    expect(res.body.topPicks.length).toBeLessThanOrEqual(5);
    if (res.body.topPicks.length > 0) {
      const topPick = res.body.topPicks[0];
      expect(topPick).toHaveProperty("debateSummary");
      expect(topPick.debateSummary).toHaveProperty("consensus");
      expect(["buy", "sell", "hold"]).toContain(topPick.debateSummary.consensus);
      expect(topPick.debateSummary).toHaveProperty("bullCase");
      expect(topPick.debateSummary).toHaveProperty("bearCase");
      expect(topPick.debateSummary).toHaveProperty("synthesis");
    }
  });

  it("should return latest complete discovery scan result", async () => {
    const res = await request(app).get("/api/discovery/latest");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("scanId");
    expect(res.body).toHaveProperty("sectors");
    expect(res.body).toHaveProperty("picks");
    expect(res.body).toHaveProperty("topPicks");
  });
});
