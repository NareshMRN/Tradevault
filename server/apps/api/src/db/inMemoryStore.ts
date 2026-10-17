import bcrypt from "bcryptjs";
import mongoose from "mongoose";

export interface DevUser {
  _id: any;
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  role: "user" | "admin";
  createdAt: Date;
  updatedAt: Date;
}

export interface DevRiskProfile {
  userId: any;
  riskCategory: "conservative" | "balanced" | "aggressive";
  allocatableCapital: number;
  maxPositionPct: number;
  maxDailyLossPct: number;
  liveTradingEnabled: boolean;
  updatedAt: Date;
}

class InMemoryStore {
  private users: Map<string, DevUser> = new Map();
  private riskProfiles: Map<string, DevRiskProfile> = new Map();
  private killSwitches: Map<string, boolean> = new Map();

  constructor() {
    this.seedDefaultUser();
  }

  private async seedDefaultUser() {
    try {
      const demoHash = await bcrypt.hash("password123", 10);
      const demoId = new mongoose.Types.ObjectId();
      const demoUser: DevUser = {
        _id: demoId,
        id: demoId.toString(),
        email: "demo@confluence.trade",
        passwordHash: demoHash,
        displayName: "Demo Trader",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.users.set("demo@confluence.trade", demoUser);
      this.riskProfiles.set(demoId.toString(), {
        userId: demoId,
        riskCategory: "balanced",
        allocatableCapital: 50000,
        maxPositionPct: 10,
        maxDailyLossPct: 3,
        liveTradingEnabled: false,
        updatedAt: new Date(),
      });
    } catch (e) {}
  }

  public isDbConnected(): boolean {
    return mongoose.connection.readyState === 1;
  }

  public async findUserByEmail(email: string): Promise<DevUser | null> {
    return this.users.get(email.toLowerCase()) || null;
  }

  public async findUserById(id: string): Promise<DevUser | null> {
    for (const u of this.users.values()) {
      if (u.id === id || u._id?.toString() === id) {
        return u;
      }
    }
    return null;
  }

  public async createUser(data: {
    email: string;
    passwordHash: string;
    displayName: string;
    role?: "user" | "admin";
  }): Promise<DevUser> {
    const id = new mongoose.Types.ObjectId();
    const user: DevUser = {
      _id: id,
      id: id.toString(),
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      displayName: data.displayName,
      role: data.role || "user",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(data.email.toLowerCase(), user);

    // Initialize default risk profile
    this.riskProfiles.set(id.toString(), {
      userId: id,
      riskCategory: "balanced",
      allocatableCapital: 25000,
      maxPositionPct: 10,
      maxDailyLossPct: 3,
      liveTradingEnabled: false,
      updatedAt: new Date(),
    });

    return user;
  }

  public getRiskProfile(userId: string): DevRiskProfile {
    return (
      this.riskProfiles.get(userId) || {
        userId: new mongoose.Types.ObjectId(userId),
        riskCategory: "balanced",
        allocatableCapital: 25000,
        maxPositionPct: 10,
        maxDailyLossPct: 3,
        liveTradingEnabled: false,
        updatedAt: new Date(),
      }
    );
  }

  public setRiskProfile(userId: string, profile: Partial<DevRiskProfile>): DevRiskProfile {
    const existing = this.getRiskProfile(userId);
    const updated = { ...existing, ...profile, updatedAt: new Date() };
    this.riskProfiles.set(userId, updated);
    return updated;
  }

  public isKillSwitchEngaged(userId: string): boolean {
    return this.killSwitches.get(userId) ?? false;
  }

  public setKillSwitch(userId: string, isEngaged: boolean): void {
    this.killSwitches.set(userId, isEngaged);
  }

  // Watchlist in-memory operations
  private watchlists: Map<string, DevWatchlistItem[]> = new Map();

  public getWatchlist(userId: string): DevWatchlistItem[] {
    if (!this.watchlists.has(userId)) {
      // Default pre-seeded watchlist for convenience
      const defaults: DevWatchlistItem[] = [
        { id: "wl_1", _id: "wl_1", userId, ticker: "RELIANCE", assetClass: "equity", createdAt: new Date() },
        { id: "wl_2", _id: "wl_2", userId, ticker: "TCS", assetClass: "equity", createdAt: new Date() },
        { id: "wl_3", _id: "wl_3", userId, ticker: "NVDA", assetClass: "equity", createdAt: new Date() },
        { id: "wl_4", _id: "wl_4", userId, ticker: "AAPL", assetClass: "equity", createdAt: new Date() },
      ];
      this.watchlists.set(userId, defaults);
    }
    return this.watchlists.get(userId) || [];
  }

  public addWatchlistItem(userId: string, ticker: string, assetClass: "equity" | "crypto" = "equity"): DevWatchlistItem {
    const list = this.getWatchlist(userId);
    const existing = list.find((item) => item.ticker === ticker);
    if (existing) return existing;

    const id = "wl_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    const newItem: DevWatchlistItem = {
      id,
      _id: id,
      userId,
      ticker,
      assetClass,
      createdAt: new Date(),
    };
    list.unshift(newItem);
    this.watchlists.set(userId, list);
    return newItem;
  }

  public removeWatchlistItem(userId: string, idOrTicker: string): boolean {
    const list = this.getWatchlist(userId);
    const filtered = list.filter((i) => i.id !== idOrTicker && i._id !== idOrTicker && i.ticker !== idOrTicker);
    this.watchlists.set(userId, filtered);
    return filtered.length !== list.length;
  }

  // Backtests in-memory operations
  private backtests: Map<string, DevBacktestItem[]> = new Map();

  public getBacktests(userId: string): DevBacktestItem[] {
    if (!this.backtests.has(userId)) {
      const defaults: DevBacktestItem[] = [
        {
          id: "bt_seeded_1",
          _id: "bt_seeded_1",
          userId,
          strategyName: "Multi-Agent Momentum Cross (Purged Walk-Forward)",
          tickerUniverse: ["RELIANCE", "TCS", "INFY"],
          startDate: "2023-01-01",
          endDate: "2024-01-01",
          sharpeRatio: 1.62,
          deflatedSharpeRatio: 1.28,
          probabilityOfBacktestOverfitting: 0.18,
          maxDrawdownPct: 11.4,
          isEligibleForPaperTrading: true,
          status: "completed",
          createdAt: new Date(Date.now() - 86400000 * 2),
          completedAt: new Date(Date.now() - 86400000 * 2 + 15000),
          details: {
            annualizedReturn: 28.4,
            annualizedVolatility: 14.2,
            winRate: 64.0,
            totalTrades: 38,
            benchmarkReturn: 16.5,
          },
        },
        {
          id: "bt_seeded_2",
          _id: "bt_seeded_2",
          userId,
          strategyName: "Mean Reversion & Volatility Filter",
          tickerUniverse: ["AAPL", "NVDA", "MSFT"],
          startDate: "2023-06-01",
          endDate: "2024-06-01",
          sharpeRatio: 1.48,
          deflatedSharpeRatio: 1.15,
          probabilityOfBacktestOverfitting: 0.22,
          maxDrawdownPct: 14.8,
          isEligibleForPaperTrading: true,
          status: "completed",
          createdAt: new Date(Date.now() - 86400000),
          completedAt: new Date(Date.now() - 86400000 + 12000),
          details: {
            annualizedReturn: 22.8,
            annualizedVolatility: 15.6,
            winRate: 59.2,
            totalTrades: 27,
            benchmarkReturn: 18.2,
          },
        },
      ];
      this.backtests.set(userId, defaults);
    }
    return this.backtests.get(userId) || [];
  }

  public createBacktest(
    userId: string,
    strategyName: string,
    tickerUniverse: string[],
    startDate: string,
    endDate: string
  ): DevBacktestItem {
    const list = this.getBacktests(userId);
    const id = "bt_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    const newItem: DevBacktestItem = {
      id,
      _id: id,
      userId,
      strategyName,
      tickerUniverse,
      startDate,
      endDate,
      status: "running",
      createdAt: new Date(),
    };
    list.unshift(newItem);
    this.backtests.set(userId, list);
    return newItem;
  }

  public updateBacktest(userId: string, id: string, patch: Partial<DevBacktestItem>): DevBacktestItem | null {
    const list = this.getBacktests(userId);
    const item = list.find((b) => b.id === id || b._id === id);
    if (!item) return null;
    Object.assign(item, patch);
    return item;
  }

  public getBacktestById(userId: string, id: string): DevBacktestItem | null {
    const list = this.getBacktests(userId);
    return list.find((b) => b.id === id || b._id === id) || null;
  }
}

export interface DevWatchlistItem {
  id: string;
  _id: string;
  userId: string;
  ticker: string;
  assetClass: "equity" | "crypto";
  createdAt: Date;
}

export interface DevBacktestItem {
  id: string;
  _id: string;
  userId: string;
  strategyName: string;
  tickerUniverse: string[];
  startDate: string;
  endDate: string;
  sharpeRatio?: number;
  deflatedSharpeRatio?: number;
  probabilityOfBacktestOverfitting?: number;
  maxDrawdownPct?: number;
  isEligibleForPaperTrading?: boolean;
  status: "pending" | "running" | "completed" | "failed";
  createdAt: Date;
  completedAt?: Date;
  details?: {
    annualizedReturn?: number;
    annualizedVolatility?: number;
    winRate?: number;
    totalTrades?: number;
    benchmarkReturn?: number;
  };
}

export const inMemoryStore = new InMemoryStore();
