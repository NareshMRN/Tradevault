import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Wallet, RefreshCw, RotateCcw, 
  ArrowUpRight, ArrowDownRight, Layers, AlertCircle, CheckCircle2, Plus
} from 'lucide-react';
import { 
  paperPortfolioService, 
  type PaperPortfolioSummary, 
  type PaperPosition
} from '@/services/paperPortfolioService';
import { useLanguageStore } from '@/store/languageStore';
import { formatINR, formatPercent } from '@/utils/formatters';

export function PaperPortfolioPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { t } = useLanguageStore();

  // Reset confirmation dialog state
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Quick Sell Modal state
  const [sellModalPos, setSellModalPos] = useState<PaperPosition | null>(null);
  const [sellQuantity, setSellQuantity] = useState<number>(1);
  const [sellSubmitting, setSellSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Portfolio query with 5s auto polling
  const { data: summary, isLoading, isFetching } = useQuery<PaperPortfolioSummary>({
    queryKey: ['paper-portfolio'],
    queryFn: paperPortfolioService.getPortfolio,
    refetchInterval: 5000,
  });

  // Reset portfolio mutation
  const handleReset = async () => {
    setResetting(true);
    try {
      await paperPortfolioService.resetPortfolio();
      queryClient.invalidateQueries({ queryKey: ['paper-portfolio'] });
      setShowResetConfirm(false);
      setActionMessage({ type: 'success', text: 'Portfolio balance successfully reset to ₹10,00,000 INR.' });
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err?.message || 'Failed to reset portfolio.' });
    } finally {
      setResetting(false);
    }
  };

  // Sell execution
  const handleExecuteSell = async () => {
    if (!sellModalPos) return;
    setSellSubmitting(true);
    setActionMessage(null);

    try {
      await paperPortfolioService.executeOrder({
        symbol: sellModalPos.symbol,
        action: 'SELL',
        quantity: sellQuantity,
        orderType: 'MARKET',
      });

      queryClient.invalidateQueries({ queryKey: ['paper-portfolio'] });
      setActionMessage({
        type: 'success',
        text: `Successfully sold ${sellQuantity} shares of ${sellModalPos.symbol}!`,
      });
      setTimeout(() => {
        setSellModalPos(null);
        setActionMessage(null);
      }, 1500);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err?.message || 'Failed to place sell order.' });
    } finally {
      setSellSubmitting(false);
    }
  };

  const totalCapital = summary?.totalCapital ?? 1000000;
  const availableCash = summary?.availableCash ?? 1000000;
  const investedCapital = summary?.investedCapital ?? 0;
  const currentValue = summary?.currentValue ?? 0;
  const totalPnL = summary?.totalPnL ?? 0;
  const totalPnLPercent = summary?.totalPnLPercent ?? 0;
  const unrealizedPnL = summary?.unrealizedPnL ?? 0;
  const realizedPnL = summary?.realizedPnL ?? 0;
  const winRate = summary?.winRate ?? 0;
  const positions = summary?.positions ?? [];
  const recentOrders = summary?.recentOrders ?? [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Action Notification Banner */}
      {actionMessage && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2 duration-200 ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-slate-600 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-border p-6 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{t('portfolio')}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live mark-to-market simulation in Indian Rupees (INR) with real-time NSE price feeds.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['paper-portfolio'] })}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded-xl text-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{t('reset_portfolio')}</span>
          </button>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Net Worth */}
        <div className="bg-white border border-border p-4 rounded-2xl shadow-sm space-y-1">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">{t('virtual_net_worth')}</p>
          <p className="text-lg font-bold text-foreground">{formatINR(totalCapital)}</p>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${totalPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {totalPnL >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {formatPercent(totalPnLPercent)}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Val: {formatINR(currentValue, { compact: true })}</span>
          </div>
        </div>

        {/* Available Cash */}
        <div className="bg-white border border-border p-4 rounded-2xl shadow-sm space-y-1">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">{t('available_cash')}</p>
          <p className="text-lg font-bold text-foreground">{formatINR(availableCash)}</p>
          <span className="text-[10px] text-slate-400 font-medium">Unallocated capital</span>
        </div>

        {/* Invested Capital */}
        <div className="bg-white border border-border p-4 rounded-2xl shadow-sm space-y-1">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">{t('invested_capital')}</p>
          <p className="text-lg font-bold text-foreground">{formatINR(investedCapital)}</p>
          <span className="text-[10px] text-indigo-600 font-medium">{positions.length} active stocks</span>
        </div>

        {/* Unrealized P&L */}
        <div className="bg-white border border-border p-4 rounded-2xl shadow-sm space-y-1">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">{t('unrealized_pnl')}</p>
          <p className={`text-lg font-bold ${unrealizedPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatINR(unrealizedPnL, { showSign: true })}
          </p>
          <span className="text-[10px] text-slate-400 font-medium">Open positions</span>
        </div>

        {/* Realized P&L */}
        <div className="bg-white border border-border p-4 rounded-2xl shadow-sm space-y-1">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">{t('realized_pnl')}</p>
          <p className={`text-lg font-bold ${realizedPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatINR(realizedPnL, { showSign: true })}
          </p>
          <span className="text-[10px] text-slate-400 font-medium">Closed trades</span>
        </div>

        {/* Win Rate */}
        <div className="bg-white border border-border p-4 rounded-2xl shadow-sm space-y-1">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">{t('win_rate')}</p>
          <p className="text-lg font-bold text-foreground">
            {summary?.tradesCount ? `${(winRate * 100).toFixed(0)}%` : '—'}
          </p>
          <span className="text-[10px] text-slate-400 font-medium">
            {summary?.tradesCount ?? 0} {t('total_trades')}
          </span>
        </div>
      </div>

      {/* Open Positions Table */}
      <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">{t('open_positions')}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live portfolio holdings marked to current market quotes.
            </p>
          </div>

          <button
            onClick={() => navigate('/picks')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Discover Stocks to Buy</span>
          </button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading virtual holdings...</div>
        ) : positions.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Layers className="h-10 w-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">No Open Positions</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Your virtual INR portfolio is 100% in cash. Visit Top Picks or the Sector Heatmap to allocate capital!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-border font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">{t('symbol')}</th>
                  <th className="px-4 py-3.5">{t('qty')}</th>
                  <th className="px-4 py-3.5">{t('avg_price')}</th>
                  <th className="px-4 py-3.5">{t('current_price')}</th>
                  <th className="px-4 py-3.5">{t('market_value')}</th>
                  <th className="px-4 py-3.5">{t('unrealized_pnl')}</th>
                  <th className="px-5 py-3.5 text-right">{t('action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-slate-700">
                {positions.map((pos) => {
                  const isProfit = pos.unrealizedPnL >= 0;

                  return (
                    <tr key={pos.symbol} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-4 font-bold text-foreground">
                        <div>
                          <span className="text-sm">{pos.symbol}</span>
                          <span className="block text-[11px] text-muted-foreground font-normal">{pos.companyName || 'NSE Equity'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 font-semibold">{pos.quantity} shares</td>
                      <td className="px-4 py-4 font-medium">{formatINR(pos.averageEntryPrice)}</td>
                      <td className="px-4 py-4 font-bold text-foreground">{formatINR(pos.currentPrice)}</td>
                      <td className="px-4 py-4 font-bold text-foreground">{formatINR(pos.marketValue)}</td>
                      <td className="px-4 py-4">
                        <span className={`font-bold block ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {formatINR(pos.unrealizedPnL, { showSign: true })}
                        </span>
                        <span className={`text-[10px] font-semibold ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {formatPercent(pos.unrealizedPnLPercent)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSellModalPos(pos);
                              setSellQuantity(pos.quantity);
                            }}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            Sell
                          </button>
                          <button
                            onClick={() => navigate(`/orchestration?ticker=${pos.symbol}`)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Debate
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

      {/* Recent Paper Orders Table */}
      <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">{t('recent_orders')}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Audit log of simulated virtual trades.</p>
          </div>
          <span className="text-xs text-slate-500 font-semibold">{recentOrders.length} orders logged</span>
        </div>

        {recentOrders.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No recent orders yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-border font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3">Time</th>
                  <th className="px-4 py-3">{t('symbol')}</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">{t('qty')}</th>
                  <th className="px-4 py-3">Exec Price</th>
                  <th className="px-4 py-3">Total Value</th>
                  <th className="px-5 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-slate-700">
                {recentOrders.slice(0, 8).map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3 text-slate-400">
                      {new Date(order.executedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 font-bold text-foreground">{order.symbol}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          order.action === 'BUY'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {order.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{order.quantity}</td>
                    <td className="px-4 py-3 font-semibold">{formatINR(order.executedPrice)}</td>
                    <td className="px-4 py-3 font-bold">{formatINR(order.totalValue)}</td>
                    <td className="px-5 py-3 text-right">
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Sell Modal */}
      {sellModalPos && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-border space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <span className="p-1 rounded bg-rose-100 text-rose-700 font-bold text-xs">SELL</span>
                  <span>Close Position: {sellModalPos.symbol}</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Realize your virtual profit or loss at current market price.
                </p>
              </div>
              <button onClick={() => setSellModalPos(null)} className="text-slate-400 hover:text-slate-600 font-bold text-sm">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Holding</p>
                  <p className="text-sm font-bold text-foreground">{sellModalPos.quantity} sh</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Avg Buy</p>
                  <p className="text-sm font-bold text-foreground">{formatINR(sellModalPos.averageEntryPrice)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Current LTP</p>
                  <p className="text-sm font-bold text-emerald-700">{formatINR(sellModalPos.currentPrice)}</p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">Quantity to Sell</label>
                  <button
                    onClick={() => setSellQuantity(sellModalPos.quantity)}
                    className="text-[11px] text-indigo-600 font-bold hover:underline"
                  >
                    Sell All ({sellModalPos.quantity})
                  </button>
                </div>

                <input
                  type="number"
                  min="1"
                  max={sellModalPos.quantity}
                  value={sellQuantity}
                  onChange={(e) =>
                    setSellQuantity(Math.min(sellModalPos.quantity, Math.max(1, parseInt(e.target.value) || 1)))
                  }
                  className="w-full text-center bg-white border border-border rounded-xl py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Estimated Credit Value:</span>
                <span className="font-bold text-slate-900 text-sm">
                  {formatINR(sellQuantity * sellModalPos.currentPrice)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSellModalPos(null)}
                className="w-1/3 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteSell}
                disabled={sellSubmitting}
                className="w-2/3 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-600/25 flex items-center justify-center gap-1.5"
              >
                {sellSubmitting && <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                <span>Confirm Virtual SELL</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-border space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3 bg-rose-50 text-rose-700 rounded-2xl w-fit">
              <RotateCcw className="h-6 w-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-foreground">Reset Paper Portfolio?</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                This will liquidate all current holdings and reset your account back to ₹10,00,000 INR starting capital. This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="w-1/2 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={resetting}
                className="w-1/2 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-600/25 flex items-center justify-center gap-1.5"
              >
                {resetting && <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                <span>Confirm Reset</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
