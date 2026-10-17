import { Router, Request, Response } from "express";
import { Order } from "../db/models";
import { requireAuth } from "../middleware/auth";
import { PaperTradingService } from "../services/paperTradingService";

export const ordersRouter = Router();

// List user's orders (supports both DB orders and in-memory PaperTradingService orders)
ordersRouter.get("/orders", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    let dbOrders: any[] = [];
    try {
      dbOrders = await Order.find({ userId: req.user!.id }).sort({ submittedAt: -1 });
    } catch (e) {
      dbOrders = [];
    }

    const paperOrders = PaperTradingService.getOrders(req.user!.id);

    if (dbOrders.length > 0) {
      res.json(dbOrders);
    } else {
      res.json(paperOrders);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get order details by ID
ordersRouter.get("/orders/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    let order: any = null;
    try {
      order = await Order.findOne({ _id: req.params.id, userId: req.user!.id });
    } catch (e) {
      order = null;
    }

    if (!order) {
      const paperOrders = PaperTradingService.getOrders(req.user!.id);
      order = paperOrders.find((o) => o.orderId === req.params.id) || null;
    }

    if (!order) {
      res.status(404).json({ error: "Order not found." });
      return;
    }
    res.json(order);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
