import { create } from 'zustand';
import { killSwitchService } from '../services/killSwitchService';
import { getSocket } from '../services/socket';

interface KillSwitchState {
  isEngaged: boolean;
  isLoading: boolean;
  reason: string | null;
  engagedAt: string | null;
  init: () => Promise<void>;
  engage: (reason?: string) => Promise<void>;
  disengage: () => Promise<void>;
  toggle: () => Promise<void>;
}

export const useKillSwitchStore = create<KillSwitchState>((set, get) => ({
  isEngaged: false,
  isLoading: false,
  reason: null,
  engagedAt: null,

  init: async () => {
    try {
      const status = await killSwitchService.getStatus();
      set({
        isEngaged: status.isEngaged,
        reason: status.reason || null,
        engagedAt: status.engagedAt || null,
      });

      // Hook up real-time WebSocket listener
      const socket = getSocket();
      socket.off("kill_switch:update"); // avoid duplicate listeners
      socket.on("kill_switch:update", (data: { isEngaged: boolean; reason?: string; engagedAt?: string }) => {
        console.log("[KillSwitchStore] WebSocket update received:", data);
        set({
          isEngaged: data.isEngaged,
          reason: data.reason || null,
          engagedAt: data.engagedAt || null,
        });
      });
    } catch (err) {
      console.warn("[KillSwitchStore] Failed to load initial status:", err);
    }
  },

  engage: async (reason: string = "Manual emergency halt triggered") => {
    set({ isLoading: true });
    try {
      const res = await killSwitchService.engage(reason);
      set({
        isEngaged: true,
        reason: res.reason || reason,
        engagedAt: res.engagedAt || new Date().toISOString(),
        isLoading: false,
      });
    } catch (err: any) {
      set({ isLoading: false });
      throw err;
    }
  },

  disengage: async () => {
    set({ isLoading: true });
    try {
      await killSwitchService.disengage();
      set({
        isEngaged: false,
        reason: null,
        engagedAt: null,
        isLoading: false,
      });
    } catch (err: any) {
      set({ isLoading: false });
      throw err;
    }
  },

  toggle: async () => {
    const { isEngaged, engage, disengage } = get();
    if (isEngaged) {
      await disengage();
    } else {
      await engage();
    }
  },
}));
