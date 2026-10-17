import { api } from "./api";

export interface OnboardingPayload {
  riskCategory: "conservative" | "balanced" | "aggressive";
  allocatableCapital: number;
  maxPositionPct: number;
  maxDailyLossPct: number;
  displayName?: string;
  email?: string;
  password?: string;
}

export interface RiskProfile {
  id?: string;
  userId: string;
  riskCategory: "conservative" | "balanced" | "aggressive";
  allocatableCapital: number;
  maxPositionPct: number;
  maxDailyLossPct: number;
  liveTradingEnabled?: boolean;
}

export const onboardingService = {
  completeOnboarding: async (data: OnboardingPayload) => {
    return api.post<{ success: boolean; user: any; riskProfile: RiskProfile }>("/onboarding", data);
  },

  getRiskProfile: async (): Promise<RiskProfile> => {
    return api.get<RiskProfile>("/risk-profile");
  },

  updateRiskProfile: async (data: Partial<RiskProfile>): Promise<RiskProfile> => {
    return api.put<RiskProfile>("/risk-profile", data);
  },
};
