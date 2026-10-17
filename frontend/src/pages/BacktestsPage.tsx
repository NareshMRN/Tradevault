import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Plus, CheckCircle2, Clock, XCircle, BarChart2, TrendingDown, Loader2 } from 'lucide-react';
import { backtestService, type BacktestItem } from '@/services/backtestService';

export function BacktestsPage() {
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [strategyName, setStrategyName] = useState('');
  const [tickerUniverse, setTickerUniverse] = useState('AAPL, PLTR, MSFT');
  const [startDate, setStartDate] = useState('2023-01-01');
  const [endDate, setEndDate] = useState('2024-01-01');

  const { data: backtests = [], isLoading } = useQuery<BacktestItem[]>({
    queryKey: ['backtests'],
    queryFn: backtestService.getBacktests,
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.some((b) => b.status === 'running' || b.status === 'pending') ? 1500 : false;
    },
  });

  const launchMutation = useMutation({
    mutationFn: () =>
      backtestService.launchBacktest({
        strategyName: strategyName.trim(),
        tickerUniverse: tickerUniverse.split(',').map((t) => t.trim().toUpperCase()).filter(Boolean),
        startDate,
        endDate,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backtests'] });
      setShowNew(false);
      setStrategyName('');
    },
    onError: (err: any) => {
      alert(`Launch failed: ${err?.message || 'Error launching backtest'}`);
    },
  });

  const handleLaunchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!strategyName.trim()) return;
    launchMutation.mutate();
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Strategy Backtests</h1>
          <p className="text-sm text-muted-foreground mt-1">Overfitting validation via purged walk-forward cross-validation (DSR & PBO)</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors shadow-lg shadow-indigo-500/20 text-sm"
        >
          <Plus className="h-4 w-4" /> New Backtest
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900 shadow-sm">
        <p>
          <span className="font-bold">Eligibility Gate:</span> A strategy must pass overfitting validation (Deflated Sharpe Ratio &gt; 1.0 and Probability of Backtest Overfitting &lt; 0.25) before any AI proposal can be approved for paper trading.
        </p>
      </div>

      {/* Backtests List */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3 bg-white border border-border rounded-xl">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
          <p className="text-sm text-muted-foreground">Loading backtest runs from MongoDB...</p>
        </div>
      ) : backtests.length === 0 ? (
        <div className="py-16 text-center bg-white border border-border rounded-xl">
          <BarChart2 className="h-10 w-10 text-indigo-400 mx-auto mb-3" />
          <p className="text-base font-semibold text-foreground">No backtests run yet.</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Launch your first purged walk-forward validation strategy.</p>
          <button
            onClick={() => setShowNew(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg shadow-sm"
          >
            Configure Backtest
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {backtests.map((bt) => (
            <div key={bt.id} className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-base font-bold text-foreground">{bt.name}</h3>
                      {bt.status === 'completed' && bt.eligible && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20">
                          <CheckCircle2 className="h-3 w-3" /> Paper-Trade Eligible
                        </span>
                      )}
                      {bt.status === 'completed' && !bt.eligible && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 ring-1 ring-red-600/20">
                          <XCircle className="h-3 w-3" /> Overfit — Not Eligible
                        </span>
                      )}
                      {bt.status === 'running' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-800 ring-1 ring-yellow-600/20">
                          <Clock className="h-3 w-3 animate-spin" /> Running...
                        </span>
                      )}
                      {bt.status === 'failed' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 ring-1 ring-slate-400/20">
                          <XCircle className="h-3 w-3" /> Failed
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {bt.start} → {bt.end} • {bt.tickers?.join(', ') || 'Universe'}
                    </p>
                  </div>
                  {bt.completedAt && (
                    <p className="text-xs text-muted-foreground">
                      Completed {new Date(bt.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>

                {bt.status === 'completed' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-slate-50 rounded-lg p-4 border border-border">
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <BarChart2 className="h-3 w-3" /> Sharpe Ratio
                      </p>
                      <p className="text-xl font-bold text-foreground">{bt.sharpe?.toFixed(2) ?? '—'}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4 border border-border">
                      <p className="text-xs text-muted-foreground mb-1">Deflated Sharpe</p>
                      <p className={`text-xl font-bold ${(bt.deflatedSharpe ?? 0) > 1.0 ? 'text-profit' : 'text-loss'}`}>
                        {bt.deflatedSharpe?.toFixed(2) ?? '—'}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4 border border-border">
                      <p className="text-xs text-muted-foreground mb-1">P(Backtest Overfit)</p>
                      <p className={`text-xl font-bold ${(bt.pbo ?? 1) < 0.25 ? 'text-profit' : 'text-loss'}`}>
                        {bt.pbo != null ? `${((bt.pbo) * 100).toFixed(0)}%` : '—'}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4 border border-border">
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <TrendingDown className="h-3 w-3" /> Max Drawdown
                      </p>
                      <p className="text-xl font-bold text-loss">
                        {bt.maxDrawdown != null ? `${bt.maxDrawdown.toFixed(1)}%` : '—'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-lg p-4 border border-border text-center">
                    <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 animate-spin text-yellow-600" />
                      Running purged walk-forward cross-validation... computing deflated Sharpe ratio...
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Backtest Modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-border rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-lg font-bold text-foreground mb-5">Configure New Backtest</h3>
            <form onSubmit={handleLaunchSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Strategy Name</label>
                <input
                  type="text"
                  placeholder="e.g. Qlib Factor + Momentum Strategy"
                  value={strategyName}
                  onChange={(e) => setStrategyName(e.target.value)}
                  required
                  className="w-full bg-white border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Ticker Universe (comma separated)</label>
                <input
                  type="text"
                  placeholder="AAPL, PLTR, MSFT"
                  value={tickerUniverse}
                  onChange={(e) => setTickerUniverse(e.target.value)}
                  required
                  className="w-full bg-white border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="w-full bg-white border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="w-full bg-white border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowNew(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-foreground rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={launchMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
                >
                  {launchMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  {launchMutation.isPending ? 'Launching...' : 'Run Validation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
