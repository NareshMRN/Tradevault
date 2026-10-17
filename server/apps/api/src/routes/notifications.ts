import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import { User, Notification } from "../db/models";
import { inMemoryStore } from "../db/inMemoryStore";
import { requireAuth } from "../middleware/auth";
import { dispatchNotification } from "../services/fcmService";

export const notificationsRouter = Router();

/**
 * GET /api/notifications
 * Retrieves notifications for the authenticated user.
 */
notificationsRouter.get("/notifications", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const isDbReady = mongoose.connection.readyState === 1;

    if (isDbReady) {
      const notifications = await Notification.find({ userId: new mongoose.Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .limit(50);
      const unreadCount = await Notification.countDocuments({
        userId: new mongoose.Types.ObjectId(userId),
        read: false,
      });

      res.json({
        notifications,
        unreadCount,
      });
    } else {
      const notifications = inMemoryStore.getNotifications(userId);
      const unreadCount = notifications.filter((n) => !n.read).length;

      res.json({
        notifications,
        unreadCount,
      });
    }
  } catch (err: any) {
    console.error("[Notifications.list] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/notifications/fcm-token
 * Registers an FCM push token for the user.
 */
notificationsRouter.post("/notifications/fcm-token", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== "string") {
      res.status(400).json({ error: "Missing required string field: token" });
      return;
    }

    const userId = req.user!.id;
    const isDbReady = mongoose.connection.readyState === 1;

    if (isDbReady) {
      await User.findByIdAndUpdate(userId, {
        $addToSet: { fcmTokens: token },
      });
    } else {
      inMemoryStore.addFcmToken(userId, token);
    }

    res.json({ success: true, message: "FCM token registered successfully." });
  } catch (err: any) {
    console.error("[Notifications.fcmToken] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Marks a notification as read.
 */
notificationsRouter.patch("/notifications/:id/read", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;
    const isDbReady = mongoose.connection.readyState === 1;

    if (isDbReady) {
      await Notification.findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(id), userId: new mongoose.Types.ObjectId(userId) },
        { read: true }
      );
    } else {
      inMemoryStore.markNotificationRead(userId, id);
    }

    res.json({ success: true, message: "Notification marked as read." });
  } catch (err: any) {
    console.error("[Notifications.read] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/notifications/read-all
 * Marks all notifications for the user as read.
 */
notificationsRouter.post("/notifications/read-all", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const isDbReady = mongoose.connection.readyState === 1;

    if (isDbReady) {
      await Notification.updateMany(
        { userId: new mongoose.Types.ObjectId(userId), read: false },
        { read: true }
      );
    } else {
      inMemoryStore.markAllNotificationsRead(userId);
    }

    res.json({ success: true, message: "All notifications marked as read." });
  } catch (err: any) {
    console.error("[Notifications.readAll] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/notifications/clear
 * Clears all notifications for the user.
 */
notificationsRouter.delete("/notifications/clear", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const isDbReady = mongoose.connection.readyState === 1;

    if (isDbReady) {
      await Notification.deleteMany({ userId: new mongoose.Types.ObjectId(userId) });
    } else {
      inMemoryStore.clearNotifications(userId);
    }

    res.json({ success: true, message: "All notifications cleared." });
  } catch (err: any) {
    console.error("[Notifications.clear] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/notifications/test
 * Dispatches a simulated stock or order notification so the user can immediately test FCM & in-app alerts.
 */
notificationsRouter.post("/notifications/test", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { type = "stock", symbol = "RELIANCE" } = req.body;

    let notif;
    if (type === "order") {
      notif = await dispatchNotification({
        userId,
        type: "order",
        title: `Order Executed: BUY 25 ${symbol} @ ₹2,980.50`,
        message: `Paper trade order for 25 shares of ${symbol} was successfully filled at ₹2,980.50. Risk checks passed.`,
        symbol,
        data: { side: "BUY", qty: 25, price: 2980.5, status: "FILLED" },
      });
    } else {
      const changePct = 4.85;
      notif = await dispatchNotification({
        userId,
        type: "stock",
        title: `Stock Alert: ${symbol} SURGE (+${changePct}%)`,
        message: `${symbol} broke above key resistance ₹2,950 with heavy institutional volume (+32% vs 20d avg). Technical agent signaled Bullish momentum.`,
        symbol,
        data: { currentPrice: 2980.5, changePct },
      });
    }

    res.json({ success: true, notification: notif });
  } catch (err: any) {
    console.error("[Notifications.test] Error:", err);
    res.status(500).json({ error: err.message });
  }
});
