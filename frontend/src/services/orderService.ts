import { api } from "./api";

export interface OrderItem {
  id: string;
  proposalId?: string;
  brokerOrderId?: string;
  ticker: string;
  side: "buy" | "sell";
  quantity: number;
  qty?: number; // mapped alias
  orderType: string;
  type?: string; // mapped alias
  isPaper: boolean;
  status: string;
  filledAvgPrice?: number;
  price?: number; // mapped alias
  pnl?: number | null;
  submittedAt: string;
  time?: string; // mapped alias
  updatedAt?: string;
}

function normalizeOrder(o: any): OrderItem {
  const dateStr = o.submittedAt ? new Date(o.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now";
  return {
    ...o,
    id: o.id || o._id,
    qty: o.quantity ?? o.qty,
    type: o.orderType ?? o.type ?? "market",
    price: o.filledAvgPrice ?? o.price ?? 150.0,
    time: dateStr,
  };
}

export const orderService = {
  getOrders: async (limit: number = 50): Promise<OrderItem[]> => {
    const list = await api.get<any[]>(`/orders?limit=${limit}`);
    return list.map(normalizeOrder);
  },

  getOrderById: async (id: string): Promise<OrderItem> => {
    const item = await api.get<any>(`/orders/${id}`);
    return normalizeOrder(item);
  },
};
