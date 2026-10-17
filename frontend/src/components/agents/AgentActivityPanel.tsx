import { MOCK_AGENTS } from '@/services/mockData';
import { Database, LineChart, Briefcase, Newspaper, ShieldAlert, CheckCircle2, Loader2 } from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  Database, LineChart, Briefcase, Newspaper, ShieldAlert,
};

export const AgentActivityPanel = () => {
  return (
    <div className="bg-white border border-border rounded-xl shadow-sm flex flex-col h-full">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
          Agent Activity
        </h3>
        <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full ring-1 ring-indigo-100">Live</span>
      </div>

      <div className="p-3 flex-1 overflow-y-auto space-y-2 custom-scrollbar">
        {MOCK_AGENTS.map((agent) => {
          const Icon = iconMap[agent.icon] || Database;
          return (
            <div key={agent.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-border hover:border-slate-200 transition-all">
              <div className={`p-2 rounded-md shrink-0 ${agent.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' : agent.status === 'RUNNING' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-xs font-semibold text-foreground truncate pr-2">{agent.name}</p>
                  {agent.status === 'COMPLETED' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                  {agent.status === 'RUNNING' && <Loader2 className="h-3.5 w-3.5 text-indigo-500 animate-spin shrink-0" />}
                  {agent.status === 'IDLE' && <div className="h-1.5 w-1.5 rounded-full bg-slate-300 shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground truncate">{agent.message}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
