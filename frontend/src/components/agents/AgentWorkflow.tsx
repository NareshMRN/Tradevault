import { motion } from 'framer-motion';
import { Network, ArrowDown, Brain, Settings2, BarChart2, MessageSquare, ShieldAlert } from 'lucide-react';

export const AgentWorkflow = () => {
  return (
    <div className="bg-white border border-border rounded-xl shadow-sm p-5 flex flex-col">
      <div className="flex items-center gap-2 mb-6 border-b border-border pb-4">
        <Network className="h-5 w-5 text-indigo-600" />
        <h3 className="text-sm font-semibold text-foreground">Agent Orchestration</h3>
      </div>

      <div className="flex flex-col items-center gap-2 w-full">
        {/* User Request */}
        <div className="bg-indigo-600 text-white px-5 py-2 rounded-full text-xs font-bold shadow-md shadow-indigo-500/30">
          USER REQUEST
        </div>
        <ArrowDown className="h-4 w-4 text-slate-300" />

        {/* Orchestrator */}
        <div className="bg-slate-100 border border-border px-5 py-2 rounded-lg text-xs font-semibold text-foreground flex items-center gap-2">
          <Settings2 className="h-3.5 w-3.5 text-indigo-500" />
          Orchestrator
        </div>
        <ArrowDown className="h-4 w-4 text-slate-300" />

        {/* Analyst agents row */}
        <div className="flex gap-2 w-full justify-center">
          {[
            { icon: BarChart2, label: 'Technical', color: 'emerald' },
            { icon: MessageSquare, label: 'News', color: 'blue' },
            { icon: Brain, label: 'Fundamental', color: 'purple' },
          ].map(({ icon: Icon, label, color }) => (
            <div key={label} className={`flex-1 max-w-[110px] flex flex-col items-center gap-1 p-2 rounded-lg bg-${color}-50 border border-${color}-100`}>
              <Icon className={`h-4 w-4 text-${color}-600`} />
              <span className={`text-[10px] font-semibold text-${color}-700`}>{label}</span>
            </div>
          ))}
        </div>
        <ArrowDown className="h-4 w-4 text-slate-300" />

        {/* Debate */}
        <div className="bg-amber-50 border border-amber-100 px-5 py-2 rounded-lg text-xs font-semibold text-amber-700">
          Bull vs Bear Debate
        </div>
        <ArrowDown className="h-4 w-4 text-slate-300" />

        {/* Risk */}
        <div className="bg-orange-50 border border-orange-100 px-5 py-2 rounded-lg text-xs font-semibold text-orange-700 flex items-center gap-2">
          <ShieldAlert className="h-3.5 w-3.5" /> Risk Analyst
        </div>
        <ArrowDown className="h-4 w-4 text-slate-300" />

        {/* Final */}
        <motion.div
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/30"
        >
          <Brain className="h-4 w-4" /> Portfolio Manager (Final)
        </motion.div>
      </div>
    </div>
  );
};
