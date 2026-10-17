import { api, setApiToken } from "./api";

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: "user" | "admin";
}

export interface AuthResponse {
  user: UserProfile;
  token?: string;
}

export interface MeResponse {
  user: UserProfile;
  riskProfile: any;
  killSwitchEngaged: boolean;
}

export const authService = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>("/auth/login", { email, password });
    if (res.token) setApiToken(res.token);
    return res;
  },

  register: async (displayName: string, email: string, password: string): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>("/auth/register", { displayName, email, password });
    if (res.token) setApiToken(res.token);
    return res;
  },

  logout: async (): Promise<void> => {
    await api.post("/auth/logout");
    setApiToken(null);
  },

  getMe: async (): Promise<MeResponse> => {
    return api.get<MeResponse>("/auth/me");
  },

  googleLogin: async (idToken: string, displayName?: string): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>("/auth/google", { idToken, displayName });
    if (res.token) setApiToken(res.token);
    return res;
  },
};
