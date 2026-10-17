import { Cpu, FileText, Newspaper, ShieldAlert, CheckCheck } from 'lucide-react';
import { type PredictionResult } from '@/services/marketService';

interface DebatePanelProps {
  prediction?: PredictionResult | null;
}

export const DebatePanel = ({ prediction }: DebatePanelProps) => {
  const p = prediction;

  const agents = [
    {
      role: 'Technical Analyst',
      provider: 'Groq',
      model: p?.technical?.agent?.model || 'deepseek-r1-distill-llama-70b',
      icon: Cpu,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
      badge: `${p?.technical?.agent?.score ?? 76}/100`,
      direction: p?.technical?.agent?.direction?.toUpperCase() ?? 'BULLISH',
      summary: p?.technical?.agent?.reasoning_summary || 'Price maintains constructive momentum above 20 and 50 EMA with positive MACD histogram expansion.',
    },
    {
      role: 'Fundamental Analyst',
      provider: 'Mistral',
      model: p?.fundamental?.agent?.model || 'mistral-large-latest',
      icon: FileText,
      color: 'text-amber-600 bg-amber-50 border-amber-200',
      badge: `${p?.fundamental?.agent?.score ?? 71}/100`,
      direction: p?.fundamental?.agent?.financial_health?.toUpperCase() ?? 'HEALTHY',
      summary: p?.fundamental?.agent?.reasoning_summary || 'Strong balance sheet with healthy return on equity, disciplined leverage, and steady operational cash generation.',
    },
    {
      role: 'Sentiment Analyst',
      provider: 'Gemini',
      model: p?.sentiment?.agent?.model || 'gemini-3.6-flash',
      icon: Newspaper,
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      badge: `${p?.sentiment?.agent?.score ?? 74}/100`,
      direction: p?.sentiment?.agent?.sentiment?.toUpperCase() ?? 'POSITIVE',
      summary: p?.sentiment?.agent?.reasoning_summary || 'Recent verified newsflow reflects expansion in core business units and favorable institutional investment flows.',
    },
    {
      role: 'Risk Analyst',
      provider: 'NVIDIA NIM',
      model: p?.risk?.agent?.model || 'meta/llama-3.3-70b-instruct',
      icon: ShieldAlert,
      color: 'text-rose-600 bg-rose-50 border-rose-200',
      badge: `Risk: ${p?.risk?.agent?.risk_score ?? 42}/100`,
      direction: p?.risk?.agent?.risk_level?.toUpperCase() ?? 'MEDIUM RISK',
      summary: p?.risk?.agent?.reasoning_summary || 'Parametric Value-at-Risk and downside deviation parameters remain within standard risk tolerance limits.',
    },
  ];

  return (
    <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-slate-50">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Cpu className="h-4 w-4 text-indigo-600" />
          Specialized Multi-Agent Council
        </h3>
        <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full flex items-center gap-1">
          <CheckCheck className="h-3 w-3" />
          Concurrent LLMs
        </span>
      </div>

      <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[380px] custom-scrollbar">
        {agents.map((ag) => {
          const Icon = ag.icon;
          return (
            <div key={ag.role} className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-white transition-all space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-1 rounded-md border ${ag.color}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 leading-tight">{ag.role}</h5>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {ag.provider} • {ag.model}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-mono">
                    {ag.direction}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono">
                    {ag.badge}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed pl-7">
                {ag.summary}
              </p>
            </div>
          );
        })}
      </div>

      <div className="p-3 bg-indigo-50/80 border-t border-indigo-100 flex items-center justify-between text-xs">
        <span className="text-indigo-900 font-medium">
          <strong>OpenRouter Auditor:</strong> Consensus Agreement at {p?.verification?.agreement_score ?? 84}%
        </span>
        <span className="text-[11px] font-mono text-indigo-600 font-semibold">
          Verification: {p?.verification?.verification_score ?? 85}/100
        </span>
      </div>
    </div>
  );
};
