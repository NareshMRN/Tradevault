import { api } from "./api";

export interface WatchlistEnrichedItem {
  id: string;
  ticker: string;
  companyName?: string;
  currency?: string;
  price?: number;
  previousClose?: number;
  change?: number;
  changePct?: number;
  assetClass: "equity" | "crypto";
  createdAt: string;
  factors: {
    compositeScore: number;
    momentumScore: number;
    technicalScore: number;
  } | null;
  forecast: {
    p10: number;
    median: number;
    p90: number;
  } | null;
}

export const watchlistService = {
  getWatchlist: async (): Promise<WatchlistEnrichedItem[]> => {
    return api.get<WatchlistEnrichedItem[]>("/watchlist");
  },

  addTicker: async (ticker: string, assetClass: "equity" | "crypto" = "equity") => {
    return api.post<WatchlistEnrichedItem>("/watchlist", { ticker, assetClass });
  },

  removeTicker: async (id: string) => {
    return api.delete(`/watchlist/${id}`);
  },

  runAnalysis: async (ticker: string, horizon: "1d" | "5d" | "20d" = "5d") => {
    return api.post<{ message: string; runId: string }>("/analysis/run", { ticker, horizon });
  },
};
