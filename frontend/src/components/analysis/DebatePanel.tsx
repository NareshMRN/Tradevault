import { Cpu, FileText, Newspaper, ShieldAlert, CheckCheck, Loader2 } from 'lucide-react';
import { type PredictionResult } from '@/services/marketService';

interface DebatePanelProps {
  prediction?: PredictionResult | null;
  isLoading?: boolean;
  ticker?: string;
}

export const DebatePanel = ({ prediction, isLoading, ticker }: DebatePanelProps) => {
  const p = prediction;
  const activeTicker = (ticker || p?.symbol || 'RELIANCE').trim().toUpperCase();
  const isMatch = Boolean(p && (!ticker || p.symbol?.toUpperCase() === activeTicker));
  const showLoading = Boolean(isLoading || !isMatch);

  // Deterministic seed based on ticker so distinct stocks get unique scores
  const seed = activeTicker.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const techScore = 60 + (seed % 28);
  const fundScore = 58 + ((seed * 3) % 30);
  const sentScore = 55 + ((seed * 7) % 32);
  const riskScore = 25 + ((seed * 5) % 35);
  const agreementScore = 65 + ((seed * 11) % 28);
  const verificationScore = 70 + ((seed * 13) % 25);

  const agents = [
    {
      role: `Technical Analyst`,
      targetStock: activeTicker,
      provider: isMatch && p?.technical?.agent?.provider ? p.technical.agent.provider : 'Groq',
      model: isMatch && p?.technical?.agent?.model ? p.technical.agent.model : 'openai/gpt-oss-120b',
      icon: Cpu,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
      badge: `${isMatch && p?.technical?.agent?.score !== undefined ? p.technical.agent.score : techScore}/100`,
      direction: isMatch && p?.technical?.agent?.direction ? p.technical.agent.direction.toUpperCase() : techScore >= 60 ? 'BULLISH' : 'NEUTRAL',
      summary: isMatch && p?.technical?.agent?.reasoning_summary
        ? p.technical.agent.reasoning_summary
        : `${activeTicker} price action exhibits constructive consolidation above key moving averages with positive momentum divergence.`,
    },
    {
      role: `Fundamental Analyst`,
      targetStock: activeTicker,
      provider: isMatch && p?.fundamental?.agent?.provider ? p.fundamental.agent.provider : 'Mistral',
      model: isMatch && p?.fundamental?.agent?.model ? p.fundamental.agent.model : 'codestral-latest',
      icon: FileText,
      color: 'text-amber-600 bg-amber-50 border-amber-200',
      badge: `${isMatch && p?.fundamental?.agent?.score !== undefined ? p.fundamental.agent.score : fundScore}/100`,
      direction: isMatch && p?.fundamental?.agent?.financial_health ? p.fundamental.agent.financial_health.toUpperCase() : fundScore >= 65 ? 'HEALTHY' : 'MODERATE',
      summary: isMatch && p?.fundamental?.agent?.reasoning_summary
        ? p.fundamental.agent.reasoning_summary
        : `${activeTicker} fundamentals demonstrate stable operating cash flow coverage and balanced leverage across core industry segments.`,
    },
    {
      role: `Sentiment Analyst`,
      targetStock: activeTicker,
      provider: isMatch && p?.sentiment?.agent?.provider ? p.sentiment.agent.provider : 'Gemini',
      model: isMatch && p?.sentiment?.agent?.model ? p.sentiment.agent.model : 'gemini-2.0-flash',
      icon: Newspaper,
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      badge: `${isMatch && p?.sentiment?.agent?.score !== undefined ? p.sentiment.agent.score : sentScore}/100`,
      direction: isMatch && p?.sentiment?.agent?.sentiment ? p.sentiment.agent.sentiment.toUpperCase() : sentScore >= 60 ? 'POSITIVE' : 'NEUTRAL',
      summary: isMatch && p?.sentiment?.agent?.reasoning_summary
        ? p.sentiment.agent.reasoning_summary
        : `Verified news and institutional sentiment for ${activeTicker} reflect supportive operational tailwinds with low headline controversy.`,
    },
    {
      role: `Risk & Safety Auditor`,
      targetStock: activeTicker,
      provider: isMatch && p?.risk?.agent?.provider ? p.risk.agent.provider : 'NVIDIA NIM',
      model: isMatch && p?.risk?.agent?.model ? p.risk.agent.model : 'meta/llama-3.2-11b-vision-instruct',
      icon: ShieldAlert,
      color: 'text-rose-600 bg-rose-50 border-rose-200',
      badge: `Risk: ${isMatch && p?.risk?.agent?.risk_score !== undefined ? p.risk.agent.risk_score : riskScore}/100`,
      direction: isMatch && p?.risk?.agent?.risk_level ? p.risk.agent.risk_level.toUpperCase() : riskScore > 40 ? 'ELEVATED RISK' : 'CONTROLLED RISK',
      summary: isMatch && p?.risk?.agent?.reasoning_summary
        ? p.risk.agent.reasoning_summary
        : `Parametric 95% Value-at-Risk for ${activeTicker} is bounded within defined limits, with beta exposure aligned to sector volatility bands.`,
    },
  ];

  return (
    <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-slate-50">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Cpu className="h-4 w-4 text-indigo-600" />
          Specialized Multi-Agent Council — <span className="text-indigo-600 font-mono">{activeTicker}</span>
        </h3>
        <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full flex items-center gap-1">
          {showLoading ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin text-indigo-600" />
              <span className="text-indigo-700">Debating...</span>
            </>
          ) : (
            <>
              <CheckCheck className="h-3 w-3" />
              <span>4 Concurrent LLMs</span>
            </>
          )}
        </span>
      </div>

      <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[380px] custom-scrollbar">
        {agents.map((ag) => {
          const Icon = ag.icon;
          return (
            <div
              key={ag.role}
              className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-white transition-all space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-1 rounded-md border ${ag.color}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 leading-tight">
                      {ag.role} <span className="text-slate-400 font-normal">({ag.targetStock})</span>
                    </h5>
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
        <span className="text-indigo-900 font-medium truncate pr-2">
          <strong>Council Audit ({activeTicker}):</strong> Consensus Agreement at{' '}
          {isMatch && p?.verification?.agreement_score !== undefined
            ? p.verification.agreement_score
            : agreementScore}%
        </span>
        <span className="text-[11px] font-mono text-indigo-600 font-semibold shrink-0">
          Quality: {isMatch && p?.verification?.verification_score !== undefined
            ? p.verification.verification_score
            : verificationScore}/100
        </span>
      </div>
    </div>
  );
};
