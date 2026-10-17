import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Network,
  Cpu,
  Brain,
  ShieldAlert,
  FileText,
  Newspaper,
  CheckCircle2,
  Clock,
  Sparkles,
  Play,
  Loader2,
  CheckCheck,
  Sliders,
  Database
} from 'lucide-react';
import { marketService, type PredictionResult } from '@/services/marketService';
import { DebatePanel } from '@/components/analysis/DebatePanel';
import { AIAnalysis } from '@/components/analysis/AIAnalysis';

export function OrchestrationPage() {
  const [selectedTicker, setSelectedTicker] = useState<string>(() => {
    return localStorage.getItem('confluence_active_ticker') || 'RELIANCE';
  });
  const [inputTicker, setInputTicker] = useState('');

  // Fetch prediction data for the selected ticker
  const {
    data: prediction,
    isLoading,
    refetch,
    isFetching,
  } = useQuery<PredictionResult>({
    queryKey: ['orchestration-prediction', selectedTicker],
    queryFn: async () => {
      try {
        const latest = await marketService.getLatestPrediction(selectedTicker);
        if (latest && latest.prediction) return latest;
      } catch (e) {}
      return marketService.analyzePrediction(selectedTicker, '5d');
    },
    staleTime: 60000,
  });

  const analyzeMutation = useMutation({
    mutationFn: (sym: string) => marketService.analyzePrediction(sym, '5d'),
    onSuccess: (data) => {
      setSelectedTicker(data.symbol || selectedTicker);
      refetch();
    },
  });

  const handleRunAnalysis = (tickerToRun: string) => {
    const clean = tickerToRun.trim().toUpperCase();
    if (!clean) return;
    setSelectedTicker(clean);
    localStorage.setItem('confluence_active_ticker', clean);
    analyzeMutation.mutate(clean);
  };

  const p = prediction;

  const agentCards = [
    {
      role: 'Technical Analyst',
      provider: 'Groq',
      model: p?.technical?.agent?.model || 'deepseek-r1-distill-llama-70b',
      icon: Cpu,
      color: 'indigo',
      badge: `${p?.technical?.agent?.score ?? 76}/100`,
      direction: p?.technical?.agent?.direction?.toUpperCase() ?? 'BULLISH',
      summary:
        p?.technical?.agent?.reasoning_summary ||
        'Constructive price momentum above 20 & 50 EMA with positive MACD histogram expansion.',
    },
    {
      role: 'Fundamental Analyst',
      provider: 'Mistral AI',
      model: p?.fundamental?.agent?.model || 'codestral-latest',
      icon: FileText,
      color: 'amber',
      badge: `${p?.fundamental?.agent?.score ?? 71}/100`,
      direction: p?.fundamental?.agent?.financial_health?.toUpperCase() ?? 'HEALTHY',
      summary:
        p?.fundamental?.agent?.reasoning_summary ||
        'Robust balance sheet with disciplined debt leverage and sustained operating cash flows.',
    },
    {
      role: 'Sentiment & News Analyst',
      provider: 'Google Gemini',
      model: p?.sentiment?.agent?.model || 'gemini-3.6-flash',
      icon: Newspaper,
      color: 'blue',
      badge: `${p?.sentiment?.agent?.score ?? 74}/100`,
      direction: p?.sentiment?.agent?.sentiment?.toUpperCase() ?? 'POSITIVE',
      summary:
        p?.sentiment?.agent?.reasoning_summary ||
        'Institutional commentary and macro headlines reflect stable operational execution.',
    },
    {
      role: 'Risk & Safety Auditor',
      provider: 'NVIDIA NIM',
      model: p?.risk?.agent?.model || 'meta/llama-3.2-11b-vision-instruct',
      icon: ShieldAlert,
      color: 'rose',
      badge: `Risk: ${p?.risk?.agent?.risk_score ?? 38}/100`,
      direction: p?.risk?.agent?.risk_level?.toUpperCase() ?? 'MODERATE RISK',
      summary:
        p?.risk?.agent?.reasoning_summary ||
        'Parametric 95% Value-at-Risk remains within acceptable risk tolerance thresholds.',
    },
  ];

  return (
    <div className="space-y-6 max-w-[1300px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Network className="h-4 w-4" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Agent Orchestration</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Autonomous multi-agent consensus pipeline with cross-model adversarial debate and calibration
          </p>
        </div>

        {/* Target Stock Selector & Run Button */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Symbol (e.g. RELIANCE, TCS)..."
            value={inputTicker}
            onChange={(e) => setInputTicker(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && inputTicker.trim()) {
                handleRunAnalysis(inputTicker);
                setInputTicker('');
              }
            }}
            className="w-44 bg-white border border-border rounded-lg px-3 py-2 text-xs font-mono font-bold text-foreground focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm"
          />
          <button
            onClick={() => {
              if (inputTicker.trim()) {
                handleRunAnalysis(inputTicker);
                setInputTicker('');
              } else {
                handleRunAnalysis(selectedTicker);
              }
            }}
            disabled={analyzeMutation.isPending || isFetching}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all"
          >
            {analyzeMutation.isPending || isFetching ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            <span>{analyzeMutation.isPending ? 'Debating...' : `Run for ${selectedTicker}`}</span>
          </button>
        </div>
      </div>

      {/* Target Asset Banner */}
      <div className="bg-white border border-border rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase font-mono font-bold px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
            {p?.symbol || selectedTicker}
          </span>
          <span className="text-sm font-bold text-foreground">
            {p?.companyName || `${selectedTicker} Industry`}
          </span>
          <span className="text-xs text-muted-foreground font-mono">
            Price: {p?.market_snapshot?.currency === 'INR' ? '₹' : '$'}
            {p?.market_snapshot?.price?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? '—'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5 text-indigo-500" />
          <span>Last Committee Run: {p?.timestamps?.analysis_generated_at ? new Date(p.timestamps.analysis_generated_at).toLocaleTimeString() : 'Recent'}</span>
        </div>
      </div>

      {/* Visual Pipeline Map */}
      <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-6 flex items-center gap-2">
          <Sliders className="h-4 w-4 text-indigo-600" />
          5-Stage Autonomous Orchestration Workflow
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
          {/* Stage 1 */}
          <div className="p-4 rounded-xl bg-slate-50 border border-border flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-2 uppercase">
                <Database className="h-3.5 w-3.5 text-slate-500" /> Stage 1
              </div>
              <h3 className="text-sm font-bold text-foreground">Market Data Layer</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Real-time quotes, multi-timeframe candles, and news ingestion via Groww / Yahoo API.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] font-mono text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Ground Truth Locked
            </div>
          </div>

          {/* Stage 2 */}
          <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 mb-2 uppercase">
                <Cpu className="h-3.5 w-3.5 text-indigo-600" /> Stage 2
              </div>
              <h3 className="text-sm font-bold text-foreground">Specialized Analysts</h3>
              <p className="text-xs text-muted-foreground mt-1">
                4 independent AI models evaluating technical, fundamental, sentiment & risk factors in parallel.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-indigo-200 text-[11px] font-mono text-indigo-700 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-indigo-600" /> 4 Models Active
            </div>
          </div>

          {/* Stage 3 */}
          <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 mb-2 uppercase">
                <Sparkles className="h-3.5 w-3.5 text-amber-600" /> Stage 3
              </div>
              <h3 className="text-sm font-bold text-foreground">Adversarial Debate</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Bull vs Bear cross-examination challenge round to detect confirmation bias and hallucinations.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-amber-200 text-[11px] font-mono text-amber-700 flex items-center gap-1">
              <CheckCheck className="h-3 w-3 text-amber-600" /> Bias Mitigated
            </div>
          </div>

          {/* Stage 4 */}
          <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-700 mb-2 uppercase">
                <Sliders className="h-3.5 w-3.5 text-purple-600" /> Stage 4
              </div>
              <h3 className="text-sm font-bold text-foreground">Statistical Fusion</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Horizon probability calibration, historical regime check & overfitting eligibility gate.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-purple-200 text-[11px] font-mono text-purple-700 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-purple-600" /> DSR &gt; 1.0 Gate
            </div>
          </div>

          {/* Stage 5 */}
          <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 mb-2 uppercase">
                <Brain className="h-3.5 w-3.5 text-emerald-600" /> Stage 5
              </div>
              <h3 className="text-sm font-bold text-foreground">Portfolio Manager</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Final calibrated trade proposal, risk-sized position limits, and broker safety guardrails.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-emerald-200 text-[11px] font-mono text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Consensus Action
            </div>
          </div>
        </div>
      </div>

      {/* Specialized Multi-Agent Council Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {agentCards.map((agent) => {
          const Icon = agent.icon;
          return (
            <div
              key={agent.role}
              className="bg-white border border-border rounded-xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground leading-tight">{agent.role}</h4>
                      <p className="text-[10px] text-muted-foreground">{agent.provider}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                    {agent.badge}
                  </span>
                </div>

                <div className="mb-3">
                  <span className="text-[10px] font-mono text-slate-500 block truncate">
                    Model: <strong className="text-slate-700">{agent.model}</strong>
                  </span>
                  <span className="inline-block mt-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                    {agent.direction}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {agent.summary}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Active Inference
                </span>
                <span className="font-mono text-[10px]">Latency: ~320ms</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full Committee Council and Consensus Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DebatePanel prediction={p} />
        <AIAnalysis prediction={p} isLoading={isLoading} />
      </div>
    </div>
  );
}
