import { useEffect, useState } from 'react';
import { Clock, Sparkles, CheckCircle2, AlertTriangle, Moon, Calendar } from 'lucide-react';
import { useMarketStatusStore } from '@/store/marketStatusStore';
import { formatCountdown, formatISTNextOpen } from '@/utils/istDate';

export function MarketStatusBanner() {
  const { status, secondsLeft, demoOverride, fetchStatus, setDemoOverride, decrementCountdown } =
    useMarketStatusStore();
  const [showDemoMenu, setShowDemoMenu] = useState(false);

  // Initial fetch and visibility change handler
  useEffect(() => {
    fetchStatus();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchStatus]);

  // Polling logic:
  // - When OPEN: poll every 45s while tab is visible.
  // - When closed: fetch once, then only local countdown decrements every 1s.
  useEffect(() => {
    if (!status?.is_open) return;

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchStatus();
      }
    }, 45000);

    return () => clearInterval(interval);
  }, [status?.is_open, fetchStatus]);

  // Local 1-second countdown ticker when closed/pre-open
  useEffect(() => {
    if (secondsLeft <= 0) return;

    const timer = setInterval(() => {
      decrementCountdown();
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft, decrementCountdown]);

  if (!status) return null;

  const state = status.state;
  const isDemo = status.is_demo || Boolean(demoOverride);

  // Determine appearance & message based on state
  let bannerBg = 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300';
  let dotBg = 'bg-slate-400';
  let IconComponent = Clock;
  let statusText = '';

  switch (state) {
    case 'OPEN':
      bannerBg = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200';
      dotBg = 'bg-emerald-500 animate-pulse';
      IconComponent = CheckCircle2;
      statusText = 'Market open - closes 3:30 PM IST';
      break;

    case 'PRE_OPEN':
      bannerBg = 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200';
      dotBg = 'bg-amber-500 animate-pulse';
      IconComponent = AlertTriangle;
      statusText = `Pre-open - opens in ${formatCountdown(secondsLeft)}. Showing previous session's picks`;
      break;

    case 'AFTER_CLOSE':
      bannerBg = 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300';
      dotBg = 'bg-slate-400';
      IconComponent = Clock;
      statusText = `Today market is closed. Opens next on ${formatISTNextOpen(status.next_open_ist)}`;
      break;

    case 'OVERNIGHT':
      bannerBg = 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300';
      dotBg = 'bg-indigo-400';
      IconComponent = Moon;
      statusText = `Today market is closed (Overnight). Opens next on ${formatISTNextOpen(status.next_open_ist)} (${formatCountdown(secondsLeft)})`;
      break;

    case 'WEEKEND':
      bannerBg = 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300';
      dotBg = 'bg-slate-400';
      IconComponent = Calendar;
      statusText = `Today market is closed (Weekend). Opens next on ${formatISTNextOpen(status.next_open_ist)}`;
      break;

    case 'HOLIDAY':
      bannerBg = 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300';
      dotBg = 'bg-rose-400';
      IconComponent = Calendar;
      statusText = `Today market is closed (${status.reason || 'NSE Holiday'}). Opens next on ${formatISTNextOpen(status.next_open_ist)}`;
      break;

    default:
      statusText = `Today market is closed. Opens next on ${formatISTNextOpen(status.next_open_ist)}`;
  }

  return (
    <div
      className={`w-full border-b px-4 py-2 text-xs transition-colors flex items-center justify-between gap-3 ${bannerBg}`}
    >
      <div className="flex items-center gap-2.5 truncate mx-auto sm:mx-0">
        <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${dotBg}`} />
        <IconComponent className="h-3.5 w-3.5 shrink-0 opacity-75" />
        <span className="font-semibold tracking-wide">{statusText}</span>
      </div>

      <div className="hidden sm:flex items-center gap-2 shrink-0">
        <span className="text-[11px] opacity-75">All times Asia/Kolkata (IST)</span>

        {/* Demo Mode Badge & Dev Switcher */}
        {isDemo && (
          <div className="relative">
            <button
              onClick={() => setShowDemoMenu(!showDemoMenu)}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-violet-600 text-white text-[10px] font-bold tracking-wider hover:bg-violet-700 transition-colors shadow-sm"
              title="Demo Market Hours Override Active. Click to test other states."
            >
              <Sparkles className="h-3 w-3" />
              DEMO MODE: {state}
            </button>

            {showDemoMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 rounded-md shadow-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-1 z-50 text-xs">
                <div className="px-3 py-1 text-[10px] uppercase font-semibold text-slate-400 border-b border-slate-100 dark:border-slate-700">
                  Simulate Market State
                </div>
                {(['OPEN', 'PRE_OPEN', 'AFTER_CLOSE', 'OVERNIGHT', 'WEEKEND', 'HOLIDAY'] as const).map(
                  (testState) => (
                    <button
                      key={testState}
                      onClick={() => {
                        setDemoOverride(testState);
                        setShowDemoMenu(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between ${
                        state === testState ? 'font-semibold text-violet-600' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {testState}
                      {state === testState && <span className="h-1.5 w-1.5 rounded-full bg-violet-600" />}
                    </button>
                  )
                )}
                <div className="border-t border-slate-100 dark:border-slate-700 my-1" />
                <button
                  onClick={() => {
                    setDemoOverride(null);
                    setShowDemoMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                >
                  Clear Demo Override
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
