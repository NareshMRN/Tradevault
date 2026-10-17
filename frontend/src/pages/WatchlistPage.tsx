import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Trash2, TrendingUp, TrendingDown, Activity, Play, Loader2, ArrowUpRight, X, ExternalLink } from 'lucide-react';
import { watchlistService, type WatchlistEnrichedItem } from '@/services/watchlistService';

export function WatchlistPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WatchlistEnrichedItem | null>(null);
  const [newTicker, setNewTicker] = useState('');
  const [assetClass, setAssetClass] = useState<'equity' | 'crypto'>('equity');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const { data: watchlistItems = [], isLoading } = useQuery<WatchlistEnrichedItem[]>({
    queryKey: ['watchlist'],
    queryFn: watchlistService.getWatchlist,
    refetchInterval: 5000, // Poll live rates every 5 seconds
  });

  const addMutation = useMutation({
    mutationFn: ({ ticker, assetClass }: { ticker: string; assetClass: 'equity' | 'crypto' }) =>
      watchlistService.addTicker(ticker, assetClass),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      setShowAddModal(false);
      setNewTicker('');
      setActionMessage('Ticker successfully added to watchlist.');
      setTimeout(() => setActionMessage(null), 3000);
    },
    onError: (err: any) => {
      alert(`Error adding ticker: ${err?.message || 'Failed'}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => watchlistService.removeTicker(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      if (selectedItem) setSelectedItem(null);
    },
  });

  const runAnalysisMutation = useMutation({
    mutationFn: (ticker: string) => watchlistService.runAnalysis(ticker, '5d'),
    onSuccess: (_data, ticker) => {
      setActionMessage(`Multi-agent analysis triggered for ${ticker}! Live debate committee running.`);
      setTimeout(() => setActionMessage(null), 4000);
    },
    onError: (err: any) => {
      alert(`Analysis error: ${err?.message || 'Failed to trigger run'}`);
    },
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicker.trim()) return;
    addMutation.mutate({ ticker: newTicker.trim().toUpperCase(), assetClass });
  };

  const handleOpenInDashboard = (ticker: string) => {
    localStorage.setItem('confluence_active_ticker', ticker);
    navigate('/');
  };

  const filtered = watchlistItems.filter((i) =>
    i.ticker.toLowerCase().includes(search.toLowerCase()) ||
    (i.companyName && i.companyName.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Watchlist & Industries</h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {watchlistItems.length} industries tracked • Live real-time market rates & multi-agent intelligence
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors shadow-lg shadow-indigo-500/20 text-sm"
        >
          <Plus className="h-4 w-4" />
          Add Ticker
        </button>
      </div>

      {actionMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg flex items-center gap-2 shadow-sm">
          <Activity className="h-4 w-4 text-emerald-600 animate-pulse" />
          {actionMessage}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search tracked tickers or company names..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-80 bg-white border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
            <p className="text-sm text-muted-foreground">Loading enriched watchlist & live market quotes...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-base font-semibold text-foreground">No tickers in your watchlist yet.</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Add your first stock from search or click below to start tracking live rates.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg shadow-sm"
            >
              Add Ticker Now
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-slate-50">
                <tr>
                  <th className="py-3.5 pl-6 pr-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Company / Industry</th>
                  <th className="px-3 py-3.5 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Live Stock Rate</th>
                  <th className="px-3 py-3.5 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">Asset Class</th>
                  <th className="px-3 py-3.5 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Factor Composite</th>
                  <th className="px-3 py-3.5 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground hidden md:table-cell">Momentum</th>
                  <th className="px-3 py-3.5 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground hidden lg:table-cell">5D Forecast Target</th>
                  <th className="px-3 py-3.5 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">AI Signal</th>
                  <th className="px-3 py-3.5 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-white">
                {filtered.map((item) => {
                  const score = item.factors?.compositeScore;
                  const signal = score != null ? (score > 0.25 ? 'Bullish' : score < -0.25 ? 'Bearish' : 'Neutral') : 'Pending';
                  const mom = item.factors?.momentumScore ?? 0;
                  const curSymbol = item.currency === 'INR' ? '₹' : '$';
                  const isPos = (item.change ?? 0) >= 0;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                    >
                      <td className="whitespace-nowrap py-4 pl-6 pr-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-foreground font-mono group-hover:text-indigo-600 transition-colors">{item.ticker}</span>
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                              {item.currency === 'INR' ? 'NSE' : 'US'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">{item.companyName || `${item.ticker} Industry`}</p>
                        </div>
                      </td>

                      {/* Live Stock Rate Column */}
                      <td className="whitespace-nowrap px-3 py-4 text-right">
                        <div>
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-sm font-bold font-mono text-foreground">
                              {curSymbol}{item.price ? item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                            </span>
                          </div>
                          <p className={`text-xs font-semibold ${isPos ? 'text-emerald-600' : 'text-red-500'}`}>
                            {isPos ? '+' : ''}{curSymbol}{(item.change ?? 0).toFixed(2)} ({isPos ? '+' : ''}{(item.changePct ?? 0).toFixed(2)}%)
                          </p>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-3 py-4 text-center">
                        <span className="text-xs uppercase font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {item.assetClass}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-3 py-4 text-sm font-mono text-right text-foreground">
                        {item.factors ? item.factors.compositeScore.toFixed(3) : '—'}
                      </td>

                      <td className="whitespace-nowrap px-3 py-4 text-sm text-right hidden md:table-cell">
                        <div className={`flex items-center justify-end gap-1 ${mom >= 0 ? 'text-profit' : 'text-loss'}`}>
                          {mom >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                          <span className="font-semibold">{item.factors ? mom.toFixed(3) : '—'}</span>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-3 py-4 text-sm text-right text-slate-600 hidden lg:table-cell font-mono">
                        {item.forecast ? `${curSymbol}${item.forecast.median.toFixed(2)}` : '—'}
                      </td>

                      <td className="whitespace-nowrap px-3 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          signal === 'Bullish' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20' :
                          signal === 'Bearish' ? 'bg-red-50 text-red-700 ring-1 ring-red-600/20' :
                          'bg-slate-100 text-slate-700 ring-1 ring-slate-400/20'
                        }`}>
                          <Activity className="h-3 w-3" />
                          {signal}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-3 py-4 pr-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenInDashboard(item.ticker)}
                            className="p-1.5 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                            title="Open in Live Dashboard"
                          >
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => runAnalysisMutation.mutate(item.ticker)}
                            disabled={runAnalysisMutation.isPending}
                            className="p-1.5 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                            title="Run Multi-Agent Committee Analysis"
                          >
                            <Play className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Remove ${item.ticker} from watchlist?`)) {
                                deleteMutation.mutate(item.id);
                              }
                            }}
                            className="p-1.5 rounded-md bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                            title="Remove"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Live Stock Rate Modal on Click */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-foreground font-mono">{selectedItem.ticker}</h3>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 uppercase">
                    {selectedItem.assetClass}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    LIVE FEED
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{selectedItem.companyName || `${selectedItem.ticker} Industry`}</p>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Live Stock Rate Highlight */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground font-semibold">Current Live Rate</span>
                <p className="text-3xl font-extrabold font-mono text-foreground mt-1">
                  {selectedItem.currency === 'INR' ? '₹' : '$'}
                  {selectedItem.price ? selectedItem.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                </p>
              </div>
              <div className="text-right">
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                  (selectedItem.change ?? 0) >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                }`}>
                  {(selectedItem.change ?? 0) >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {(selectedItem.change ?? 0) >= 0 ? '+' : ''}{(selectedItem.change ?? 0).toFixed(2)} ({(selectedItem.changePct ?? 0).toFixed(2)}%)
                </span>
                <p className="text-[11px] text-muted-foreground mt-1">Prev: {selectedItem.currency === 'INR' ? '₹' : '$'}{selectedItem.previousClose?.toFixed(2) ?? '—'}</p>
              </div>
            </div>

            {/* Factor & AI Signals */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-white border border-border rounded-lg">
                <span className="text-xs text-muted-foreground">Quant Composite</span>
                <p className="text-lg font-bold font-mono text-foreground mt-0.5">
                  {selectedItem.factors?.compositeScore != null ? selectedItem.factors.compositeScore.toFixed(3) : '—'}
                </p>
              </div>
              <div className="p-3 bg-white border border-border rounded-lg">
                <span className="text-xs text-muted-foreground">5D Target Forecast</span>
                <p className="text-lg font-bold font-mono text-indigo-600 mt-0.5">
                  {selectedItem.currency === 'INR' ? '₹' : '$'}{selectedItem.forecast?.median.toFixed(2) ?? '—'}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => handleOpenInDashboard(selectedItem.ticker)}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open in Live Dashboard
              </button>
              <button
                onClick={() => {
                  runAnalysisMutation.mutate(selectedItem.ticker);
                  setSelectedItem(null);
                }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5"
              >
                <Play className="h-4 w-4 text-indigo-600" />
                Analyze
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-foreground mb-4">Add Ticker to Watchlist</h3>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Symbol / Ticker</label>
                <input
                  type="text"
                  placeholder="e.g. AAPL, RELIANCE.NS, BTC-USD"
                  value={newTicker}
                  onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
                  className="w-full bg-white border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Asset Class</label>
                <select
                  value={assetClass}
                  onChange={(e) => setAssetClass(e.target.value as any)}
                  className="w-full bg-white border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="equity">Equity (Stock)</option>
                  <option value="crypto">Crypto</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-foreground rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addMutation.isPending}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  {addMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {addMutation.isPending ? 'Adding...' : 'Add Ticker'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
