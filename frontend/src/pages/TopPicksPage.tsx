import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, AlertTriangle, RefreshCw, 
  Wallet, Network, CheckCircle2, AlertCircle, Database, Layers, Calendar
} from 'lucide-react';
import { discoveryService, type StockPick } from '@/services/discoveryService';
import { paperPortfolioService } from '@/services/paperPortfolioService';
import { useLanguageStore } from '@/store/languageStore';
import { useMarketStatusStore } from '@/store/marketStatusStore';
import { formatINR } from '@/utils/formatters';
import { formatISTNextOpen } from '@/utils/istDate';

export function TopPicksPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { language, t } = useLanguageStore();
  const { status: marketStatus } = useMarketStatusStore();
  const isOpen = marketStatus?.is_open ?? false;

  const [riskProfile, setRiskProfile] = useState<'conservative' | 'balanced' | 'aggressive'>('balanced');
  const [selectedSector, setSelectedSector] = useState<string>('all');
  
  // Quick Order Modal state
  const [buyModalPick, setBuyModalPick] = useState<StockPick | null>(null);
  const [orderQuantity, setOrderQuantity] = useState<number>(10);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderMessage, setOrderMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Top picks query - polls only when market is open and tab is visible
  const { data: picks = [], isLoading, isFetching } = useQuery<StockPick[]>({
    queryKey: ['discovery-picks', riskProfile, selectedSector, language],
    queryFn: () => discoveryService.getTopPicks(riskProfile, selectedSector, language),
    staleTime: isOpen ? 60000 : Infinity,
    refetchInterval: () => (isOpen && typeof document !== 'undefined' && document.visibilityState === 'visible' ? 60000 : false),
  });

  // Execute quick paper buy mutation
  const handleExecutePaperBuy = async () => {
    if (!buyModalPick) return;
    setOrderSubmitting(true);
    setOrderMessage(null);

    try {
      await paperPortfolioService.executeOrder({
        symbol: buyModalPick.symbol,
        action: 'BUY',
        quantity: orderQuantity,
        orderType: 'MARKET',
      });

      queryClient.invalidateQueries({ queryKey: ['paper-portfolio'] });
      setOrderMessage({ type: 'success', text: `Successfully bought ${orderQuantity} shares of ${buyModalPick.symbol}!` });
      setTimeout(() => {
        setBuyModalPick(null);
        setOrderMessage(null);
      }, 1800);
    } catch (err: any) {
      setOrderMessage({ type: 'error', text: err?.message || 'Failed to place virtual order.' });
    } finally {
      setOrderSubmitting(false);
    }
  };

  const getAgreementBadge = (status?: string) => {
    switch (status) {
      case 'agree':
        return {
          label: 'Strong Consensus 🟢',
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
        };
      case 'partially_agree':
        return {
          label: 'Moderate Agreement 🟡',
          bg: 'bg-amber-50 text-amber-800 border-amber-300',
        };
      case 'disagree':
        return {
          label: 'Divergent Debate 🔴',
          bg: 'bg-rose-50 text-rose-800 border-rose-300',
        };
      default:
        return {
          label: 'AI Evaluated',
          bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        };
    }
  };

  const dataSource = picks[0]?.dataSource || 'live';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Market Closed Session Archive Banner */}
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
              Offline Quotes (Last close)
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500">Live feeds paused</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-border p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{t('top_picks_title')}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">{t('top_picks_desc')}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Data Source Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border bg-slate-50 text-slate-700 border-slate-200">
            <Database className="h-3.5 w-3.5 text-indigo-500" />
            <span>
              {!isOpen 
                ? 'Last close'
                : dataSource === 'live' 
                ? t('data_source_live')
                : dataSource === 'cache' 
                ? t('data_source_cached') 
                : t('data_source_sample')}
            </span>
          </div>

          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['discovery-picks'] })}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded-xl text-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Bar: Risk Profile Tabs & Sector Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-border p-3 rounded-2xl shadow-sm">
        {/* Risk profile tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          {(['conservative', 'balanced', 'aggressive'] as const).map((profile) => (
            <button
              key={profile}
              onClick={() => setRiskProfile(profile)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all capitalize cursor-pointer ${
                riskProfile === profile
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t(profile)}
            </button>
          ))}
        </div>

        {/* Sector dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">Sector:</label>
          <select
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className="bg-white border border-border rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Indian Sectors</option>
            <option value="Banking">Banking & Financials</option>
            <option value="IT">IT & Tech</option>
            <option value="Energy">Oil & Gas / Energy</option>
            <option value="Auto">Automobiles</option>
            <option value="Pharma">Pharma & Healthcare</option>
            <option value="FMCG">FMCG & Consumer</option>
            <option value="Metals">Metals & Mining</option>
            <option value="Infrastructure">Infrastructure</option>
            <option value="Telecom">Telecom</option>
            <option value="Defence">Defence</option>
          </select>
        </div>
      </div>

      {/* Picks Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-80 bg-slate-100 rounded-2xl animate-pulse border border-slate-200" />
          ))}
        </div>
      ) : picks.length === 0 ? (
        <div className="bg-white border border-border rounded-2xl p-12 text-center space-y-3">
          <Layers className="h-10 w-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No Top Picks Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Try switching risk profiles or selecting "All Indian Sectors" to discover high-conviction picks.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {picks.map((pick) => {
            const agreement = getAgreementBadge(pick.aiAnalysis?.agreementStatus);
            const agreementPercent = Math.round((pick.aiAnalysis?.geminiGroqAgreement ?? 0.85) * 100);
            const isDivergent = pick.aiAnalysis?.divergenceFlag;

            return (
              <div
                key={pick.symbol}
                className="bg-white border border-border rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between space-y-4 relative group"
              >
                {/* Top Section */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-foreground tracking-tight">{pick.symbol}</span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {pick.marketCap}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{pick.companyName}</p>
                      <span className="text-[11px] text-indigo-600 font-medium">{pick.sector}</span>
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-bold text-foreground">{formatINR(pick.price)}</p>
                      <span className="text-[10px] text-slate-400 block font-medium">
                        {isOpen ? 'Live Quote' : 'Last close'}
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-600">
                        Score: +{pick.momentumScore.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Agreement & Divergence Banner */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[11px] font-medium text-slate-500">{t('agreement_score')}:</span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${agreement.bg}`}>
                        {agreement.label} ({agreementPercent}%)
                      </span>
                    </div>

                    {isDivergent && (
                      <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span>{t('divergence_alert')}</span>
                      </div>
                    )}
                  </div>

                  {/* Signals */}
                  <div className="flex flex-wrap gap-1">
                    {pick.signals.map((sig, i) => (
                      <span key={i} className="text-[10px] bg-indigo-50/80 text-indigo-700 px-2 py-0.5 rounded font-medium border border-indigo-100">
                        {sig}
                      </span>
                    ))}
                  </div>

                  {/* Why this pick / Rationale */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-2">
                    <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">{t('why_this_pick')}</p>
                    <p className="text-xs text-slate-600 leading-relaxed italic line-clamp-3">
                      "{pick.aiAnalysis?.rationale || 'High momentum combined with volume accumulation relative to Nifty index.'}"
                    </p>

                    {/* Forecast Range */}
                    {pick.forecast && (
                      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">GLUON Forecast:</span>
                        <span className="font-semibold text-slate-800">
                          {formatINR(pick.forecast.p10)} – {formatINR(pick.forecast.p90)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="pt-3 border-t border-border flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (!isOpen) return;
                      setBuyModalPick(pick);
                      setOrderQuantity(Math.max(1, Math.floor(25000 / (pick.price || 100))));
                    }}
                    disabled={!isOpen}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      isOpen
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20 cursor-pointer'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-75'
                    }`}
                    title={!isOpen ? 'Virtual market orders cannot be placed while market is closed.' : t('paper_buy')}
                  >
                    <Wallet className="h-3.5 w-3.5" />
                    <span>{isOpen ? t('paper_buy') : 'Market Closed'}</span>
                  </button>

                  <button
                    onClick={() => navigate(`/orchestration?ticker=${pick.symbol}`)}
                    className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer"
                    title="Inspect Multi-Agent Debate"
                  >
                    <Network className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Debate</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Paper Buy Modal */}
      {buyModalPick && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-border space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-emerald-600" />
                  <span>Execute Virtual Paper Trade</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Simulated order in Indian Rupees (₹) with zero live financial risk.
                </p>
              </div>
              <button
                onClick={() => setBuyModalPick(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {orderMessage && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  orderMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {orderMessage.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                )}
                <span>{orderMessage.text}</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Symbol</p>
                  <p className="text-sm font-bold text-foreground">{buyModalPick.symbol}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Market Price</p>
                  <p className="text-sm font-bold text-emerald-700">{formatINR(buyModalPick.price)}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Quantity (Shares)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setOrderQuantity(Math.max(1, orderQuantity - 5))}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-xs"
                  >
                    -5
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={orderQuantity}
                    onChange={(e) => setOrderQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full text-center bg-white border border-border rounded-xl py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={() => setOrderQuantity(orderQuantity + 5)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-xs"
                  >
                    +5
                  </button>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center justify-between text-xs">
                <span className="text-emerald-900 font-medium">Estimated Order Value:</span>
                <span className="font-bold text-emerald-800 text-sm">
                  {formatINR(orderQuantity * buyModalPick.price)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setBuyModalPick(null)}
                className="w-1/3 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecutePaperBuy}
                disabled={orderSubmitting}
                className="w-2/3 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/25 flex items-center justify-center gap-1.5"
              >
                {orderSubmitting && <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                <span>Confirm Virtual BUY</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
