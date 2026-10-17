import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, XCircle, Clock, TrendingUp, TrendingDown, BrainCircuit, ChevronDown, ChevronUp, AlertOctagon, Loader2 } from 'lucide-react';
import { proposalService, type TradeProposalItem } from '@/services/proposalService';

export function ProposalsPage() {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [killSwitchAlert, setKillSwitchAlert] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const { data: proposals = [], isLoading } = useQuery<TradeProposalItem[]>({
    queryKey: ['proposals'],
    queryFn: () => proposalService.getProposals(),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => proposalService.approveProposal(id),
    onSuccess: (data) => {
      setKillSwitchAlert(null);
      setSuccessBanner(data.message || 'Proposal approved and order routed to broker!');
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setTimeout(() => setSuccessBanner(null), 5000);
    },
    onError: (err: any) => {
      if (err?.status === 403 || err?.message?.toLowerCase().includes('kill switch')) {
        setKillSwitchAlert('Trading is HALTED: Kill switch is currently engaged. You must disengage the Kill Switch in the top bar before approving new orders.');
      } else {
        alert(`Approval error: ${err?.message || 'Failed to approve proposal'}`);
      }
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => proposalService.rejectProposal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    },
    onError: (err: any) => {
      alert(`Rejection error: ${err?.message || 'Failed to reject proposal'}`);
    },
  });

  const pendingCount = proposals.filter((p) => p.status === 'pending').length;
  const approvedCount = proposals.filter((p) => p.status === 'approved').length;
  const rejectedCount = proposals.filter((p) => p.status === 'rejected').length;

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Trade Proposals</h1>
        <p className="text-sm text-muted-foreground mt-1">Multi-agent committee recommendations awaiting your approval</p>
      </div>

      {killSwitchAlert && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-center gap-3 shadow-sm">
          <AlertOctagon className="h-6 w-6 text-red-600 shrink-0" />
          <div className="flex-1">
            <h4 className="text-sm font-bold">Execution Blocked by Kill Switch</h4>
            <p className="text-xs mt-0.5">{killSwitchAlert}</p>
          </div>
        </div>
      )}

      {successBanner && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-3 shadow-sm">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <p className="text-sm font-semibold">{successBanner}</p>
        </div>
      )}

      {/* Status pills */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: 'Pending Review', count: pendingCount, color: 'bg-yellow-50 text-yellow-800 border-yellow-200' },
          { label: 'Approved', count: approvedCount, color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
          { label: 'Rejected', count: rejectedCount, color: 'bg-red-50 text-red-800 border-red-200' },
        ].map((s) => (
          <div key={s.label} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${s.color}`}>
            <span>{s.label}</span>
            <span className="font-bold">{s.count}</span>
          </div>
        ))}
      </div>

      {/* Proposals List */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3 bg-white border border-border rounded-xl">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
          <p className="text-sm text-muted-foreground">Loading proposals from Confluence Multi-Agent Engine...</p>
        </div>
      ) : proposals.length === 0 ? (
        <div className="py-16 text-center bg-white border border-border rounded-xl">
          <BrainCircuit className="h-10 w-10 text-indigo-400 mx-auto mb-3" />
          <p className="text-base font-semibold text-foreground">No proposals generated yet.</p>
          <p className="text-sm text-muted-foreground mt-1">Go to Watchlist and click "Run Analysis" on any ticker to trigger a multi-agent debate.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {proposals.map((p) => {
            const isPending = p.status === 'pending';
            const isApproved = p.status === 'approved';

            return (
              <div key={p.id} className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
                {/* Header row */}
                <div
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-5 cursor-pointer hover:bg-slate-50 transition-colors gap-4"
                  onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${p.action === 'buy' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                      {p.action === 'buy' ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg font-bold text-foreground">{p.ticker}</span>
                        <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-md ${p.action === 'buy' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                          {p.action}
                        </span>
                        <span className="text-xs text-muted-foreground">{p.horizon || '5d'} horizon</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded uppercase ${
                          isPending ? 'bg-amber-100 text-amber-800' :
                          isApproved ? 'bg-emerald-100 text-emerald-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {p.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {p.suggestedQty || p.suggestedQuantity || 10} shares @ ${(p.price || 150.0).toFixed(2)} • Size: {p.suggestedSizePct || 5}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">AI Confidence</p>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${(p.confidence || 0.7) * 100}%` }} />
                        </div>
                        <span className="text-sm font-bold text-indigo-600">{((p.confidence || 0.7) * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                    <Clock className="h-4 w-4 text-muted-foreground hidden sm:block" />
                    <span className="text-xs text-muted-foreground hidden sm:block">
                      {p.createdAt ? new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                    </span>
                    {expanded === p.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>

                {/* Expanded Detail */}
                {expanded === p.id && (
                  <div className="border-t border-border p-5 space-y-5 bg-slate-50">
                    <div className="flex items-start gap-3 bg-indigo-50/70 border border-indigo-100 rounded-lg p-4">
                      <BrainCircuit className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                      <p className="text-sm text-slate-700 leading-relaxed font-normal">
                        {p.rationale || "Consensus formed across Bull and Bear research agents following probabilistic forecaster validation."}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded-lg border border-border">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-2">Bull Arguments</h4>
                        <ul className="space-y-1.5">
                          {(p.bullArgs || ['Positive momentum crossover', 'Earnings growth trajectory']).map((a, i) => (
                            <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                              <span className="text-emerald-500 font-bold">✓</span>
                              {a}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-border">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-red-600 mb-2">Bear Arguments</h4>
                        <ul className="space-y-1.5">
                          {(p.bearArgs || ['Market volatility resistance', 'Macro correlation risk']).map((a, i) => (
                            <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                              <span className="text-red-500 font-bold">⚠</span>
                              {a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {isPending ? (
                      <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <button
                          onClick={() => approveMutation.mutate(p.id)}
                          disabled={approveMutation.isPending}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold rounded-lg transition-colors shadow-md shadow-emerald-500/20 text-sm"
                        >
                          {approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                          Approve Proposal (Submit Order)
                        </button>
                        <button
                          onClick={() => rejectMutation.mutate(p.id)}
                          disabled={rejectMutation.isPending}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold rounded-lg transition-colors text-sm shadow-sm"
                        >
                          {rejectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                          Reject Proposal
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-2 text-xs font-semibold text-muted-foreground uppercase">
                        This proposal is {p.status}.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
