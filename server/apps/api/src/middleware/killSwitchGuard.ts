import { Request, Response, NextFunction } from "express";
import { KillSwitchState } from "../db/models";

/**
 * Middleware: Blocks trade execution if user or system kill switch is engaged.
 */
export async function requireKillSwitchDisengaged(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  try {
    const state = await KillSwitchState.findOne({ userId: req.user.id });
    if (state && state.isEngaged) {
      res.status(403).json({
        error: "Kill switch is currently ENGAGED. All order submissions and approvals are blocked.",
        engagedAt: state.engagedAt,
      });
      return;
    }
    next();
  } catch (err: any) {
    res.status(500).json({ error: "Failed to verify kill-switch status." });
  }
}
