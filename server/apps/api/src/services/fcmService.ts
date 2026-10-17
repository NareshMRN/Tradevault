import mongoose from "mongoose";
import { User, Notification, WatchlistItem } from "../db/models";
import { inMemoryStore } from "../db/inMemoryStore";
import { sendMulticastPush } from "./firebaseAdmin";
import { getSocketServer } from "../websocket/socketServer";

export interface CreateNotificationParams {
  userId: string;
  type: "order" | "stock" | "risk" | "system";
  title: string;
  message: string;
  symbol?: string;
  data?: any;
}

/**
 * Persists an in-app notification, broadcasts it via WebSocket in real-time,
 * and delivers native background web push via Firebase FCM.
 */
export async function dispatchNotification(params: CreateNotificationParams): Promise<any> {
  const { userId, type, title, message, symbol, data } = params;
  const isDbReady = mongoose.connection.readyState === 1;

  let savedNotification: any = null;
  let tokens: string[] = [];

  if (isDbReady) {
    try {
      savedNotification = await Notification.create({
        userId: new mongoose.Types.ObjectId(userId),
        type,
        title,
        message,
        symbol,
        data,
        read: false,
      });

      const user = await User.findById(userId).select("fcmTokens");
      tokens = user?.fcmTokens || [];
    } catch (e: any) {
      console.error("[fcmService] Error persisting notification to DB:", e.message);
    }
  } else {
    // In-memory mode
    savedNotification = inMemoryStore.addNotification(userId, {
      type,
      title,
      message,
      symbol,
      data,
    });
    tokens = inMemoryStore.getFcmTokens(userId);
  }

  // 1. WebSocket Broadcast to active user sessions
  try {
    const io = getSocketServer();
    if (io) {
      io.to(`user:${userId}`).emit("app:notification", savedNotification);
    }
  } catch (wsErr: any) {
    console.warn("[fcmService] WebSocket broadcast error:", wsErr.message);
  }

  // 2. Firebase Cloud Messaging (Web Push)
  if (tokens.length > 0) {
    try {
      await sendMulticastPush(tokens, {
        title,
        body: message,
        icon: "/favicon.ico",
        data: {
          type,
          symbol: symbol || "",
          link: type === "order" ? "/orders" : type === "stock" ? "/watchlist" : "/notifications",
          notificationId: (savedNotification?._id || savedNotification?.id || "").toString(),
        },
      });
    } catch (fcmErr: any) {
      console.warn("[fcmService] FCM push dispatch error:", fcmErr.message);
    }
  }

  return savedNotification;
}

/**
 * Triggered on order events (submitted, filled, cancelled, rejected).
 */
export async function notifyOrderEvent(userId: string, order: any): Promise<void> {
  const symbol = order.symbol || order.ticker || "UNKNOWN";
  const side = (order.side || "BUY").toUpperCase();
  const status = (order.status || "FILLED").toUpperCase();
  const qty = order.qty || order.quantity || 1;
  const price = order.filledPrice || order.price || order.limitPrice || 0;

  let title = `Order ${status}: ${side} ${qty} ${symbol}`;
  let message = `Your ${side.toLowerCase()} order for ${qty} shares of ${symbol} is now ${status.toLowerCase()} at ₹${price.toLocaleString()}.`;

  if (status === "FILLED") {
    title = `Order Executed: ${side} ${qty} ${symbol} @ ₹${price}`;
    message = `Paper trade successfully executed: ${side} ${qty} ${symbol} at ₹${price}. Portfolio position updated.`;
  } else if (status === "REJECTED") {
    title = `Order Vetoed: ${symbol}`;
    message = `Order for ${symbol} was rejected by Confluence Risk Guardrails. Reason: ${order.rejectReason || "Exceeded risk boundary"}.`;
  }

  await dispatchNotification({
    userId,
    type: "order",
    title,
    message,
    symbol,
    data: { orderId: order._id || order.id, status, side, qty, price },
  });
}

/**
 * Triggered when a stock has a price swing or breakout.
 */
export async function notifyStockPriceAlert(
  symbol: string,
  currentPrice: number,
  changePct: number,
  headline?: string
): Promise<void> {
  const direction = changePct >= 0 ? "SURGE" : "DROP";
  const sign = changePct >= 0 ? "+" : "";
  const title = `Stock Alert: ${symbol} ${direction} (${sign}${changePct.toFixed(2)}%)`;
  const message = headline
    ? `${symbol} traded at ₹${currentPrice.toLocaleString()} (${sign}${changePct.toFixed(2)}%). ${headline}`
    : `${symbol} experienced a significant market movement to ₹${currentPrice.toLocaleString()} (${sign}${changePct.toFixed(2)}%). Confluence agents are re-evaluating risk models.`;

  const isDbReady = mongoose.connection.readyState === 1;

  if (isDbReady) {
    try {
      // Find all users who have this symbol in their watchlist
      const watchItems = await WatchlistItem.find({ ticker: symbol.toUpperCase() });
      const userIds = Array.from(new Set(watchItems.map((w) => w.userId.toString())));

      // If no one is watching, also notify active users
      if (userIds.length === 0) {
        const users = await User.find({}).limit(10).select("_id");
        for (const u of users) {
          await dispatchNotification({
            userId: u._id.toString(),
            type: "stock",
            title,
            message,
            symbol,
            data: { currentPrice, changePct },
          });
        }
      } else {
        for (const uid of userIds) {
          await dispatchNotification({
            userId: uid,
            type: "stock",
            title,
            message,
            symbol,
            data: { currentPrice, changePct },
          });
        }
      }
    } catch (e: any) {
      console.warn("[fcmService] Stock alert broadcast error:", e.message);
    }
  } else {
    // In-memory mode: broadcast to demo user
    await dispatchNotification({
      userId: "demo@confluence.trade",
      type: "stock",
      title,
      message,
      symbol,
      data: { currentPrice, changePct },
    });
  }
}
