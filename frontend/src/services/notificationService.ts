import { api } from "./api";

export interface AppNotification {
  _id?: string;
  id?: string;
  userId: string;
  type: "order" | "stock" | "risk" | "system";
  title: string;
  message: string;
  symbol?: string;
  read: boolean;
  data?: any;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: AppNotification[];
  unreadCount: number;
}

export const notificationService = {
  getNotifications: async (): Promise<NotificationsResponse> => {
    return api.get<NotificationsResponse>("/notifications");
  },

  registerFcmToken: async (token: string): Promise<void> => {
    await api.post("/notifications/fcm-token", { token });
  },

  markAsRead: async (id: string): Promise<void> => {
    await api.patch(`/notifications/${id}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    await api.post("/notifications/read-all");
  },

  clearAll: async (): Promise<void> => {
    await api.delete("/notifications/clear");
  },

  sendTestNotification: async (type: "stock" | "order" = "stock", symbol = "RELIANCE"): Promise<any> => {
    return api.post("/notifications/test", { type, symbol });
  },
};
