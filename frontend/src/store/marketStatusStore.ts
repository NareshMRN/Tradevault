import { create } from 'zustand';
import { marketService, type MarketStatus, getDemoStateFromUrl } from '../services/marketService';

interface MarketStatusState {
  status: MarketStatus | null;
  isLoading: boolean;
  demoOverride: string | null;
  secondsLeft: number;
  fetchStatus: (override?: string | null) => Promise<MarketStatus | null>;
  setDemoOverride: (override: string | null) => void;
  decrementCountdown: () => void;
}

export const useMarketStatusStore = create<MarketStatusState>((set, get) => ({
  status: null,
  isLoading: false,
  demoOverride: getDemoStateFromUrl(),
  secondsLeft: 0,

  fetchStatus: async (override?: string | null) => {
    const effectiveDemo = override !== undefined ? override : get().demoOverride;
    try {
      const data = await marketService.getMarketStatus(effectiveDemo || undefined);
      set({
        status: data,
        secondsLeft: data.seconds_to_next_open || 0,
        isLoading: false,
      });
      return data;
    } catch (err) {
      console.warn('[MarketStatusStore] Error fetching market status:', err);
      return null;
    }
  },

  setDemoOverride: (override: string | null) => {
    set({ demoOverride: override });
    get().fetchStatus(override);
  },

  decrementCountdown: () => {
    set((state) => ({
      secondsLeft: Math.max(0, state.secondsLeft - 1),
    }));
  },
}));
