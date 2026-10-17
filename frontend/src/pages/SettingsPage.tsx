import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { ShieldAlert, Bell, Loader2, CheckCircle2 } from 'lucide-react';
import { onboardingService, type RiskProfile } from '@/services/onboardingService';

// Default notification preferences
const DEFAULT_NOTIFICATIONS = [
  { key: 'trade_proposal', label: 'New AI trade proposal awaiting review', enabled: true },
  { key: 'risk_veto', label: 'Risk Manager veto alert triggered', enabled: true },
  { key: 'order_fill', label: 'Order execution & fill notification', enabled: true },
  { key: 'daily_summary', label: 'Daily portfolio factor attribution summary', enabled: false },
  { key: 'watchlist_alert', label: 'Watchlist price movement alerts (±5%)', enabled: false },
  { key: 'backtest_complete', label: 'Backtest completed notification', enabled: true },
];

function getTabFromPath(pathname: string): 'risk' | 'notifications' {
  if (pathname.includes('notifications')) return 'notifications';
  return 'risk';
}

export function SettingsPage() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'risk' | 'notifications'>(() => getTabFromPath(location.pathname));
  const [feedback, setFeedback] = useState<string | null>(null);

  // Sync tab with URL when navigating
  useEffect(() => {
    setActiveTab(getTabFromPath(location.pathname));
  }, [location.pathname]);

  // Load Risk Profile
  const { data: riskProfile } = useQuery<RiskProfile>({
    queryKey: ['risk-profile'],
    queryFn: onboardingService.getRiskProfile,
  });

  const [riskCategory, setRiskCategory] = useState<'conservative' | 'balanced' | 'aggressive'>('balanced');
  const [capital, setCapital] = useState('10000');
  const [maxPos, setMaxPos] = useState('10');
  const [maxLoss, setMaxLoss] = useState('3');

  useEffect(() => {
    if (riskProfile) {
      setRiskCategory(riskProfile.riskCategory || 'balanced');
      setCapital(riskProfile.allocatableCapital?.toString() || '10000');
      setMaxPos(riskProfile.maxPositionPct?.toString() || '10');
      setMaxLoss(riskProfile.maxDailyLossPct?.toString() || '3');
    }
  }, [riskProfile]);

  const updateRiskMutation = useMutation({
    mutationFn: (data: Partial<RiskProfile>) => onboardingService.updateRiskProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-profile'] });
      setFeedback('Risk profile parameters updated successfully.');
      setTimeout(() => setFeedback(null), 4000);
    },
    onError: (err: any) => {
      alert(`Error updating risk profile: ${err?.message || 'Failed'}`);
    },
  });

  const handleSaveRisk = (e: React.FormEvent) => {
    e.preventDefault();
    updateRiskMutation.mutate({
      riskCategory,
      allocatableCapital: parseFloat(capital),
      maxPositionPct: parseFloat(maxPos),
      maxDailyLossPct: parseFloat(maxLoss),
    });
  };

  // Notification preferences state — persisted in localStorage
  const [notifEmail, setNotifEmail] = useState(() => {
    try { return localStorage.getItem('tradevault_notif_email') || ''; } catch { return ''; }
  });
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('tradevault_notif_prefs');
      if (saved) return JSON.parse(saved);
    } catch {}
    const defaults: Record<string, boolean> = {};
    DEFAULT_NOTIFICATIONS.forEach((n) => { defaults[n.key] = n.enabled; });
    return defaults;
  });

  const handleToggleNotif = (key: string) => {
    setNotifPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveNotifications = () => {
    try {
      localStorage.setItem('tradevault_notif_email', notifEmail);
      localStorage.setItem('tradevault_notif_prefs', JSON.stringify(notifPrefs));
    } catch {}
    setFeedback('Notification preferences saved successfully.');
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="space-y-6 max-w-[900px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage risk profiles, broker parameters, and notification alerts</p>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          {feedback}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-0">
        {[
          { id: 'risk', label: 'Risk Profile', icon: ShieldAlert },
          { id: 'notifications', label: 'Notifications', icon: Bell },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Risk Profile Tab */}
      {activeTab === 'risk' && (
        <div className="bg-white border border-border rounded-xl p-6 shadow-sm space-y-6">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-indigo-600" /> Quantitative Risk Constraints
          </h2>

          <form onSubmit={handleSaveRisk} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Risk Category</label>
                <select
                  value={riskCategory}
                  onChange={(e) => setRiskCategory(e.target.value as any)}
                  className="w-full bg-white border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="balanced">Balanced</option>
                  <option value="conservative">Conservative</option>
                  <option value="aggressive">Aggressive</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Allocatable Capital (₹ INR)</label>
                <input
                  type="number"
                  min="1000"
                  value={capital}
                  onChange={(e) => setCapital(e.target.value)}
                  className="w-full bg-white border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Max Position Size (%)</label>
                <input
                  type="number"
                  min="1"
                  max="25"
                  value={maxPos}
                  onChange={(e) => setMaxPos(e.target.value)}
                  className="w-full bg-white border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Max Daily Loss (%)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={maxLoss}
                  onChange={(e) => setMaxLoss(e.target.value)}
                  className="w-full bg-white border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={updateRiskMutation.isPending}
              className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg font-semibold text-sm transition-colors shadow-sm flex items-center gap-2"
            >
              {updateRiskMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Risk Profile
            </button>
          </form>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="bg-white border border-border rounded-xl p-6 shadow-sm space-y-6">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Bell className="h-5 w-5 text-indigo-600" /> Notifications & Alerts
          </h2>

          {/* Notification Email */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Notification Email</label>
            <input
              type="email"
              value={notifEmail}
              onChange={(e) => setNotifEmail(e.target.value)}
              placeholder="trader@tradevault.ai"
              className="w-full bg-white border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Email address for receiving trade alerts, risk warnings, and daily summaries.
            </p>
          </div>

          {/* Toggle Switches */}
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground mb-3">Alert Preferences</h3>
            {DEFAULT_NOTIFICATIONS.map((n) => {
              const isOn = notifPrefs[n.key] ?? n.enabled;
              return (
                <div key={n.key} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <p className="text-sm text-slate-700">{n.label}</p>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isOn}
                    onClick={() => handleToggleNotif(n.key)}
                    className={`w-11 h-6 rounded-full relative transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${isOn ? 'bg-indigo-600' : 'bg-slate-200'}`}
                  >
                    <div className={`absolute top-1 h-4 w-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${isOn ? 'translate-x-[22px]' : 'translate-x-1'}`} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Notification frequency hint */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
            <strong>Note:</strong> Email notifications are sent in real-time for critical alerts and batched daily for summaries. Push notifications require browser permission.
          </div>

          <button
            type="button"
            onClick={handleSaveNotifications}
            className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-sm transition-colors shadow-sm flex items-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            Save Preferences
          </button>
        </div>
      )}
    </div>
  );
}
