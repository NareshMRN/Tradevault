import { Bell, Menu, LogOut, Globe, Sparkles, ChevronDown, X, ShoppingCart, TrendingUp, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useLanguageStore, type SupportedLanguage } from '@/store/languageStore';
import { useMarketStatusStore } from '@/store/marketStatusStore';
import { useNotificationStore } from '@/store/notificationStore';
import { formatISTNextOpen } from '@/utils/istDate';

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
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const { user, logout } = useAuthStore();
  const { language, setLanguage } = useLanguageStore();
  const { status } = useMarketStatusStore();
  const { notifications, unreadCount, markAllAsRead, activeToast, dismissToast } = useNotificationStore();
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
      : 'Market Closed';

  const recentNotifications = notifications.slice(0, 5);

  return (
    <header className="flex flex-col border-b border-border bg-white shadow-sm z-20 relative">
      {/* Floating In-App Toast Alert */}
      {activeToast && (
        <div className="absolute top-16 right-6 z-50 max-w-sm w-full bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-indigo-500/30 flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="h-8 w-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
            {activeToast.type === 'order' ? (
              <ShoppingCart className="h-4 w-4 text-emerald-400" />
            ) : (
              <TrendingUp className="h-4 w-4 text-indigo-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white tracking-tight truncate">{activeToast.title}</p>
            <p className="text-[11px] text-slate-300 line-clamp-2 mt-0.5">{activeToast.message}</p>
            <button
              onClick={() => {
                dismissToast();
                navigate('/notifications');
              }}
              className="mt-2 text-[10px] text-indigo-400 font-semibold hover:underline flex items-center gap-1"
            >
              Open Notifications <ExternalLink className="h-2.5 w-2.5" />
            </button>
          </div>
          <button
            onClick={dismissToast}
            className="text-slate-400 hover:text-white p-1 rounded-md"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

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
                setShowNotificationMenu(false);
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

          {/* Notifications Bell & Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotificationMenu(!showNotificationMenu);
                setShowProfileMenu(false);
                setShowLangMenu(false);
              }}
              className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-slate-100 rounded-lg transition-colors"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotificationMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowNotificationMenu(false)} />
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-border rounded-2xl shadow-xl overflow-hidden z-40 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markAllAsRead()}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-border">
                    {recentNotifications.length === 0 ? (
                      <div className="py-8 text-center text-xs text-muted-foreground">
                        No notifications yet.
                      </div>
                    ) : (
                      recentNotifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => {
                            setShowNotificationMenu(false);
                            navigate('/notifications');
                          }}
                          className={`p-3 text-left hover:bg-slate-50 cursor-pointer transition-colors ${
                            !notif.read ? 'bg-indigo-50/30' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs font-bold text-foreground truncate">{notif.title}</span>
                            {!notif.read && (
                              <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-2">{notif.message}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-2 border-t border-border bg-slate-50 flex items-center justify-between text-xs">
                    <button
                      onClick={() => {
                        setShowNotificationMenu(false);
                        navigate('/notifications');
                      }}
                      className="text-indigo-600 hover:text-indigo-700 font-bold px-2 py-1 hover:underline"
                    >
                      View all notifications →
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Divider */}
          <div className="h-5 w-px bg-border" />

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setShowLangMenu(false);
                setShowNotificationMenu(false);
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
