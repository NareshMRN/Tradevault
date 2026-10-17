import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from './components/layout/AppShell';
import { AuthPage } from './pages/AuthPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { DashboardPage } from './pages/DashboardPage';
import { WatchlistPage } from './pages/WatchlistPage';
import { OrchestrationPage } from './pages/OrchestrationPage';
import { ProposalsPage } from './pages/ProposalsPage';
import { BacktestsPage } from './pages/BacktestsPage';
import { OrdersPage } from './pages/OrdersPage';
import { SettingsPage } from './pages/SettingsPage';
import { LandingPage } from './pages/LandingPage';
import { TermsPage } from './pages/TermsPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { RequireAuth, RedirectIfAuth } from './components/auth/RouteGuards';
import { useAuthStore } from './store/authStore';
import { useKillSwitchStore } from './store/killSwitchStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
  },
});

function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const initKillSwitch = useKillSwitchStore((s) => s.init);

  useEffect(() => {
    checkAuth();
    initKillSwitch();
  }, [checkAuth, initKillSwitch]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Landing & Policy Pages */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />

          {/* Public auth routes (redirect to dashboard if already logged in) */}
          <Route element={<RedirectIfAuth />}>
            <Route path="/login" element={<AuthPage type="login" />} />
            <Route path="/register" element={<AuthPage type="register" />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Route>

          {/* Protected routes */}
          <Route element={<RequireAuth />}>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/watchlist" element={<WatchlistPage />} />
              <Route path="/orchestration" element={<OrchestrationPage />} />
              <Route path="/proposals" element={<ProposalsPage />} />
              <Route path="/backtests" element={<BacktestsPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/settings/risk" element={<SettingsPage />} />
              <Route path="/settings/api-keys" element={<SettingsPage />} />
              <Route path="/settings/notifications" element={<SettingsPage />} />
            </Route>
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
