import { Router, Request, Response } from "express";
import { KillSwitchState, RiskEvent } from "../db/models";
import { requireAuth } from "../middleware/auth";
import { broadcastKillSwitchUpdate } from "../websocket/socketServer";
import { logAuditEvent } from "../services/auditLogger";

export const killSwitchRouter = Router();

// Engage kill switch (Instantly halts all order submissions)
killSwitchRouter.post("/kill-switch/engage", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const state = await KillSwitchState.findOneAndUpdate(
      { userId: req.user!.id },
      {
        isEngaged: true,
        engagedAt: new Date(),
        engagedBy: req.user!.id,
      },
      { upsert: true, new: true }
    );

    // Record risk event
    await RiskEvent.create({
      userId: req.user!.id,
      eventType: "kill_switch_engaged",
      detail: `Kill switch engaged by user ${req.user!.email}`,
    });

    // Broadcast update
    broadcastKillSwitchUpdate(req.user!.id, { isEngaged: true });

    // Audit log
    await logAuditEvent({
      userId: req.user!.id,
      eventType: "kill_switch_engaged",
      entityType: "kill_switch",
      payload: { engagedAt: state.engagedAt },
    });

    res.json({
      success: true,
      isEngaged: true,
      message: "EMERGENCY KILL SWITCH ENGAGED. All trade submissions are halted.",
      state,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Disengage kill switch
killSwitchRouter.post("/kill-switch/disengage", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const state = await KillSwitchState.findOneAndUpdate(
      { userId: req.user!.id },
      {
        isEngaged: false,
        engagedAt: null,
        engagedBy: null,
      },
      { upsert: true, new: true }
    );

    await RiskEvent.create({
      userId: req.user!.id,
      eventType: "kill_switch_disengaged",
      detail: `Kill switch disengaged by user ${req.user!.email}`,
    });

    broadcastKillSwitchUpdate(req.user!.id, { isEngaged: false });

    await logAuditEvent({
      userId: req.user!.id,
      eventType: "kill_switch_disengaged",
      entityType: "kill_switch",
      payload: { disengagedAt: new Date() },
    });

    res.json({
      success: true,
      isEngaged: false,
      message: "Kill switch disengaged. Normal trading controls restored.",
      state,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get current kill switch status
killSwitchRouter.get("/kill-switch/status", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const state = await KillSwitchState.findOne({ userId: req.user!.id });
    res.json({
      isEngaged: state?.isEngaged ?? false,
      engagedAt: state?.engagedAt ?? null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
