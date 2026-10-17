import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Key, ShieldAlert, Bell, Eye, EyeOff, Check, Loader2, CheckCircle2 } from 'lucide-react';
import { onboardingService, type RiskProfile } from '@/services/onboardingService';
import { settingsService, type CredentialSummary } from '@/services/settingsService';
import { useKillSwitchStore } from '@/store/killSwitchStore';

function MaskedKeyRow({
  label,
  provider,
  savedMaskedKey,
  placeholder,
  onSave,
  hasSecret = false,
}: {
  label: string;
  provider: string;
  savedMaskedKey?: string;
  placeholder: string;
  onSave: (provider: string, key: string, secret?: string) => Promise<void>;
  hasSecret?: boolean;
}) {
  const [keyInput, setKeyInput] = useState('');
  const [secretInput, setSecretInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const handleSave = async () => {
    if (!keyInput.trim()) return;
    setSaving(true);
    try {
      await onSave(provider, keyInput.trim(), hasSecret ? secretInput.trim() : undefined);
      setKeyInput('');
      setSecretInput('');
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);
    } catch (err: any) {
      alert(`Failed to save credential: ${err?.message || 'Error'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-border rounded-xl p-4 bg-white space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm text-foreground">{label}</h4>
        {savedMaskedKey && (
          <span className="text-xs text-emerald-600 font-mono font-medium flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            <Check className="h-3 w-3" /> Configured ({savedMaskedKey})
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">API Key</label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder={savedMaskedKey ? 'Enter new key to update' : placeholder}
              className="w-full bg-slate-50 border border-border rounded-lg pl-3 pr-9 py-2 text-xs text-foreground focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {hasSecret && (
          <div>
            <label className="block text-xs text-muted-foreground mb-1">API Secret</label>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                value={secretInput}
                onChange={(e) => setSecretInput(e.target.value)}
                placeholder="Secret key..."
                className="w-full bg-slate-50 border border-border rounded-lg pl-3 pr-9 py-2 text-xs text-foreground focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-1">
        {justSaved ? (
          <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Saved & Encrypted
          </span>
        ) : <div />}

        <button
          onClick={handleSave}
          disabled={saving || !keyInput.trim()}
          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ml-auto"
        >
          {saving && <Loader2 className="h-3 w-3 animate-spin" />}
          {saving ? 'Encrypting...' : 'Save Key'}
        </button>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'risk' | 'keys' | 'notifications'>('risk');
  const [feedback, setFeedback] = useState<string | null>(null);

  const { isEngaged, toggle: toggleKillSwitch, isLoading: killSwitchLoading } = useKillSwitchStore();

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

  // Load API Credentials
  const { data: credentials = [] } = useQuery<CredentialSummary[]>({
    queryKey: ['credentials'],
    queryFn: settingsService.getCredentials,
  });

  const handleSaveCredential = async (provider: string, apiKey: string, apiSecret?: string) => {
    await settingsService.saveCredential(provider, apiKey, apiSecret);
    queryClient.invalidateQueries({ queryKey: ['credentials'] });
  };

  const handleSaveRisk = (e: React.FormEvent) => {
    e.preventDefault();
    updateRiskMutation.mutate({
      riskCategory,
      allocatableCapital: parseFloat(capital),
      maxPositionPct: parseFloat(maxPos),
      maxDailyLossPct: parseFloat(maxLoss),
    });
  };

  const getSavedMask = (providerName: string) => {
    return credentials.find((c) => c.provider.toLowerCase() === providerName.toLowerCase())?.maskedKey;
  };

  return (
    <div className="space-y-6 max-w-[900px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage risk profiles, broker keys, LLM providers, and kill switch</p>
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
          { id: 'keys', label: 'API Keys', icon: Key },
          { id: 'notifications', label: 'Notifications', icon: Bell },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${activeTab === id
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
                <label className="block text-sm font-medium text-foreground mb-1.5">Allocatable Capital ($)</label>
                <input
                  type="number"
                  min="100"
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

            {/* Kill Switch Panel */}
            <div className={`rounded-xl p-5 border transition-all ${isEngaged ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-border'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <ShieldAlert className={`h-5 w-5 ${isEngaged ? 'text-red-600' : 'text-slate-500'}`} />
                    Global Emergency Kill Switch
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Immediately halts all new order submissions and AI proposal approvals across the entire system.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={toggleKillSwitch}
                  disabled={killSwitchLoading}
                  className={`px-5 py-2.5 rounded-lg font-bold text-xs transition-all shrink-0 ${isEngaged
                      ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/30'
                      : 'bg-white hover:bg-slate-100 text-slate-800 border border-border shadow-sm'
                    }`}
                >
                  {killSwitchLoading ? 'Toggling...' : isEngaged ? 'ENGAGED — Click to Disengage' : 'Engage Kill Switch'}
                </button>
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

      {/* API Keys Tab */}
      {activeTab === 'keys' && (
        <div className="bg-white border border-border rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-indigo-600" />
            <h2 className="text-base font-semibold text-foreground">API Credentials Management</h2>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
            All credentials are encrypted with <strong>AES-256-GCM</strong> on the server. Decryption keys never reach the browser; only the masked format (e.g. ••••-XXXX) is displayed.
          </div>

          <div className="space-y-4">
            <MaskedKeyRow
              label="Alpaca Paper Trading"
              provider="alpaca_paper"
              savedMaskedKey={getSavedMask('alpaca_paper')}
              placeholder="PK..."
              onSave={handleSaveCredential}
              hasSecret
            />
          </div>
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
