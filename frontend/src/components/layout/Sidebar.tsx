import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Layers, Sparkles, Wallet, Network, List, History, Settings, X, Cpu
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuthStore } from '@/store/authStore';
import { useLanguageStore } from '@/store/languageStore';
import logoImg from '@/assets/logo.png';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const { user } = useAuthStore();
  const { t } = useLanguageStore();

  const navigation = [
    { name: t('dashboard'), href: '/dashboard', icon: LayoutDashboard },
    { name: t('sectors'), href: '/sectors', icon: Layers, badge: 'NSE' },
    { name: t('picks'), href: '/picks', icon: Sparkles, badge: 'AI' },
    { name: 'ML Screener', href: '/ml-picks', icon: Cpu, badge: 'ML' },
    { name: t('portfolio'), href: '/paper-portfolio', icon: Wallet },
    { name: t('debate'), href: '/orchestration', icon: Network },
    { name: t('watchlist'), href: '/watchlist', icon: List },
    { name: t('orders'), href: '/orders', icon: History },
    { name: t('settings'), href: '/settings/risk', icon: Settings },
  ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-border shadow-lg flex flex-col transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:flex lg:flex-col lg:shadow-none",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center justify-between px-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <img src={logoImg} alt="TradeVault Logo" className="h-8 w-auto object-contain rounded-md" />
            <div className="flex flex-col">
              <span className="text-base font-bold text-foreground tracking-tight leading-tight">TradeVault</span>
              <span className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider">India NSE • AI Agent</span>
            </div>
          </div>
          <button
            className="lg:hidden p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-slate-100"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col px-3 py-4 overflow-y-auto custom-scrollbar gap-1">
          {navigation.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                cn(
                  'group flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <item.icon
                      className={cn(
                        'h-4.5 w-4.5 shrink-0 transition-colors',
                        isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                      )}
                    />
                    <span className="truncate">{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider",
                      item.badge === 'AI'
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-emerald-100 text-emerald-800'
                    )}>
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
            <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0 uppercase">
              {user?.name?.[0] || 'T'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate capitalize">{user?.name || 'Trader'}</p>
              <p className="text-[11px] text-emerald-600 font-medium truncate">₹ Paper Portfolio</p>
            </div>
            <div className="ml-auto h-2 w-2 rounded-full bg-emerald-500 shrink-0" title="Connected to NSE Data Feed" />
          </div>
        </div>
      </div>
    </>
  );
}
