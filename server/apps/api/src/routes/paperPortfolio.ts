import { Router, Request, Response } from "express";
import { optionalAuth } from "../middleware/auth";
import { PaperTradingService } from "../services/paperTradingService";
import { paperOrderRequestSchema } from "@confluence/shared-schemas";

export const paperPortfolioRouter = Router();

function getUserId(req: Request): string {
  return req.user?.id || "demo-user-default";
}

/**
 * GET /api/paper-portfolio
 * Returns portfolio summary with real-time mark-to-market valuations in INR.
 */
paperPortfolioRouter.get("/paper-portfolio", optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    const summary = await PaperTradingService.getSummary(userId);
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch portfolio summary" });
  }
});

/**
 * GET /api/paper-portfolio/positions
 * Returns all active holdings with real-time prices, sector tags, and unrealized PnL.
 */
paperPortfolioRouter.get("/paper-portfolio/positions", optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    const positions = await PaperTradingService.getPositions(userId);
    res.json({ positions });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch active positions" });
  }
});

/**
 * POST /api/paper-portfolio/orders
 * Submits a new virtual paper trade (market or limit) in INR.
 */
paperPortfolioRouter.post("/paper-portfolio/orders", optionalAuth, async (req: Request, res: Response): Promise<void> => {
  const parsed = paperOrderRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid order parameters", details: parsed.error.issues });
    return;
  }

  try {
    const userId = getUserId(req);
    const order = await PaperTradingService.executeOrder(userId, parsed.data);
    const summary = await PaperTradingService.getSummary(userId);
    res.status(201).json({
      order,
      summary,
      message: `Successfully executed paper ${order.side.toUpperCase()} for ${order.quantity} shares of ${order.ticker} at ₹${order.executedPrice}.`,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to execute paper order" });
  }
});

/**
 * GET /api/paper-portfolio/orders
 * Returns historical filled and rejected paper orders.
 */
paperPortfolioRouter.get("/paper-portfolio/orders", optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    const orders = PaperTradingService.getOrders(userId);
    res.json({ orders });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch orders" });
  }
});

/**
 * POST /api/paper-portfolio/reset
 * Resets user's virtual capital back to default ₹10,00,000 INR.
 */
paperPortfolioRouter.post("/paper-portfolio/reset", optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    const initialCapital = Number(req.body?.initialCapital) || 1000000.0;
    PaperTradingService.resetPortfolio(userId, initialCapital);
    const summary = await PaperTradingService.getSummary(userId);
    res.json({
      message: `Portfolio reset successfully to ₹${initialCapital.toLocaleString("en-IN")} INR.`,
      summary,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to reset portfolio" });
  }
});
