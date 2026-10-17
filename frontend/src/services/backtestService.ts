import { api } from "./api";

export interface BacktestItem {
  id: string;
  strategyName: string;
  name?: string; // mapped alias
  tickerUniverse: string[];
  tickers?: string[]; // mapped alias
  startDate: string;
  start?: string; // mapped alias
  endDate: string;
  end?: string; // mapped alias
  sharpeRatio?: number;
  sharpe?: number; // mapped alias
  deflatedSharpeRatio?: number;
  deflatedSharpe?: number; // mapped alias
  probabilityOfBacktestOverfitting?: number;
  pbo?: number; // mapped alias
  maxDrawdownPct?: number;
  maxDrawdown?: number; // mapped alias
  isEligibleForPaperTrading: boolean;
  eligible?: boolean; // mapped alias
  status: "pending" | "running" | "completed" | "failed";
  createdAt: string;
  completedAt?: string;
}

export interface LaunchBacktestPayload {
  strategyName: string;
  tickerUniverse: string[];
  startDate: string;
  endDate: string;
}

function normalizeBacktest(bt: any): BacktestItem {
  return {
    ...bt,
    id: bt.id || bt._id,
    name: bt.strategyName || bt.name,
    tickers: bt.tickerUniverse || bt.tickers || [],
    start: bt.startDate || bt.start,
    end: bt.endDate || bt.end,
    sharpe: bt.sharpeRatio ?? bt.sharpe,
    deflatedSharpe: bt.deflatedSharpeRatio ?? bt.deflatedSharpe,
    pbo: bt.probabilityOfBacktestOverfitting ?? bt.pbo,
    maxDrawdown: bt.maxDrawdownPct ?? bt.maxDrawdown,
    eligible: bt.isEligibleForPaperTrading ?? bt.eligible ?? false,
  };
}

export const backtestService = {
  getBacktests: async (): Promise<BacktestItem[]> => {
    const list = await api.get<any[]>("/backtests");
    return list.map(normalizeBacktest);
  },

  getBacktestById: async (id: string): Promise<BacktestItem> => {
    const item = await api.get<any>(`/backtests/${id}`);
    return normalizeBacktest(item);
  },

  launchBacktest: async (payload: LaunchBacktestPayload) => {
    return api.post<{ message: string; backtestId: string }>("/backtests", payload);
  },
};
