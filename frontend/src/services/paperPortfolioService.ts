import { api } from './api';

export interface PaperPosition {
  symbol: string;
  companyName?: string;
  quantity: number;
  averageEntryPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  lastUpdated: string;
}

export interface PaperOrder {
  id: string;
  userId: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  executedPrice: number;
  totalValue: number;
  status: 'FILLED' | 'REJECTED' | 'CANCELLED';
  reason?: string;
  executedAt: string;
  proposalId?: string;
}

export interface PaperPortfolioSummary {
  totalCapital: number;
  availableCash: number;
  investedCapital: number;
  currentValue: number;
  totalPnL: number;
  totalPnLPercent: number;
  realizedPnL: number;
  unrealizedPnL: number;
  winRate: number;
  tradesCount: number;
  currency: string;
  positions: PaperPosition[];
  recentOrders: PaperOrder[];
}

export interface PaperOrderRequest {
  symbol: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  orderType?: 'MARKET' | 'LIMIT';
  limitPrice?: number;
  proposalId?: string;
}

export const paperPortfolioService = {
  getPortfolio: async (): Promise<PaperPortfolioSummary> => {
    return api.get<PaperPortfolioSummary>('/paper-portfolio');
  },

  getPositions: async (): Promise<PaperPosition[]> => {
    const res = await api.get<{ positions: PaperPosition[] }>('/paper-portfolio/positions');
    return res.positions || [];
  },

  getOrders: async (): Promise<PaperOrder[]> => {
    const res = await api.get<{ orders: PaperOrder[] }>('/paper-portfolio/orders');
    return res.orders || [];
  },

  executeOrder: async (order: PaperOrderRequest): Promise<{ success: boolean; message: string; order: PaperOrder }> => {
    return api.post<{ success: boolean; message: string; order: PaperOrder }>('/paper-portfolio/order', order);
  },

  resetPortfolio: async (): Promise<{ success: boolean; message: string; summary: PaperPortfolioSummary }> => {
    return api.post<{ success: boolean; message: string; summary: PaperPortfolioSummary }>('/paper-portfolio/reset');
  },
};
