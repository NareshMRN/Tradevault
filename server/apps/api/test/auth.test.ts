import { describe, it, expect, vi } from "vitest";
import jwt from "jsonwebtoken";
import { requireRole } from "../src/middleware/roleGuard";
import { env } from "../src/config/env";

describe("Authentication & RBAC Middleware", () => {
  it("should generate and verify signed JWT tokens", () => {
    const payload = {
      id: "user-uuid-12345",
      email: "trader@example.com",
      role: "user" as const,
      displayName: "Pro Trader",
    };

    const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: "1h" });
    expect(token).toBeDefined();

    const decoded = jwt.verify(token, env.JWT_SECRET) as typeof payload;
    expect(decoded.id).toBe(payload.id);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.role).toBe("user");
  });

  it("should deny access when user role does not match required role", () => {
    const middleware = requireRole("admin");
    const req: any = { user: { id: "user-1", role: "user" } };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining("Requires 'admin' role") })
    );
  });

  it("should grant access when user has the required admin role", () => {
    const middleware = requireRole("admin");
    const req: any = { user: { id: "admin-1", role: "admin" } };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should successfully log in and return a JWT token without buffering timeout", async () => {
    const supertest = (await import("supertest")).default;
    const { app } = await import("../src/server");

    const res = await supertest(app)
      .post("/api/auth/login")
      .send({ email: "demo@confluence.trade", password: "password123" });

    expect([200, 201]).toContain(res.status);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user).toHaveProperty("email", "demo@confluence.trade");
  });

  it("should successfully register a new user in resilient mode", async () => {
    const supertest = (await import("supertest")).default;
    const { app } = await import("../src/server");

    const testEmail = `trader_${Date.now()}@example.com`;
    const res = await supertest(app)
      .post("/api/auth/register")
      .send({ email: testEmail, password: "SecurePassword123!", displayName: "Test User" });

    expect([200, 201]).toContain(res.status);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user).toHaveProperty("email", testEmail);
  });
});

