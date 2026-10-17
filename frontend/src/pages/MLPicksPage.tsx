import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Cpu,
  Database, RefreshCw,
  AlertCircle, Info, BarChart3, Wallet, Calendar, CheckCircle2, XCircle, Clock
} from 'lucide-react';
import { mlService, type MLPicksResponse, type MLMetrics } from '@/services/mlService';
import { useMarketStatusStore } from '@/store/marketStatusStore';
import { formatINR, formatPercent } from '@/utils/formatters';
import { formatISTNextOpen } from '@/utils/istDate';

export function MLPicksPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { status: marketStatus, demoOverride } = useMarketStatusStore();

  const isOpen = marketStatus?.is_open ?? false;

  // ML Picks query - refetches every 45s only when market is OPEN and tab is visible
  const { data: picksData, isLoading: isPicksLoading, isFetching: isPicksFetching } = useQuery<MLPicksResponse>({
    queryKey: ['ml-picks', demoOverride],
    queryFn: () => mlService.getPicks(demoOverride || undefined),
    staleTime: isOpen ? 45000 : Infinity,
    refetchInterval: () => (isOpen && typeof document !== 'undefined' && document.visibilityState === 'visible' ? 45000 : false),
  });

  // ML Metrics query
  const { data: metrics, isLoading: isMetricsLoading } = useQuery<MLMetrics>({
    queryKey: ['ml-metrics'],
    queryFn: mlService.getMetrics,
    staleTime: 300000,
  });

  // Re-run screening mutation
  const runMutation = useMutation({
    mutationFn: () => mlService.runScreening(demoOverride || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ml-picks'] });
    },
  });

  const picks = picksData?.picks || [];
  const topCandidates = picksData?.top_candidates || [];
  const threshold = picksData?.threshold ?? metrics?.threshold ?? 0.52;
  const baseRate = picksData?.base_rate ?? metrics?.base_rate ?? 0.2941;
  const dataSource = picksData?.data_source || (isOpen ? 'fallback_yfinance' : 'Last close');
  const review = picksData?.review;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* SEBI Educational Warning Banner */}
      {/* <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex items-start gap-3 text-amber-950">
        <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-bold text-sm">
            Educational screening tool. Not SEBI-registered investment advice. The model does not predict prices.
          </p>
          <p className="text-amber-800 leading-relaxed">
            This machine learning model scores the statistical probability that a liquid Nifty 50 stock will outperform the benchmark index from open to close by at least 0.5%. Predictions are derived strictly from mathematical features prior to market open with no lookahead.
          </p>
        </div>
      </div> */}

      {/* Market Closed Archive Session Notice */}
      {!isOpen && (
        <div className="bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-700 dark:text-slate-200 text-xs">
          <div className="flex items-center gap-2.5">
            <Calendar className="h-4 w-4 text-indigo-500 shrink-0" />
            <span className="font-medium">
              <strong className="text-foreground">Today market is closed</strong> ({marketStatus?.reason || marketStatus?.state || 'Weekend/Holiday'}). Opens next on <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{formatISTNextOpen(marketStatus?.next_open_ist)}</strong>.
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] shrink-0">
            <span className="px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold uppercase">
              Offline Quotes ({dataSource})
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500">Live feeds paused</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-border p-6 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600">
            <Cpu className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">NSE ML Stock Screening</h1>
              <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                LightGBM + Calibrated Probabilities
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Trained on 5 years of daily OHLCV data. Evaluates probability of beating Nifty 50 by &gt;0.5% today.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Data Source Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border bg-slate-50 text-slate-700 border-slate-200">
            <Database className="h-3.5 w-3.5 text-indigo-500" />
            <span>
              {isOpen && dataSource === 'live' ? '🟢 Live Angel One Feed' : `🔵 ${dataSource}`}
            </span>
          </div>

          {/* Re-run button */}
          <div className="relative group">
            <button
              onClick={() => runMutation.mutate()}
              disabled={!isOpen || runMutation.isPending || isPicksFetching}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${isOpen
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-500/20 cursor-pointer'
                : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed opacity-75'
                }`}
              title={
                !isOpen
                  ? 'Screening is disabled while the market is closed. Fresh picks generate from 09:20 AM IST on trading days.'
                  : 'Re-score universe'
              }
            >
              <RefreshCw className={`h-3.5 w-3.5 ${runMutation.isPending || isPicksFetching ? 'animate-spin' : ''}`} />
              <span>{runMutation.isPending ? 'Scoring Universe...' : 'Re-Run Screening'}</span>
            </button>
            {!isOpen && (
              <div className="hidden group-hover:block absolute right-0 top-full mt-1.5 w-64 p-2 bg-slate-900 text-white text-[11px] rounded-lg shadow-xl z-30 pointer-events-none">
                Screening is disabled while market is closed. Fresh picks generate from 09:20 AM IST on trading days.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Qualified Picks Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">
              {isOpen ? `Today's Qualified Picks (Score ≥ ${(threshold * 100).toFixed(0)}%)` : "ML Stock Screening Selection"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {isOpen
                ? "Filtered with maximum 2 stocks per sector for portfolio diversification."
                : `Screening selection is paused while the market is closed.`}
            </p>
          </div>
          {isOpen && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
              {picks.length} of {picksData?.total_screened ?? 39} qualified (Base Rate: {(baseRate * 100).toFixed(1)}%)
            </span>
          )}
        </div>

        {!isOpen ? (
          <div className="bg-white border border-border rounded-2xl p-10 text-center space-y-4 shadow-sm">
            <div className="h-14 w-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
              <Clock className="h-7 w-7" />
            </div>
            <div className="space-y-2 max-w-lg mx-auto">
              <h3 className="text-lg font-bold text-foreground">
                Today Market is Closed
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Stock screening selection (top outperformers) is paused while the National Stock Exchange (NSE) is closed ({marketStatus?.reason || marketStatus?.state || 'Weekend / Holiday'}). No stocks are selected today.
              </p>
              <div className="pt-2">
                <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-sm shadow-sm">
                  <Calendar className="h-4 w-4 text-indigo-600" />
                  Opens next on {formatISTNextOpen(marketStatus?.next_open_ist)} at 09:15 AM IST
                </span>
              </div>
            </div>
          </div>
        ) : isPicksLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-64 bg-slate-100 rounded-2xl animate-pulse border border-slate-200" />
            ))}
          </div>
        ) : picks.length === 0 ? (
          /* Empty Picks Banner */
          <div className="bg-white border border-border rounded-2xl p-8 text-center space-y-4 shadow-sm">
            <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800">
                No stock passed the confidence threshold today.
              </h3>
              <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
                The trained LightGBM model requires at least {(threshold * 100).toFixed(0)}% calibrated probability of beating the Nifty 50 benchmark by 0.5% today. When market signals are neutral or volatile, returning 0 picks protects capital from low-conviction trades.
              </p>
            </div>

            {/* Diagnostic table of closest candidates */}
            {topCandidates.length > 0 && (
              <div className="pt-4 border-t border-slate-100 max-w-2xl mx-auto text-left">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Highest Scored Candidates (Below {(threshold * 100).toFixed(0)}% threshold):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {topCandidates.map((c) => (
                    <div
                      key={c.symbol}
                      onClick={() => navigate(`/orchestration?ticker=${c.symbol}`)}
                      className="p-3 bg-slate-50 hover:bg-indigo-50/50 rounded-xl border border-slate-200 hover:border-indigo-200 transition-colors flex items-center justify-between text-xs cursor-pointer group"
                      title={`Inspect multi-agent debate for ${c.symbol}`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-foreground group-hover:text-indigo-600 transition-colors">{c.symbol}</span>
                          <span className="text-[10px] text-muted-foreground font-medium">({c.sector})</span>
                        </div>
                        <p className="text-[10px] text-slate-500 truncate max-w-[200px] mt-0.5">{c.explanation}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-slate-700">{(c.score * 100).toFixed(1)}%</span>
                        <span className="block text-[9px] text-indigo-600 font-semibold group-hover:underline">Debate →</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {picks.map((pick, idx) => (
              <div
                key={pick.symbol}
                className="bg-white border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                          #{idx + 1}
                        </span>
                        <span className="text-base font-bold text-foreground">{pick.symbol}</span>
                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {pick.sector}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        NSE Equity • {isOpen ? `LTP: ${formatINR(pick.price)}` : `Last close: ${formatINR(pick.price)}`}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-bold text-emerald-600">
                        {(pick.score * 100).toFixed(1)}%
                      </span>
                      <span className="block text-[10px] text-slate-400 font-medium">
                        Outperform Prob
                      </span>
                    </div>
                  </div>

                  {/* Top 3 Feature Drivers */}
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Top 3 Predictive Drivers:
                    </p>
                    <div className="space-y-1">
                      {pick.top_drivers.map((d, i) => (
                        <div
                          key={i}
                          className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                        >
                          <span className="text-slate-700 font-medium">{d.description}</span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${d.contribution >= 0
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                              }`}
                          >
                            {d.contribution >= 0 ? '+' : ''}{d.contribution.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Template Explanation */}
                  <div className="p-3 bg-indigo-50/50 border border-indigo-100/70 rounded-xl text-xs text-slate-700">
                    <p className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider mb-1">
                      Model Rationale:
                    </p>
                    <p className="leading-relaxed italic">{pick.explanation}</p>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                  <button
                    onClick={() => navigate('/paper-portfolio')}
                    disabled={!isOpen}
                    className={`flex items-center gap-1.5 font-bold ${isOpen
                      ? 'text-emerald-600 hover:text-emerald-800 cursor-pointer'
                      : 'text-slate-400 cursor-not-allowed opacity-75'
                      }`}
                    title={!isOpen ? 'Virtual market orders cannot be placed while market is closed.' : 'Trade in Paper Portfolio'}
                  >
                    <Wallet className="h-3.5 w-3.5" />
                    <span>{isOpen ? 'Trade in Paper Portfolio →' : 'Market Closed (Paper Trade Disabled)'}</span>
                  </button>
                  <button
                    onClick={() => navigate(`/orchestration?ticker=${pick.symbol}`)}
                    className="text-indigo-600 hover:text-indigo-800 font-semibold"
                  >
                    Debate View
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Last Session Review Panel */}
      {review && (
        <div className="bg-white border border-border rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-4">
            <div className="flex items-center gap-2.5">
              <Clock className="h-5 w-5 text-indigo-600" />
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Last Session Review ({review.session_date})
                </h2>
                <p className="text-xs text-amber-800 dark:text-amber-400 font-medium">
                  Historical single-session review. One day proves nothing.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold">
                Evaluated {review.total_evaluated} picks vs Nifty 50
              </span>
            </div>
          </div>

          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-[11px] font-semibold text-slate-500 uppercase">Single-Day Hit Rate</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {formatPercent(review.hit_rate * 100, false)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Beat Nifty 50 open-to-close by &ge; 0.5%
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-[11px] font-semibold text-slate-500 uppercase">Avg Excess Return vs Nifty</p>
              <p className={`text-2xl font-bold mt-1 ${review.avg_excess_return >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatPercent(review.avg_excess_return * 100)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Mean stock open-to-close minus Nifty return
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-[11px] font-semibold text-slate-500 uppercase">Nifty 50 Session Return</p>
              <p className={`text-2xl font-bold mt-1 ${review.nifty_return >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatPercent(review.nifty_return * 100)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Index open-to-close benchmark baseline
              </p>
            </div>
          </div>

          {/* Per-Pick Breakdown Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase tracking-wider text-[10px] font-semibold border-y border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-3">Symbol</th>
                  <th className="py-2.5 px-3">Open</th>
                  <th className="py-2.5 px-3">Close</th>
                  <th className="py-2.5 px-3">Stock Return</th>
                  <th className="py-2.5 px-3">Nifty Return</th>
                  <th className="py-2.5 px-3">Excess Return</th>
                  <th className="py-2.5 px-3 text-right">Target (&ge;0.5%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {review.per_pick.map((item) => (
                  <tr key={item.symbol} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-bold text-foreground">{item.symbol}</td>
                    <td className="py-2.5 px-3">{formatINR(item.open_price)}</td>
                    <td className="py-2.5 px-3">{formatINR(item.close_price)}</td>
                    <td className={`py-2.5 px-3 font-semibold ${item.stock_return >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatPercent(item.stock_return * 100)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {formatPercent(item.nifty_return * 100)}
                    </td>
                    <td className={`py-2.5 px-3 font-bold ${item.excess_return >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatPercent(item.excess_return * 100)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {item.hit ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="h-3 w-3" /> Hit (+0.5%+)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          <XCircle className="h-3 w-3" /> Missed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Model Validation & Honest Evaluation Panel */}
      <div className="bg-white border border-border rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2.5 border-b border-border pb-4">
          <BarChart3 className="h-5 w-5 text-indigo-600" />
          <div>
            <h2 className="text-base font-bold text-foreground">Honest Out-of-Sample Model Validation</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Evaluated strictly on held-out test data ({metrics?.test_date_range?.[0]} to {metrics?.test_date_range?.[1]}). Threshold was chosen exclusively on validation data.
            </p>
          </div>
        </div>

        {isMetricsLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading model validation metrics...</div>
        ) : metrics ? (
          <div className="space-y-6">
            {/* Quantitative Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <p className="text-[11px] font-semibold text-slate-500 uppercase">Test Precision at Threshold</p>
                <p className="text-xl font-bold text-emerald-700">
                  {formatPercent(metrics.precision_at_threshold * 100, false)}
                </p>
                <span className="text-[10px] text-slate-400 font-medium">
                  Base rate: {formatPercent(metrics.base_rate * 100, false)} ({formatPercent(metrics.lift_over_base_rate * 100)} lift)
                </span>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <p className="text-[11px] font-semibold text-slate-500 uppercase">Daily Top-5 Hit Rate</p>
                <p className="text-xl font-bold text-indigo-700">
                  {formatPercent(metrics.top5_daily_hit_rate * 100, false)}
                </p>
                <span className="text-[10px] text-slate-400 font-medium">
                  Share beating Nifty 50 by &gt;0.5%
                </span>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <p className="text-[11px] font-semibold text-slate-500 uppercase">Cost-Adjusted Excess Return</p>
                <p className={`text-xl font-bold ${metrics.top5_avg_excess_return_after_costs >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {formatPercent(metrics.top5_avg_excess_return_after_costs * 100)}
                </p>
                <span className="text-[10px] text-slate-400 font-medium">
                  Net of 0.1% daily transaction cost
                </span>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <p className="text-[11px] font-semibold text-slate-500 uppercase">Test Set Samples</p>
                <p className="text-xl font-bold text-foreground">
                  {metrics.n_test_rows.toLocaleString()}
                </p>
                <span className="text-[10px] text-slate-400 font-medium">
                  {metrics.n_picks} picks (~{metrics.avg_picks_per_day} / day)
                </span>
              </div>
            </div>

            {/* Split Date Ranges & Baseline Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <p className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Time-Series Chronological Splits:</p>
                <div className="space-y-1 text-slate-600">
                  <div className="flex justify-between">
                    <span>Train (60%):</span>
                    <span className="font-mono font-semibold">{metrics.train_date_range?.[0]} to {metrics.train_date_range?.[1]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Validation (20%):</span>
                    <span className="font-mono font-semibold">{metrics.val_date_range?.[0]} to {metrics.val_date_range?.[1]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Test (20%):</span>
                    <span className="font-mono font-semibold text-indigo-700">{metrics.test_date_range?.[0]} to {metrics.test_date_range?.[1]}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <p className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Model Benchmarking:</p>
                <div className="space-y-1 text-slate-600">
                  <div className="flex justify-between">
                    <span>LightGBM Test ROC-AUC:</span>
                    <span className="font-mono font-bold text-emerald-700">{metrics.lgbm_test_auc?.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Logistic Regression Baseline AUC:</span>
                    <span className="font-mono font-medium">{metrics.baseline_model?.test_auc?.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Threshold Calibration Method:</span>
                    <span className="font-mono font-medium">Isotonic Regression</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Model Limitations List */}
            <div className="p-4 rounded-xl border border-amber-200/80 bg-amber-50/50 space-y-2">
              <p className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <Info className="h-4 w-4 text-amber-700" />
                <span>Documented Limitations & Methodological Honesty:</span>
              </p>
              <ul className="space-y-1.5 text-xs text-amber-900 list-disc list-inside">
                {metrics.limitations.map((lim, i) => (
                  <li key={i} className="leading-relaxed">{lim}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
