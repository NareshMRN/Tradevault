import { api } from "./api";

export interface KillSwitchStatus {
  isEngaged: boolean;
  engagedAt?: string | null;
  reason?: string | null;
  updatedAt?: string;
}

export const killSwitchService = {
  getStatus: async (): Promise<KillSwitchStatus> => {
    return api.get<KillSwitchStatus>("/kill-switch/status");
  },

  engage: async (reason: string = "User activated from web console"): Promise<KillSwitchStatus> => {
    return api.post<KillSwitchStatus>("/kill-switch/engage", { reason });
  },

  disengage: async (): Promise<KillSwitchStatus> => {
    return api.post<KillSwitchStatus>("/kill-switch/disengage");
  },
};
