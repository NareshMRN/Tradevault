import { api } from "./api";

export interface CredentialSummary {
  provider: string;
  maskedKey: string;
  createdAt: string;
}

export const settingsService = {
  getCredentials: async (): Promise<CredentialSummary[]> => {
    return api.get<CredentialSummary[]>("/credentials");
  },

  saveCredential: async (provider: string, apiKey: string, apiSecret?: string) => {
    return api.post<{ success: boolean; message: string }>("/credentials", {
      provider,
      apiKey,
      apiSecret,
    });
  },

  deleteCredential: async (provider: string) => {
    return api.delete(`/credentials/${provider}`);
  },
};
