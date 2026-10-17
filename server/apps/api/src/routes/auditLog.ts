import { Router, Request, Response } from "express";
import { AuditLog } from "../db/models";
import { requireAuth } from "../middleware/auth";

export const auditLogRouter = Router();

// Get immutable audit log events (filtered for current user)
auditLogRouter.get("/audit-log", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventType, entityType, limit = "100" } = req.query;

    const filter: any = { userId: req.user!.id };
    if (eventType) filter.eventType = eventType;
    if (entityType) filter.entityType = entityType;

    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(parseInt(limit as string, 10), 500));

    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
