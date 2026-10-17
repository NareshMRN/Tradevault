import { api } from "./api";

export interface TradeProposalItem {
  id: string;
  runId?: string;
  userId: string;
  ticker: string;
  action: "buy" | "sell";
  suggestedQuantity?: number;
  suggestedQty?: number;
  suggestedSizePct?: number;
  confidence: number;
  status: "pending" | "approved" | "rejected" | "expired";
  price?: number;
  horizon?: string;
  rationale?: string;
  bullArgs?: string[];
  bearArgs?: string[];
  reviewedAt?: string;
  createdAt: string;
}

export const proposalService = {
  getProposals: async (status?: string): Promise<TradeProposalItem[]> => {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    return api.get<TradeProposalItem[]>(`/proposals${query}`);
  },

  approveProposal: async (id: string) => {
    return api.post<{ success: boolean; message: string; order: any }>(`/proposals/${id}/approve`);
  },

  rejectProposal: async (id: string) => {
    return api.post<{ success: boolean; message: string; proposal: any }>(`/proposals/${id}/reject`);
  },

  adjustProposal: async (id: string, quantity: number) => {
    return api.patch<TradeProposalItem>(`/proposals/${id}/adjust`, { quantity });
  },
};
