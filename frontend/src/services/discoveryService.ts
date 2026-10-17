import { api } from './api';

export interface SectorScore {
  sector: string;
  stocksCount: number;
  return5d: number;
  return20d: number;
  return60d: number;
  volumeTrend: number;
  volatility: number;
  relativeStrength: number;
  momentumScore: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  dataSource?: 'live' | 'cache' | 'sample';
}

export interface StockPick {
  symbol: string;
  companyName: string;
  sector: string;
  marketCap: 'large' | 'mid' | 'small';
  price: number;
  momentumScore: number;
  volumeTrend: number;
  volatility: number;
  signals: string[];
  aiAnalysis?: {
    recommendation: 'strong_buy' | 'buy' | 'hold' | 'reduce' | 'avoid';
    confidence: number;
    targetPrice?: number;
    stopLoss?: number;
    rationale?: string;
    bullishPoints?: string[];
    riskPoints?: string[];
    geminiGroqAgreement?: number;
    divergenceFlag?: boolean;
    agreementStatus?: 'agree' | 'partially_agree' | 'disagree';
    agreementSentence?: string;
    llmSource?: string;
  };
  forecast?: {
    p10: number;
    p50: number;
    p90: number;
  };
  dataSource?: 'live' | 'cache' | 'sample';
}

export interface DiscoveryScanResult {
  timestamp: string;
  sectors: SectorScore[];
  topPicks: StockPick[];
  benchmarkReturn20d: number;
  riskProfile: 'conservative' | 'balanced' | 'aggressive';
  dataSource: 'live' | 'cache' | 'sample';
}

export const discoveryService = {
  getSectors: async (): Promise<SectorScore[]> => {
    const res = await api.get<{ sectors: SectorScore[]; timestamp: string }>('/discovery/sectors');
    return res.sectors || [];
  },

  getTopPicks: async (riskProfile: string = 'balanced', sector?: string, language: string = 'en'): Promise<StockPick[]> => {
    let url = `/discovery/picks?risk_profile=${encodeURIComponent(riskProfile)}&language=${encodeURIComponent(language)}`;
    if (sector && sector !== 'all') {
      url += `&sector=${encodeURIComponent(sector)}`;
    }
    const res = await api.get<{ topPicks: StockPick[]; riskProfile: string }>('/discovery/picks' + (url.includes('?') ? url.substring(url.indexOf('?')) : ''));
    return res.topPicks || [];
  },

  getLatestScan: async (): Promise<DiscoveryScanResult | null> => {
    try {
      const res = await api.get<DiscoveryScanResult>('/discovery/latest');
      return res;
    } catch {
      return null;
    }
  },

  runScan: async (riskProfile: string = 'balanced', language: string = 'en'): Promise<DiscoveryScanResult> => {
    const res = await api.post<DiscoveryScanResult>('/discovery/run', {
      riskProfile,
      language,
    });
    return res;
  },
};
