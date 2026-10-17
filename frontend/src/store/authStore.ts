import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService, type UserProfile } from '../services/authService';
import { setApiToken } from '../services/api';

export interface UserState {
  id: string;
  name: string;
  email: string;
  role?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserState | null;
  riskProfile: any | null;
  checkAuth: () => Promise<boolean>;
  setUser: (user: UserProfile, riskProfile?: any) => void;
  login: (name: string, email: string) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      isLoading: true,
      user: null,
      riskProfile: null,

      checkAuth: async () => {
        set({ isLoading: true });
        try {
          const res = await authService.getMe();
          if (res?.user) {
            set({
              isAuthenticated: true,
              isLoading: false,
              user: {
                id: res.user.id,
                name: res.user.displayName || res.user.email.split('@')[0],
                email: res.user.email,
                role: res.user.role,
              },
              riskProfile: res.riskProfile || null,
            });
            return true;
          }
        } catch {
          // Cookie expired or unauthenticated
        }
        set({ isAuthenticated: false, isLoading: false, user: null, riskProfile: null });
        return false;
      },

      setUser: (user: UserProfile, riskProfile?: any) => {
        set({
          isAuthenticated: true,
          isLoading: false,
          user: {
            id: user.id,
            name: user.displayName || user.email.split('@')[0],
            email: user.email,
            role: user.role,
          },
          riskProfile: riskProfile || null,
        });
      },

      login: (name: string, email: string) => {
        set({
          isAuthenticated: true,
          isLoading: false,
          user: { id: 'temp-id', name, email },
        });
      },

      logout: async () => {
        try {
          await authService.logout();
        } catch {
          // Even if server request fails, clear local state
        }
        setApiToken(null);
        set({ isAuthenticated: false, isLoading: false, user: null, riskProfile: null });
      },
    }),
    {
      name: 'tradevault-auth',
      partialize: (state) => ({ isAuthenticated: state.isAuthenticated, user: state.user }),
    }
  )
);
