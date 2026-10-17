import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCircle,
  TrendingUp,
  ShieldAlert,
  ShoppingCart,
  Trash2,
  CheckCheck,
  Sparkles,
  ExternalLink,
  Info,
  Clock,
  Radio,
} from "lucide-react";
import { useNotificationStore } from "@/store/notificationStore";
import { isFirebaseConfigured } from "@/lib/firebase";

export function NotificationsPage() {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    sendTest,
    pushPermission,
    requestPushPermission,
  } = useNotificationStore();

  const [filter, setFilter] = useState<"all" | "order" | "stock" | "risk">("all");
  const [testSymbol, setTestSymbol] = useState("RELIANCE");
  const [isSimulating, setIsSimulating] = useState(false);

  const filtered = notifications.filter((n) => {
    if (filter === "all") return true;
    return n.type === filter;
  });

  const handleTestNotification = async (type: "stock" | "order") => {
    setIsSimulating(true);
    await sendTest(type, testSymbol.trim().toUpperCase() || "RELIANCE");
    setIsSimulating(false);
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return "Just now";
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "order":
        return <ShoppingCart className="h-5 w-5 text-emerald-600" />;
      case "stock":
        return <TrendingUp className="h-5 w-5 text-indigo-600" />;
      case "risk":
        return <ShieldAlert className="h-5 w-5 text-amber-600" />;
      default:
        return <Bell className="h-5 w-5 text-slate-600" />;
    }
  };

  const getBadgeClass = (type: string) => {
    switch (type) {
      case "order":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "stock":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "risk":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-border rounded-2xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Notifications & Alerts</h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-600 text-white shadow-sm">
                {unreadCount} new
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Real-time push notifications for stock price breakouts, order execution fills, and algorithmic risk events.
          </p>
        </div>

        {/* Push Permission CTA */}
        <div className="flex items-center gap-3">
          {pushPermission === "granted" ? (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-800 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Web Push Active
            </div>
          ) : (
            <button
              onClick={() => requestPushPermission()}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all hover:scale-[1.02]"
            >
              <Radio className="h-4 w-4 animate-pulse" />
              Enable Push Notifications
            </button>
          )}
        </div>
      </div>

      {/* FCM & Simulation Control Bar */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-5 shadow-md border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-300">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            Live FCM Engine Dispatcher
          </div>
          <p className="text-xs text-slate-300">
            Simulate real-time WebSocket and native background push alerts directly on this device.
          </p>
          {!isFirebaseConfigured && (
            <p className="text-[11px] text-amber-300/90 flex items-center gap-1.5 pt-1">
              <Info className="h-3 w-3 shrink-0" />
              Running in simulated mode. Add Firebase credentials to <code>frontend/.env</code> to route through Google FCM servers.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={testSymbol}
            onChange={(e) => setTestSymbol(e.target.value.toUpperCase())}
            placeholder="SYMBOL"
            className="w-24 bg-white/10 border border-white/20 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-indigo-400 uppercase font-mono"
          />
          <button
            onClick={() => handleTestNotification("stock")}
            disabled={isSimulating}
            className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Stock Surge (+5%)
          </button>
          <button
            onClick={() => handleTestNotification("order")}
            disabled={isSimulating}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            Order Executed
          </button>
        </div>
      </div>

      {/* Filter Tabs & Bulk Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          {[
            { id: "all", label: "All Alerts", count: notifications.length },
            { id: "order", label: "Orders", count: notifications.filter((n) => n.type === "order").length },
            { id: "stock", label: "Stock Swings", count: notifications.filter((n) => n.type === "stock").length },
            { id: "risk", label: "Risk & Vetoes", count: notifications.filter((n) => n.type === "risk").length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                filter === tab.id
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    filter === tab.id ? "bg-indigo-100 text-indigo-700" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsRead()}
              className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={() => clearAll()}
              className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-rose-50 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Notifications Feed */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-border rounded-2xl p-12 text-center shadow-sm">
          <div className="h-16 w-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Bell className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-foreground mb-1">No notifications here yet</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-6">
            Whenever stock prices move significantly or automated paper trading orders are filled, your notification stream updates here automatically.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => handleTestNotification("stock")}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-sm transition-all"
            >
              Send Demo Stock Alert
            </button>
            <button
              onClick={() => handleTestNotification("order")}
              className="bg-slate-100 hover:bg-slate-200 text-foreground text-xs font-semibold px-4 py-2 rounded-xl transition-all"
            >
              Send Demo Order Fill
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item, idx) => {
            const notifId = item._id || item.id || `notif-${idx}`;
            return (
              <div
                key={notifId}
                className={`flex items-start gap-4 p-4 rounded-2xl border transition-all ${
                  item.read
                    ? "bg-white border-border hover:border-slate-300"
                    : "bg-indigo-50/40 border-indigo-100 shadow-sm hover:border-indigo-200"
                }`}
              >
                {/* Type Icon */}
                <div
                  className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border ${getBadgeClass(
                    item.type
                  )}`}
                >
                  {getIcon(item.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {item.symbol && (
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-900 text-white shadow-xs">
                        {item.symbol}
                      </span>
                    )}
                    <h4 className="text-sm font-bold text-foreground tracking-tight">{item.title}</h4>
                    {!item.read && (
                      <span className="h-2 w-2 rounded-full bg-indigo-600 ring-2 ring-indigo-200" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed mb-2.5">{item.message}</p>

                  <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(item.createdAt)}
                    </span>

                    {item.type === "order" && (
                      <button
                        onClick={() => navigate("/orders")}
                        className="text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 hover:underline"
                      >
                        View Orders
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    )}

                    {item.type === "stock" && item.symbol && (
                      <button
                        onClick={() => navigate("/watchlist")}
                        className="text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 hover:underline"
                      >
                        Watchlist
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Mark as read action */}
                {!item.read && (
                  <button
                    onClick={() => markAsRead(notifId)}
                    title="Mark as read"
                    className="p-1.5 text-muted-foreground hover:text-indigo-600 hover:bg-white rounded-lg transition-colors"
                  >
                    <CheckCircle className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
