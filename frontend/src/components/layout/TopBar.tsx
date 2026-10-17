import { ShieldAlert, Bell, Menu, LogOut, Loader2, CheckCheck, X, TrendingUp, ShoppingCart, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useKillSwitchStore } from '@/store/killSwitchStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useNavigate } from 'react-router-dom';

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const { user, logout } = useAuthStore();
  const { isEngaged, toggle, isLoading: isKillSwitchLoading } = useKillSwitchStore();
  const { notifications, unreadCount, markAllAsRead, activeToast, dismissToast } = useNotificationStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleKillSwitchToggle = async () => {
    try {
      await toggle();
    } catch (err: any) {
      alert(`Kill Switch Error: ${err?.message || 'Operation failed'}`);
    }
  };

  const recentNotifications = notifications.slice(0, 4);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-x-4 border-b border-border bg-white px-4 md:px-6 shadow-sm z-30 relative">
      {/* Floating In-App Toast Alert */}
      {activeToast && (
        <div className="absolute top-18 right-6 z-50 max-w-sm w-full bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-indigo-500/30 flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
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

      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-1 text-muted-foreground hover:text-foreground hover:bg-slate-100 rounded-md transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground bg-slate-50 border border-border px-3 py-1.5 rounded-full">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Market Open • Confluence Engine Active
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {/* Global Kill Switch */}
        <button
          onClick={handleKillSwitchToggle}
          disabled={isKillSwitchLoading}
          title={isEngaged ? "Trading is HALTED globally. Click to disengage." : "Emergency Kill Switch. Click to halt all orders."}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all border shadow-sm ${
            isEngaged
              ? 'bg-red-600 hover:bg-red-700 text-white border-red-700 animate-pulse shadow-red-500/30'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-border hover:border-slate-300'
          }`}
        >
          {isKillSwitchLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-current" />
          ) : (
            <ShieldAlert className={`h-4 w-4 ${isEngaged ? 'text-white' : 'text-slate-500'}`} />
          )}
          <span className="hidden sm:inline">{isEngaged ? 'HALTED (CLICK TO RESUME)' : 'Kill Switch'}</span>
        </button>

        {/* Notifications Bell & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotificationMenu(!showNotificationMenu)}
            className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-slate-100 rounded-lg transition-colors"
            title="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotificationMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowNotificationMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-border rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
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
                      className="text-[11px] text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-border">
                  {recentNotifications.length === 0 ? (
                    <div className="py-8 text-center px-4">
                      <Bell className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">No recent notifications</p>
                    </div>
                  ) : (
                    recentNotifications.map((notif, idx) => (
                      <div
                        key={notif._id || notif.id || idx}
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
                      navigate('/settings/notifications');
                    }}
                    className="text-muted-foreground hover:text-foreground font-medium px-2 py-1"
                  >
                    Settings
                  </button>
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
        <div className="h-6 w-px bg-border" />

        {/* Profile */}
        <div className="relative">
          <button 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 hover:bg-slate-50 rounded-lg px-2 py-1.5 transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0 uppercase">
              {user?.name?.[0] || 'T'}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-foreground capitalize">{user?.name || 'Trader'}</p>
              <p className="text-xs text-muted-foreground">Paper Trading Mode</p>
            </div>
          </button>

          {/* Profile Dropdown */}
          {showProfileMenu && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowProfileMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-white border border-border rounded-xl shadow-lg overflow-hidden z-50">
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
    </header>
  );
}
