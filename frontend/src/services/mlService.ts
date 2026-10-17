import { api } from './api';
import { getDemoStateFromUrl, type MarketStatus } from './marketService';

export interface MLDriver {
  feature: string;
  value: number;
  contribution: number;
  description: string;
}

export interface MLPick {
  symbol: string;
  full_ticker: string;
  sector: string;
  score: number;
  raw_score: number;
  threshold: number;
  price: number;
  price_label?: string;
  top_drivers: MLDriver[];
  explanation: string;
}

export interface SessionReviewPick {
  symbol: string;
  open_price: number;
  close_price: number;
  stock_return: number;
  nifty_return: number;
  excess_return: number;
  hit: boolean;
  beat_nifty?: boolean;
}

export interface SessionReview {
  session_date: string;
  hit_rate: number;
  avg_excess_return: number;
  nifty_return: number;
  total_evaluated: number;
  per_pick: SessionReviewPick[];
}

export interface MLMetrics {
  base_rate: number;
  threshold: number;
  n_test_rows: number;
  n_picks: number;
  precision_at_threshold: number;
  lift_over_base_rate: number;
  avg_picks_per_day: number;
  top5_daily_hit_rate: number;
  top5_avg_excess_return_after_costs: number;
  train_date_range: [string, string];
  val_date_range: [string, string];
  test_date_range: [string, string];
  baseline_model: {
    name: string;
    test_auc: number;
    test_accuracy: number;
  };
  lgbm_test_auc: number;
  feature_importances: Record<string, number>;
  limitations: string[];
}

export interface MLPicksResponse {
  generated_at: string;
  session_date?: string;
  for_session_date?: string;
  stale?: boolean;
  data_source: string;
  threshold: number;
  base_rate: number;
  total_screened: number;
  passed_threshold_count: number;
  picks: MLPick[];
  top_candidates?: MLPick[];
  review?: SessionReview | null;
  market_status?: MarketStatus;
  status?: string;
  message?: string;
}

export const mlService = {
  getPicks: async (demoStateOverride?: string): Promise<MLPicksResponse> => {
    const demo = demoStateOverride || getDemoStateFromUrl();
    const query = demo ? `?demoState=${encodeURIComponent(demo)}` : '';
    return api.get<MLPicksResponse>(`/ml/picks${query}`);
  },

  getMetrics: async (): Promise<MLMetrics> => {
    return api.get<MLMetrics>('/ml/metrics');
  },

  runScreening: async (demoStateOverride?: string): Promise<MLPicksResponse> => {
    const demo = demoStateOverride || getDemoStateFromUrl();
    const query = demo ? `?demoState=${encodeURIComponent(demo)}` : '';
    return api.post<MLPicksResponse>(`/ml/run${query}`);
  },
};

