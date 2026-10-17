import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, AlertCircle, Sparkles, ArrowRight } from 'lucide-react';
import { onboardingService } from '@/services/onboardingService';
import { useAuthStore } from '@/store/authStore';
import logoImg from '@/assets/logo.png';

export function OnboardingPage() {
  const navigate = useNavigate();
  const checkAuth = useAuthStore((s) => s.checkAuth);

  const [riskCategory, setRiskCategory] = useState<'conservative' | 'balanced' | 'aggressive'>('balanced');
  const [allocatableCapital, setAllocatableCapital] = useState('10000');
  const [maxPositionPct, setMaxPositionPct] = useState('10');
  const [maxDailyLossPct, setMaxDailyLossPct] = useState('3');
  const [alpacaPaperKey, setAlpacaPaperKey] = useState('');
  const [alpacaPaperSecret, setAlpacaPaperSecret] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');

    const capitalNum = parseFloat(allocatableCapital);
    const maxPosNum = parseFloat(maxPositionPct);
    const maxLossNum = parseFloat(maxDailyLossPct);

    if (isNaN(capitalNum) || capitalNum <= 0) {
      setError('Please enter a valid allocatable capital amount.');
      return;
    }
    if (isNaN(maxPosNum) || maxPosNum < 1 || maxPosNum > 25) {
      setError('Max position size must be between 1% and 25%.');
      return;
    }
    if (isNaN(maxLossNum) || maxLossNum < 1 || maxLossNum > 10) {
      setError('Max daily loss limit must be between 1% and 10%.');
      return;
    }

    setLoading(true);
    try {
      await onboardingService.completeOnboarding({
        riskCategory,
        allocatableCapital: capitalNum,
        maxPositionPct: maxPosNum,
        maxDailyLossPct: maxLossNum,
        alpacaPaperKey: alpacaPaperKey.trim(),
        alpacaPaperSecret: alpacaPaperSecret.trim(),
      });

      // Refresh auth state to ensure risk profile is stored in Zustand
      await checkAuth();
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Failed to complete profile onboarding. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-8">
      <div className="max-w-2xl w-full bg-white border border-border rounded-3xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-8 py-7 flex items-center gap-4">
          <img src={logoImg} alt="TradeVault Logo" className="h-10 w-auto object-contain rounded-xl" />
          <div>
            <h1 className="text-xl font-bold text-white">Welcome to TradeVault</h1>
            <p className="text-indigo-100 text-sm mt-0.5">Customize your simulation environment — no broker keys required</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
          {/* Paper Sandbox Banner */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-5 flex items-start gap-3.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                <span>Free Paper Trading Sandbox Activated</span>
                <span className="bg-emerald-200/70 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">100% Risk Free</span>
              </p>
              <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                TradeVault provides a complete virtual paper trading environment with simulated live data feeds. You can explore multi-agent AI debates, test quant strategies, and backtest without needing to enter any broker keys.
              </p>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Preferences */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Risk Profile</label>
              <select
                value={riskCategory}
                onChange={(e) => setRiskCategory(e.target.value as any)}
                className="w-full bg-white border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm"
              >
                <option value="balanced">Balanced (Recommended)</option>
                <option value="conservative">Conservative (Capital Preservation)</option>
                <option value="aggressive">Aggressive (High Conviction)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Allocatable Capital ($)</label>
              <input
                type="number"
                min="100"
                value={allocatableCapital}
                onChange={(e) => setAllocatableCapital(e.target.value)}
                placeholder="10000"
                required
                className="w-full bg-white border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Max Position Size (%)</label>
              <input
                type="number"
                min="1"
                max="25"
                value={maxPositionPct}
                onChange={(e) => setMaxPositionPct(e.target.value)}
                placeholder="10"
                required
                className="w-full bg-white border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Max Daily Loss (%)</label>
              <input
                type="number"
                min="1"
                max="10"
                value={maxDailyLossPct}
                onChange={(e) => setMaxDailyLossPct(e.target.value)}
                placeholder="3"
                required
                className="w-full bg-white border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Alpaca Paper API Key <span className="text-muted-foreground text-xs font-normal">(Optional for mock testing)</span>
              </label>
              <input
                type="password"
                value={alpacaPaperKey}
                onChange={(e) => setAlpacaPaperKey(e.target.value)}
                placeholder="PK..."
                className="w-full bg-white border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm font-mono"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Alpaca Paper Secret <span className="text-muted-foreground text-xs font-normal">(Optional for mock testing)</span>
              </label>
              <input
                type="password"
                value={alpacaPaperSecret}
                onChange={(e) => setAlpacaPaperSecret(e.target.value)}
                placeholder="Secret..."
                className="w-full bg-white border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm font-mono"
              />
            </div>
          </div>

          {/* Optional Broker Notice */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between text-xs text-slate-600">
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600 shrink-0" />
              <span>Have an external Alpaca broker account? You can optionally connect it anytime in <strong>Settings → API Keys</strong>.</span>
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 py-2.5 px-4"
            >
              Skip & Use Defaults
            </button>

            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-2.5 px-8 rounded-xl text-sm transition-all shadow-md shadow-indigo-500/25 flex items-center gap-2"
            >
              {loading && <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <span>{loading ? 'Configuring Profile...' : 'Complete Setup →'}</span>
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
