import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, LineChart, List, History, FileSearch, Settings, X, Network
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuthStore } from '@/store/authStore';
import logoImg from '@/assets/logo.png';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Watchlist', href: '/watchlist', icon: List },
  { name: 'Orchestration', href: '/orchestration', icon: Network },
  { name: 'Proposals', href: '/proposals', icon: FileSearch },
  { name: 'Backtests', href: '/backtests', icon: LineChart },
  { name: 'Orders', href: '/orders', icon: History },
  { name: 'Settings', href: '/settings/risk', icon: Settings },
];

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const { user } = useAuthStore();

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
            <span className="text-lg font-bold text-foreground tracking-tight">TradeVault</span>
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
              key={item.name}
              to={item.href}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={cn(
                      'h-5 w-5 shrink-0 transition-colors',
                      isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                    )}
                  />
                  {item.name}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50">
            <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0 uppercase">
              {user?.name?.[0] || 'T'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate capitalize">{user?.name || 'Trader'}</p>
              <p className="text-xs text-muted-foreground truncate">Paper Mode</p>
            </div>
            <div className="ml-auto h-2 w-2 rounded-full bg-emerald-500 shrink-0" title="Connected" />
          </div>
        </div>
      </div>
    </>
  );
}
