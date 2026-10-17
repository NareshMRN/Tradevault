import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/server";

describe("Market Hours Awareness API (/api/market/status)", () => {
  it("GET /api/market/status returns valid IST market status structure", async () => {
    const res = await request(app).get("/api/market/status");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("state");
    expect(["OPEN", "PRE_OPEN", "AFTER_CLOSE", "OVERNIGHT", "WEEKEND", "HOLIDAY"]).toContain(res.body.state);
    expect(res.body).toHaveProperty("is_open");
    expect(typeof res.body.is_open).toBe("boolean");
    expect(res.body).toHaveProperty("now_ist");
    expect(res.body.now_ist).toMatch(/\+05:30/);
    expect(res.body).toHaveProperty("next_open_ist");
    expect(res.body.next_open_ist).toMatch(/\+05:30/);
    expect(res.body).toHaveProperty("last_session_date");
    expect(res.body.last_session_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(res.body).toHaveProperty("seconds_to_next_open");
    expect(typeof res.body.seconds_to_next_open).toBe("number");
  });

  it("GET /api/market/status?demoState=OPEN applies demo override", async () => {
    const res = await request(app).get("/api/market/status?demoState=OPEN");
    expect(res.status).toBe(200);
    expect(res.body.state).toBe("OPEN");
    expect(res.body.is_open).toBe(true);
    expect(res.body.is_demo).toBe(true);
    expect(res.body.next_close_ist).toMatch(/15:30:00\+05:30/);
  });

  it("GET /api/market/status?demoState=CLOSED applies demo override as AFTER_CLOSE", async () => {
    const res = await request(app).get("/api/market/status?demoState=CLOSED");
    expect(res.status).toBe(200);
    expect(res.body.state).toBe("AFTER_CLOSE");
    expect(res.body.is_open).toBe(false);
    expect(res.body.is_demo).toBe(true);
  });

  it("GET /api/market/status?demoState=WEEKEND applies demo override", async () => {
    const res = await request(app).get("/api/market/status?demoState=WEEKEND");
    expect(res.status).toBe(200);
    expect(res.body.state).toBe("WEEKEND");
    expect(res.body.is_open).toBe(false);
    expect(res.body.is_demo).toBe(true);
  });
});
