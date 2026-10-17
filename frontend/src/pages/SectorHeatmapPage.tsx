import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Layers, RefreshCw, Sparkles, ArrowRight, Database, Calendar
} from 'lucide-react';
import { discoveryService, type SectorScore, type StockPick } from '@/services/discoveryService';
import { useLanguageStore } from '@/store/languageStore';
import { useMarketStatusStore } from '@/store/marketStatusStore';
import { formatPercent, formatINR } from '@/utils/formatters';
import { formatISTNextOpen } from '@/utils/istDate';

export function SectorHeatmapPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { language, t } = useLanguageStore();
  const { status: marketStatus } = useMarketStatusStore();
  const isOpen = marketStatus?.is_open ?? false;

  const [selectedSector, setSelectedSector] = useState<string | null>(null);

  // Sectors query
  const { data: sectors = [], isLoading, isFetching } = useQuery<SectorScore[]>({
    queryKey: ['discovery-sectors'],
    queryFn: discoveryService.getSectors,
    staleTime: 60000,
  });

  // Top picks for selected sector (or all)
  const { data: sectorPicks = [], isLoading: isPicksLoading } = useQuery<StockPick[]>({
    queryKey: ['discovery-picks', selectedSector, language],
    queryFn: () => discoveryService.getTopPicks('balanced', selectedSector || undefined, language),
    enabled: true,
  });

  // Run full scan mutation
  const scanMutation = useMutation({
    mutationFn: () => discoveryService.runScan('balanced', language),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discovery-sectors'] });
      queryClient.invalidateQueries({ queryKey: ['discovery-picks'] });
    },
  });

  // Helper to get color styles based on momentum score [-1, 1]
  const getSectorColor = (score: number) => {
    if (score >= 0.35) {
      return {
        bg: 'bg-emerald-500/10 hover:bg-emerald-500/15 border-emerald-500/30 text-emerald-950',
        badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        bar: 'bg-emerald-500',
        glow: 'shadow-emerald-500/10',
      };
    }
    if (score >= 0.1) {
      return {
        bg: 'bg-teal-500/10 hover:bg-teal-500/15 border-teal-500/30 text-teal-950',
        badge: 'bg-teal-100 text-teal-800 border-teal-300',
        bar: 'bg-teal-500',
        glow: 'shadow-teal-500/10',
      };
    }
    if (score > -0.1) {
      return {
        bg: 'bg-amber-500/10 hover:bg-amber-500/15 border-amber-500/30 text-amber-950',
        badge: 'bg-amber-100 text-amber-800 border-amber-300',
        bar: 'bg-amber-500',
        glow: 'shadow-amber-500/10',
      };
    }
    if (score > -0.35) {
      return {
        bg: 'bg-orange-500/10 hover:bg-orange-500/15 border-orange-500/30 text-orange-950',
        badge: 'bg-orange-100 text-orange-800 border-orange-300',
        bar: 'bg-orange-500',
        glow: 'shadow-orange-500/10',
      };
    }
    return {
      bg: 'bg-rose-500/10 hover:bg-rose-500/15 border-rose-500/30 text-rose-950',
      badge: 'bg-rose-100 text-rose-800 border-rose-300',
      bar: 'bg-rose-500',
      glow: 'shadow-rose-500/10',
    };
  };

  const dataSource = sectors[0]?.dataSource || 'live';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-border p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{t('sector_momentum')}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">{t('sector_desc')}</p>
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

          {/* Trigger Scan Button */}
          <button
            onClick={() => scanMutation.mutate()}
            disabled={scanMutation.isPending || isFetching}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm shadow-indigo-500/20 transition-all cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${scanMutation.isPending || isFetching ? 'animate-spin' : ''}`} />
            <span>{scanMutation.isPending ? t('scanning') : t('scan_now')}</span>
          </button>
        </div>
      </div>

      {/* Market Closed Notice Banner (Bottom of NSE Sector Momentum, Top of Heatmap) */}
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

      {/* Interactive Sector Heatmap Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
              NSE Sector Heatmap ({sectors.length} Sectors)
            </h2>
            <span className="text-xs text-muted-foreground">Click a sector to view top stocks</span>
          </div>

          {selectedSector && (
            <button
              onClick={() => setSelectedSector(null)}
              className="text-xs text-indigo-600 hover:underline font-semibold"
            >
              Clear Sector Filter
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-44 bg-slate-100 rounded-2xl animate-pulse border border-slate-200" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {sectors.map((sec) => {
              const colors = getSectorColor(sec.momentumScore);
              const isSelected = selectedSector === sec.sector;

              return (
                <div
                  key={sec.sector}
                  onClick={() => setSelectedSector(isSelected ? null : sec.sector)}
                  className={`relative p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                    colors.bg
                  } ${
                    isSelected
                      ? 'ring-2 ring-indigo-600 ring-offset-2 shadow-lg ' + colors.glow
                      : 'hover:shadow-md'
                  }`}
                >
                  {/* Top: Sector Name and Trend Badge */}
                  <div>
                    <div className="flex items-start justify-between gap-1 mb-2">
                      <h3 className="text-sm font-bold truncate tracking-tight">{sec.sector}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 uppercase ${colors.badge}`}>
                        {sec.trend}
                      </span>
                    </div>

                    {/* Momentum Meter Bar */}
                    <div className="w-full bg-slate-200/60 rounded-full h-1.5 overflow-hidden my-2">
                      <div
                        className={`h-full rounded-full ${colors.bar}`}
                        style={{ width: `${Math.max(10, Math.min(100, (sec.momentumScore + 1) * 50))}%` }}
                      />
                    </div>
                  </div>

                  {/* Returns Matrix */}
                  <div className="grid grid-cols-3 gap-1 py-2 text-center border-t border-b border-black/5 my-2">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">5D</p>
                      <p className={`text-xs font-bold ${sec.return5d >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {formatPercent(sec.return5d)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">20D</p>
                      <p className={`text-xs font-bold ${sec.return20d >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {formatPercent(sec.return20d)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">60D</p>
                      <p className={`text-xs font-bold ${sec.return60d >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {formatPercent(sec.return60d)}
                      </p>
                    </div>
                  </div>

                  {/* Bottom Stats */}
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                    <span>{sec.stocksCount} Stocks</span>
                    <span className="font-semibold">Vol: {sec.volumeTrend.toFixed(2)}x</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Sector or Highlighted Stocks Section */}
      <div className="bg-white border border-border rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              <h2 className="text-base font-bold text-foreground">
                {selectedSector ? `${selectedSector} — Top Momentum Stocks` : 'Top Rated Indian Equities'}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ranked by quant momentum score, volume breakout strength, and dual Gemini + Groq AI agreement.
            </p>
          </div>

          <button
            onClick={() => navigate('/picks')}
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <span>View Full AI Recommendations</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Stock Picks Table / Cards */}
        {isPicksLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading top equities...</div>
        ) : sectorPicks.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No stock picks found for this sector. Try selecting another sector or run a fresh scan.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sectorPicks.slice(0, 6).map((pick) => {
              const agreement = pick.aiAnalysis?.agreementStatus || 'agree';
              const agreementColor = 
                agreement === 'agree' 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : agreement === 'partially_agree'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200';

              return (
                <div
                  key={pick.symbol}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground">{pick.symbol}</span>
                        <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                          {pick.marketCap}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{pick.companyName}</p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{formatINR(pick.price)}</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${agreementColor}`}>
                        AI: {agreement.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Signal tags */}
                  <div className="flex flex-wrap gap-1">
                    {pick.signals.slice(0, 2).map((sig, i) => (
                      <span key={i} className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-medium">
                        {sig}
                      </span>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                    <button
                      onClick={() => navigate(`/orchestration?ticker=${pick.symbol}`)}
                      className="text-indigo-600 hover:text-indigo-800 font-semibold"
                    >
                      Analyze Debate →
                    </button>
                    <button
                      onClick={() => navigate('/paper-portfolio')}
                      className="text-emerald-600 hover:text-emerald-800 font-semibold"
                    >
                      + Virtual Buy
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
