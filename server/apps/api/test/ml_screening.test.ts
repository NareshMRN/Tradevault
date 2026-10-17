import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../src/server";

describe("ML Stock Screening API Routes", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("GET /api/ml/picks should return screening response with threshold and picks", async () => {
    const res = await request(app).get("/api/ml/picks");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("threshold");
    expect(res.body).toHaveProperty("data_source");
    expect(res.body).toHaveProperty("picks");
    expect(Array.isArray(res.body.picks)).toBe(true);
    expect(res.body.picks.length).toBeLessThanOrEqual(5);
  });

  it("GET /api/ml/metrics should return honest out-of-sample metrics", async () => {
    const res = await request(app).get("/api/ml/metrics");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("base_rate");
    expect(res.body).toHaveProperty("threshold");
    expect(res.body).toHaveProperty("precision_at_threshold");
    expect(res.body).toHaveProperty("train_date_range");
    expect(res.body).toHaveProperty("val_date_range");
    expect(res.body).toHaveProperty("test_date_range");
    expect(res.body).toHaveProperty("limitations");
    expect(Array.isArray(res.body.limitations)).toBe(true);
  });
});
