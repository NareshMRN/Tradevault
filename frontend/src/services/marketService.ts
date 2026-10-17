import { api } from "./api";

export interface StockQuote {
  ticker: string;
  companyName: string;
  currency: string;
  price: number;
  previousClose: number;
  change: number;
  changePct: number;
  rsi: number;
  macd: number;
  sma50: number;
  volatility: string;
  chartData: { time: string; value: number }[];
  marketDepth?: {
    bids?: { price: number; quantity: number }[];
    asks?: { price: number; quantity: number }[];
  };
  source?: string;
}

export interface MarketIndex {
  name: string;
  ticker: string;
  exchange: string;
  currency: string;
  price: number;
  change: number;
  changePct: number;
}

export interface HorizonProbability {
  up: number;
  sideways: number;
  down: number;
  confidence: number;
  expectedMovePct: number;
}

export interface PredictionResult {
  symbol: string;
  exchange: "NSE" | "BSE";
  companyName: string;
  timestamps: {
    market_data_at: string;
    news_data_at: string;
    analysis_generated_at: string;
    historical_data_until: string;
  };
  market_snapshot: {
    price: number;
    change: number;
    changePct: number;
    open: number;
    high: number;
    low: number;
    volume: number;
    currency: string;
    source: string;
  };
  technical: {
    indicators: {
      rsi: number;
      macd: { macd: number; signal: number; histogram: number; trend: string };
      ema20: number;
      ema50: number;
      ema200: number;
      atr: number;
      support: number;
      resistance: number;
      trend: string;
      signals: string[];
    };
    agent: {
      direction: string;
      score: number;
      confidence: number;
      signals: string[];
      risks: string[];
      reasoning_summary: string;
      provider: string;
      model: string;
    };
  };
  fundamental: {
    ratios: {
      peRatio: number;
      roePct: number;
      debtToEquity: number;
      operatingMarginPct: number;
      revenueGrowthYoY: number;
      valuation: string;
      financialHealth: string;
    };
    agent: {
      score: number;
      confidence: number;
      growth: string;
      valuation: string;
      financial_health: string;
      risks: string[];
      reasoning_summary: string;
      provider: string;
      model: string;
    };
  };
  sentiment: {
    news_count: number;
    agent: {
      sentiment: string;
      score: number;
      confidence: number;
      positive_events: string[];
      negative_events: string[];
      catalysts: string[];
      reasoning_summary: string;
      provider: string;
      model: string;
    };
  };
  risk: {
    metrics: {
      beta: number;
      var95: number;
      maxDrawdown: number;
      riskLevel: string;
    };
    agent: {
      risk_score: number;
      risk_level: string;
      confidence: number;
      risks: string[];
      reasoning_summary: string;
      provider: string;
      model: string;
    };
  };
  historical: {
    analysis: {
      returns: { "1m": number; "3m": number; "1y": number; "3y_cagr": number };
      volatility: number;
      max_drawdown: number;
    };
    patterns: {
      samples: number;
      "1d_positive_rate": number;
      "5d_positive_rate": number;
      "10d_positive_rate": number;
      "20d_positive_rate": number;
    };
    regime: {
      regime: string;
      label: string;
      summary: string;
    };
  };
  verification: {
    agreement_score: number;
    conflicts: string[];
    warnings: string[];
    verification_score: number;
    reasoning_summary: string;
    provider: string;
    model: string;
  };
  fusion: {
    raw_weighted_score: number;
    risk_adjusted_score: number;
    direction: string;
    active_weights: Record<string, number>;
  };
  confidence: {
    overall_confidence: number;
    sample_size_factor: number;
    agent_agreement_factor: number;
    data_freshness_factor: number;
    verification_factor: number;
    rationale: string;
  };
  horizons: {
    "1d": HorizonProbability;
    "5d": HorizonProbability;
    "1m": HorizonProbability;
    "3m": HorizonProbability;
  };
  prediction: {
    horizon: string;
    direction: string;
    bullish_score: number;
    up_probability: number;
    sideways_probability: number;
    down_probability: number;
    confidence: number;
    action: "buy" | "sell" | "hold";
    reasoning: string;
  };
}

export interface SearchResultItem {
  symbol: string;
  cleanTicker: string;
  name: string;
  exchange: string;
  type: string;
  currency: string;
}

export const marketService = {
  searchSymbols: async (query: string): Promise<SearchResultItem[]> => {
    if (!query || !query.trim()) return [];
    try {
      const res = await api.get<{ results: SearchResultItem[] }>(`/market/search?q=${encodeURIComponent(query.trim())}`);
      return res.results || [];
    } catch {
      return [];
    }
  },
  getQuote: async (ticker: string, timeframe: string = "1M"): Promise<StockQuote> => {
    return api.get<StockQuote>(`/market/quote/${encodeURIComponent(ticker)}?timeframe=${timeframe}`);
  },
  getIndices: async (): Promise<{ indices: MarketIndex[]; asOf: string }> => {
    return api.get<{ indices: MarketIndex[]; asOf: string }>("/market/indices");
  },
  analyzePrediction: async (symbol: string, horizon: string = "5d"): Promise<PredictionResult> => {
    return api.post<PredictionResult>("/prediction/analyze", { symbol, horizon });
  },
  getLatestPrediction: async (symbol: string): Promise<PredictionResult> => {
    return api.get<PredictionResult>(`/prediction/latest/${encodeURIComponent(symbol)}`);
  },
  getPredictionHistory: async (symbol: string): Promise<any[]> => {
    return api.get<any[]>(`/prediction/history/${encodeURIComponent(symbol)}`);
  },
  runBacktest: async (symbol: string, horizonDays: number = 5): Promise<any> => {
    return api.post<any>("/prediction/backtest", { symbol, horizonDays });
  },
};
