import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldAlert, Bell, Loader2, CheckCircle2 } from 'lucide-react';
import { onboardingService, type RiskProfile } from '@/services/onboardingService';

export function SettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'risk' | 'notifications'>('risk');
  const [feedback, setFeedback] = useState<string | null>(null);

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
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Notification Email</label>
            <input
              type="email"
              placeholder="trader@confluence.ai"
              className="w-full bg-white border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <div className="space-y-3">
            {[
              { label: 'New AI trade proposal awaiting review', enabled: true },
              { label: 'Risk Manager veto alert triggered', enabled: true },
              { label: 'Kill switch engaged or disengaged', enabled: true },
              { label: 'Order execution & fill notification', enabled: true },
              { label: 'Daily portfolio factor attribution summary', enabled: false },
            ].map((n) => (
              <div key={n.label} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <p className="text-sm text-slate-700">{n.label}</p>
                <div className={`w-10 h-6 rounded-full relative cursor-pointer transition-colors ${n.enabled ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                  <div className={`absolute top-1 h-4 w-4 bg-white rounded-full shadow transition-transform ${n.enabled ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setFeedback('Notification preferences saved.');
              setTimeout(() => setFeedback(null), 3000);
            }}
            className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-sm transition-colors shadow-sm"
          >
            Save Preferences
          </button>
        </div>
      )}
    </div>
  );
}
