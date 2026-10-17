import { Router, Request, Response } from "express";
import { Order } from "../db/models";
import { requireAuth } from "../middleware/auth";

export const ordersRouter = Router();

// List user's orders
ordersRouter.get("/orders", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const orders = await Order.find({ userId: req.user!.id }).sort({ submittedAt: -1 });
    res.json(orders);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get order details by ID
ordersRouter.get("/orders/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await Order.findOne({ _id: req.params.id, userId: req.user!.id });
    if (!order) {
      res.status(404).json({ error: "Order not found." });
      return;
    }
    res.json(order);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
