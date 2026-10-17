import { Bell, Menu, LogOut, Globe, Sparkles, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useLanguageStore, type SupportedLanguage } from '@/store/languageStore';
import { useMarketStatusStore } from '@/store/marketStatusStore';
import { formatISTNextOpen } from '@/utils/istDate';
import { useNavigate } from 'react-router-dom';

interface TopBarProps {
  onMenuClick: () => void;
}

const languages: { code: SupportedLanguage; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'EN' },
  { code: 'kn', label: 'ಕನ್ನಡ', native: 'KN' },
  { code: 'hi', label: 'हिन्दी', native: 'HI' },
];

export function TopBar({ onMenuClick }: TopBarProps) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const { user, logout } = useAuthStore();
  const { language, setLanguage } = useLanguageStore();
  const { status } = useMarketStatusStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const currentLang = languages.find((l) => l.code === language) || languages[0];

  const dotColor = status?.is_open
    ? 'bg-emerald-500 animate-pulse'
    : status?.state === 'PRE_OPEN'
      ? 'bg-amber-500 animate-pulse'
      : 'bg-slate-400';

  const statusLabel = status?.is_open
    ? 'NSE Open'
    : status?.state === 'PRE_OPEN'
      ? 'NSE Pre-Open'
      : 'Trading Closed Today';

  return (
    <header className="flex flex-col border-b border-border bg-white shadow-sm z-20">
      {/* SEBI Educational Disclaimer Banner */}
      {/* <div className="bg-amber-500/10 border-b border-amber-500/20 px-3 py-1.5 text-xs text-amber-900 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-medium truncate mx-auto text-[11px] sm:text-xs">
          <ShieldAlert className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          <span>{t('sebi_disclaimer')}</span>
        </div>
      </div> */}

      {/* Main Bar */}
      <div className="flex h-14 shrink-0 items-center justify-between gap-x-3 px-3 md:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-1 text-muted-foreground hover:text-foreground hover:bg-slate-100 rounded-md transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* NSE Market Badge */}
          <div
            title={status?.is_open ? 'Market is currently open' : `Today market is closed. Opens next on ${formatISTNextOpen(status?.next_open_ist)}`}
            className="hidden sm:flex items-center gap-2 text-xs text-slate-700 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full font-medium cursor-help"
          >
            <span className={`h-2 w-2 rounded-full ${dotColor}`} />
            <span>{statusLabel}</span>
            <span className="text-slate-400">•</span>
            <span className="text-indigo-600 font-semibold flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Gemini 2.5 + Groq
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {/* Language Switcher */}
          <div className="relative">
            <button
              onClick={() => {
                setShowLangMenu(!showLangMenu);
                setShowProfileMenu(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
              title="Select Language"
            >
              <Globe className="h-3.5 w-3.5 text-indigo-600" />
              <span>{currentLang.label}</span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>

            {showLangMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowLangMenu(false)} />
                <div className="absolute right-0 mt-1.5 w-36 bg-white border border-border rounded-xl shadow-lg py-1 z-40">
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => {
                        setLanguage(l.code);
                        setShowLangMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between font-medium transition-colors ${language === l.code ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                      <span>{l.label}</span>
                      <span className="text-[10px] text-slate-400 uppercase">{l.native}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Notifications */}
          <button className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-slate-100 rounded-lg transition-colors">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500 ring-2 ring-white" />
          </button>

          {/* Divider */}
          <div className="h-5 w-px bg-border" />

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setShowLangMenu(false);
              }}
              className="flex items-center gap-2 hover:bg-slate-50 rounded-lg px-2 py-1 transition-colors"
            >
              <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0 uppercase">
                {user?.name?.[0] || 'T'}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-foreground capitalize leading-tight">{user?.name || 'Trader'}</p>
                <p className="text-[10px] text-emerald-600 font-medium">Virtual INR</p>
              </div>
            </button>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowProfileMenu(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-white border border-border rounded-xl shadow-lg overflow-hidden z-40">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-sm font-semibold text-foreground truncate">{user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left font-medium"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
