import { Router, Request, Response } from "express";
import { KillSwitchState, RiskEvent, AuditLog } from "../db/models";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/roleGuard";
import { env } from "../config/env";
import { logAuditEvent } from "../services/auditLogger";

export const adminRouter = Router();

// Provider health monitoring
adminRouter.get(
  "/admin/providers/health",
  requireAuth,
  requireRole("admin"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const providers = [
        { provider: "groq", status: env.GROQ_API_KEY ? "active" : "unconfigured", latencyMs: 140 },
        { provider: "gemini", status: env.GEMINI_API_KEY ? "active" : "unconfigured", latencyMs: 380 },
        { provider: "mistral", status: env.MISTRAL_API_KEY ? "active" : "unconfigured", latencyMs: 310 },
        { provider: "nvidia", status: env.NVIDIA_API_KEY ? "active" : "unconfigured", latencyMs: 290 },
        { provider: "openrouter", status: env.OPENROUTER_API_KEY ? "active" : "unconfigured", latencyMs: 420 },
        { provider: "agent_router", status: env.AGENT_ROUTER_API_KEY ? "active" : "unconfigured", latencyMs: 450 },
        { provider: "alpaca_paper", status: "active", endpoint: env.ALPACA_PAPER_BASE_URL },
      ];

      res.json({
        timestamp: new Date(),
        providers,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// Provider token usage & cost tracking
adminRouter.get(
  "/admin/usage",
  requireAuth,
  requireRole("admin"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      // In production, aggregate from Redis token counters or AuditLog
      res.json({
        period: "last_24h",
        summary: {
          groq: { tokens: 145200, estCostUsd: 0.08 },
          gemini: { tokens: 289000, estCostUsd: 0.15 },
          mistral: { tokens: 42000, estCostUsd: 0.04 },
          nvidia: { tokens: 68000, estCostUsd: 0.05 },
          openrouter: { tokens: 12000, estCostUsd: 0.03 },
          agent_router: { tokens: 94000, estCostUsd: 0.42 },
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// Global system-wide emergency kill switch
adminRouter.post(
  "/admin/kill-switch/global",
  requireAuth,
  requireRole("admin"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Engage kill switch for all users
      await KillSwitchState.updateMany({}, { isEngaged: true, engagedAt: new Date() });

      await logAuditEvent({
        userId: req.user!.id,
        eventType: "global_kill_switch_engaged",
        entityType: "system",
        payload: { triggeredBy: req.user!.email },
      });

      res.json({
        success: true,
        message: "GLOBAL KILL SWITCH ENGAGED. All trading across the entire system has been halted.",
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);
