import { create } from "zustand";
import { notificationService, type AppNotification } from "../services/notificationService";
import { requestFcmToken, onForegroundMessage } from "../lib/firebase";
import { getSocket } from "../services/socket";

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  fcmToken: string | null;
  pushPermission: NotificationPermission;
  activeToast: AppNotification | null;

  init: () => Promise<void>;
  requestPushPermission: () => Promise<boolean>;
  addNotification: (notif: AppNotification) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAll: () => Promise<void>;
  sendTest: (type: "stock" | "order", symbol?: string) => Promise<void>;
  dismissToast: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  fcmToken: null,
  pushPermission:
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "default",
  activeToast: null,

  init: async () => {
    set({ isLoading: true });
    try {
      // 1. Fetch initial notification feed
      const data = await notificationService.getNotifications();
      if (data && Array.isArray(data.notifications)) {
        set({
          notifications: data.notifications,
          unreadCount: data.unreadCount ?? data.notifications.filter((n) => !n.read).length,
        });
      }
    } catch (e: any) {
      console.warn("[NotificationStore] Error fetching notifications:", e.message);
    } finally {
      set({ isLoading: false });
    }

    // 2. Setup WebSocket live listener
    try {
      const socket = getSocket();
      socket.off("app:notification");
      socket.on("app:notification", (notif: AppNotification) => {
        get().addNotification(notif);
      });

      socket.off("order:status");
      socket.on("order:status", (order: any) => {
        const notif: AppNotification = {
          userId: order.userId || "me",
          type: "order",
          title: `Order Update: ${order.ticker || order.symbol}`,
          message: `Order #${(order.brokerOrderId || order.id || "").substring(0, 8)} status is now ${order.status}.`,
          symbol: order.ticker || order.symbol,
          read: false,
          data: order,
          createdAt: new Date().toISOString(),
        };
        get().addNotification(notif);
      });
    } catch (e: any) {
      console.warn("[NotificationStore] WebSocket setup error:", e.message);
    }

    // 3. Setup Firebase foreground listener
    try {
      onForegroundMessage((payload) => {
        const notif: AppNotification = {
          userId: "me",
          type: (payload.data?.type as any) || "stock",
          title: payload.notification?.title || payload.data?.title || "TradeVault Alert",
          message: payload.notification?.body || payload.data?.body || "New market update received.",
          symbol: payload.data?.symbol,
          read: false,
          data: payload.data,
          createdAt: new Date().toISOString(),
        };
        get().addNotification(notif);
      });
    } catch (e: any) {
      console.warn("[NotificationStore] FCM foreground listener error:", e.message);
    }

    // 4. If permission was already granted in browser, refresh FCM token
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        const token = await requestFcmToken();
        if (token) {
          set({ fcmToken: token });
          await notificationService.registerFcmToken(token);
        }
      } catch (e) {}
    }
  },

  requestPushPermission: async () => {
    try {
      const token = await requestFcmToken();
      const permission =
        typeof window !== "undefined" && "Notification" in window
          ? Notification.permission
          : "default";
      set({ pushPermission: permission });

      if (token) {
        set({ fcmToken: token });
        await notificationService.registerFcmToken(token);
        return true;
      }
      return false;
    } catch (err: any) {
      console.error("[NotificationStore] Permission request error:", err);
      return false;
    }
  },

  addNotification: (notif: AppNotification) => {
    set((state) => {
      const existing = state.notifications.find(
        (n) => (n._id && n._id === notif._id) || (n.id && n.id === notif.id)
      );
      if (existing) return state;

      const updated = [notif, ...state.notifications];
      return {
        notifications: updated,
        unreadCount: state.unreadCount + 1,
        activeToast: notif,
      };
    });

    // Auto-dismiss in-app toast after 6 seconds
    setTimeout(() => {
      const current = get().activeToast;
      if (current && (current._id === notif._id || current.title === notif.title)) {
        set({ activeToast: null });
      }
    }, 6000);
  },

  markAsRead: async (id: string) => {
    set((state) => {
      const updated = state.notifications.map((n) =>
        (n._id === id || n.id === id) ? { ...n, read: true } : n
      );
      const unread = updated.filter((n) => !n.read).length;
      return { notifications: updated, unreadCount: unread };
    });

    try {
      await notificationService.markAsRead(id);
    } catch (e: any) {
      console.warn("[NotificationStore] markAsRead error:", e.message);
    }
  },

  markAllAsRead: async () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));

    try {
      await notificationService.markAllAsRead();
    } catch (e: any) {
      console.warn("[NotificationStore] markAllAsRead error:", e.message);
    }
  },

  clearAll: async () => {
    set({ notifications: [], unreadCount: 0, activeToast: null });
    try {
      await notificationService.clearAll();
    } catch (e: any) {
      console.warn("[NotificationStore] clearAll error:", e.message);
    }
  },

  sendTest: async (type: "stock" | "order", symbol = "RELIANCE") => {
    try {
      const res = await notificationService.sendTestNotification(type, symbol);
      if (res?.notification) {
        get().addNotification(res.notification);
      }
    } catch (err: any) {
      // In-memory / offline fallback
      const notif: AppNotification = {
        userId: "me",
        type,
        title:
          type === "stock"
            ? `Stock Alert: ${symbol} SURGE (+4.85%)`
            : `Order Executed: BUY 25 ${symbol} @ ₹2,980.50`,
        message:
          type === "stock"
            ? `${symbol} broke above key resistance ₹2,950 with heavy institutional volume (+32% vs 20d avg).`
            : `Paper trade order for 25 shares of ${symbol} filled at ₹2,980.50. Risk checks passed.`,
        symbol,
        read: false,
        createdAt: new Date().toISOString(),
      };
      get().addNotification(notif);
    }
  },

  dismissToast: () => {
    set({ activeToast: null });
  },
}));
