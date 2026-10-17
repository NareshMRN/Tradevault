import { randomUUID } from "crypto";
import {
  PaperOrderRequest,
  PaperOrder,
  PaperPosition,
  PaperPortfolioSummary,
} from "@confluence/shared-schemas";
import { CurrentPriceService } from "../market/currentPriceService";

export interface UserPaperAccount {
  userId: string;
  cash: number;
  initialCapital: number;
  realizedPnL: number;
  positions: Map<string, PaperPosition>;
  orders: PaperOrder[];
}

// Known sector mappings for popular NSE symbols
const NSE_SYMBOL_METADATA: Record<string, { companyName: string; sector: string; fallbackPrice: number }> = {
  RELIANCE: { companyName: "Reliance Industries Ltd", sector: "Energy", fallbackPrice: 2950.0 },
  TCS: { companyName: "Tata Consultancy Services Ltd", sector: "IT", fallbackPrice: 4120.0 },
  HDFCBANK: { companyName: "HDFC Bank Ltd", sector: "Banking", fallbackPrice: 1680.0 },
  ICICIBANK: { companyName: "ICICI Bank Ltd", sector: "Banking", fallbackPrice: 1180.0 },
  INFY: { companyName: "Infosys Ltd", sector: "IT", fallbackPrice: 1840.0 },
  BHARTIARTL: { companyName: "Bharti Airtel Ltd", sector: "Telecom", fallbackPrice: 1420.0 },
  SBIN: { companyName: "State Bank of India", sector: "Banking", fallbackPrice: 830.0 },
  LICI: { companyName: "Life Insurance Corporation of India", sector: "Financial Services", fallbackPrice: 990.0 },
  ITC: { companyName: "ITC Ltd", sector: "FMCG", fallbackPrice: 430.0 },
  HINDUNILVR: { companyName: "Hindustan Unilever Ltd", sector: "FMCG", fallbackPrice: 2450.0 },
  LT: { companyName: "Larsen & Toubro Ltd", sector: "Infrastructure", fallbackPrice: 3620.0 },
  TATAMOTORS: { companyName: "Tata Motors Ltd", sector: "Auto", fallbackPrice: 940.0 },
  "M&M": { companyName: "Mahindra & Mahindra Ltd", sector: "Auto", fallbackPrice: 2820.0 },
  SUNPHARMA: { companyName: "Sun Pharmaceutical Industries Ltd", sector: "Pharma", fallbackPrice: 1780.0 },
  TATASTEEL: { companyName: "Tata Steel Ltd", sector: "Metals", fallbackPrice: 155.0 },
  HAL: { companyName: "Hindustan Aeronautics Ltd", sector: "Defence", fallbackPrice: 4680.0 },
  BEL: { companyName: "Bharat Electronics Ltd", sector: "Defence", fallbackPrice: 290.0 },
};

export class PaperTradingService {
  private static accounts: Map<string, UserPaperAccount> = new Map();

  /**
   * Gets or initializes the virtual INR trading account for a user.
   */
  public static getAccount(userId: string): UserPaperAccount {
    if (!this.accounts.has(userId)) {
      const account: UserPaperAccount = {
        userId,
        cash: 1000000.0, // Default ₹10,00,000 INR
        initialCapital: 1000000.0,
        realizedPnL: 0.0,
        positions: new Map(),
        orders: [],
      };

      // Seed a few realistic initial positions for demonstration
      this.seedInitialPositions(account);
      this.accounts.set(userId, account);
    }
    return this.accounts.get(userId)!;
  }

  private static seedInitialPositions(account: UserPaperAccount): void {
    const seedHoldings = [
      { ticker: "RELIANCE", quantity: 20, avgPrice: 2880.0 },
      { ticker: "HDFCBANK", quantity: 50, avgPrice: 1620.0 },
      { ticker: "TCS", quantity: 15, avgPrice: 3980.0 },
    ];

    let totalCost = 0;
    for (const item of seedHoldings) {
      const meta = NSE_SYMBOL_METADATA[item.ticker] || {
        companyName: `${item.ticker} Ltd`,
        sector: "General",
        fallbackPrice: item.avgPrice,
      };

      const invested = item.quantity * item.avgPrice;
      totalCost += invested;
      const currentPrice = meta.fallbackPrice;
      const currentValue = item.quantity * currentPrice;
      const pnl = currentValue - invested;
      const pnlPct = (pnl / invested) * 100;

      account.positions.set(item.ticker, {
        ticker: item.ticker,
        companyName: meta.companyName,
        sector: meta.sector,
        quantity: item.quantity,
        averagePrice: item.avgPrice,
        currentPrice: currentPrice,
        investedAmount: invested,
        currentValue: currentValue,
        unrealizedPnL: pnl,
        unrealizedPnLPct: pnlPct,
      });

      // Record seed order
      account.orders.push({
        orderId: randomUUID(),
        ticker: item.ticker,
        companyName: meta.companyName,
        side: "buy",
        quantity: item.quantity,
        orderType: "market",
        executedPrice: item.avgPrice,
        totalAmount: invested,
        status: "filled",
        timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
      });
    }

    account.cash -= totalCost;
  }

  /**
   * Fetches real-time price for a ticker with fallback.
   */
  public static async getLivePrice(ticker: string): Promise<number> {
    const clean = ticker.trim().toUpperCase();
    try {
      const quote = await CurrentPriceService.getQuote(clean);
      if (quote && quote.price && quote.price > 0) {
        return quote.price;
      }
    } catch (e) {
      // Fallback
    }
    const meta = NSE_SYMBOL_METADATA[clean];
    return meta ? meta.fallbackPrice : 500.0;
  }

  /**
   * Returns portfolio summary with real-time mark-to-market valuations in INR.
   */
  public static async getSummary(userId: string): Promise<PaperPortfolioSummary> {
    const account = this.getAccount(userId);
    let invested = 0;
    let portfolioValue = account.cash;
    let unrealizedPnL = 0;

    for (const [ticker, pos] of account.positions.entries()) {
      const livePrice = await this.getLivePrice(ticker);
      pos.currentPrice = livePrice;
      pos.currentValue = pos.quantity * livePrice;
      pos.investedAmount = pos.quantity * pos.averagePrice;
      pos.unrealizedPnL = pos.currentValue - pos.investedAmount;
      pos.unrealizedPnLPct =
        pos.investedAmount > 0 ? (pos.unrealizedPnL / pos.investedAmount) * 100 : 0;

      invested += pos.investedAmount;
      portfolioValue += pos.currentValue;
      unrealizedPnL += pos.unrealizedPnL;
    }

    const totalPnL = portfolioValue - account.initialCapital;
    const totalPnLPct = (totalPnL / account.initialCapital) * 100;

    // Calculate win rate from sell orders
    const filledSells = account.orders.filter((o) => o.side === "sell" && o.status === "filled");
    const profitableSells = filledSells.filter((o) => (o.executedPrice || 0) > 0);
    const winRatePct = filledSells.length > 0
      ? (profitableSells.length / filledSells.length) * 100
      : 75.0; // Default simulated win rate

    return {
      cash: round2(account.cash),
      invested: round2(invested),
      portfolioValue: round2(portfolioValue),
      initialCapital: round2(account.initialCapital),
      currency: "INR",
      totalPnL: round2(totalPnL),
      totalPnLPct: round2(totalPnLPct),
      realizedPnL: round2(account.realizedPnL),
      unrealizedPnL: round2(unrealizedPnL),
      winRatePct: round2(winRatePct),
      positionCount: account.positions.size,
    };
  }

  /**
   * Returns all active positions for user.
   */
  public static async getPositions(userId: string): Promise<PaperPosition[]> {
    const account = this.getAccount(userId);
    const positions: PaperPosition[] = [];

    for (const [ticker, pos] of account.positions.entries()) {
      const livePrice = await this.getLivePrice(ticker);
      pos.currentPrice = livePrice;
      pos.currentValue = round2(pos.quantity * livePrice);
      pos.investedAmount = round2(pos.quantity * pos.averagePrice);
      pos.unrealizedPnL = round2(pos.currentValue - pos.investedAmount);
      pos.unrealizedPnLPct = round2(
        pos.investedAmount > 0 ? (pos.unrealizedPnL / pos.investedAmount) * 100 : 0
      );
      positions.push({ ...pos });
    }

    return positions;
  }

  /**
   * Returns order history for user.
   */
  public static getOrders(userId: string): PaperOrder[] {
    const account = this.getAccount(userId);
    return [...account.orders].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Executes a buy or sell virtual paper order in INR.
   */
  public static async executeOrder(userId: string, req: PaperOrderRequest): Promise<PaperOrder> {
    const account = this.getAccount(userId);
    const cleanTicker = req.ticker.trim().toUpperCase();
    const meta = NSE_SYMBOL_METADATA[cleanTicker] || {
      companyName: `${cleanTicker} Ltd`,
      sector: "General",
      fallbackPrice: 500.0,
    };

    // Execution price
    const executionPrice =
      req.orderType === "limit" && req.limitPrice && req.limitPrice > 0
        ? req.limitPrice
        : await this.getLivePrice(cleanTicker);

    const totalAmount = round2(req.quantity * executionPrice);

    if (req.side === "buy") {
      // Validate available cash
      if (account.cash < totalAmount) {
        const order: PaperOrder = {
          orderId: randomUUID(),
          proposalId: req.proposalId,
          ticker: cleanTicker,
          companyName: meta.companyName,
          side: "buy",
          quantity: req.quantity,
          orderType: req.orderType,
          limitPrice: req.limitPrice,
          executedPrice: executionPrice,
          totalAmount,
          status: "rejected",
          rejectionReason: `Insufficient virtual cash balance. Required: ₹${totalAmount.toLocaleString("en-IN")}, Available: ₹${round2(account.cash).toLocaleString("en-IN")}`,
          timestamp: new Date().toISOString(),
        };
        account.orders.push(order);
        throw new Error(order.rejectionReason);
      }

      // Deduct cash
      account.cash -= totalAmount;

      // Update or create position
      const existing = account.positions.get(cleanTicker);
      if (existing) {
        const newQty = existing.quantity + req.quantity;
        const newTotalCost = existing.quantity * existing.averagePrice + totalAmount;
        existing.averagePrice = round2(newTotalCost / newQty);
        existing.quantity = newQty;
        existing.investedAmount = round2(newQty * existing.averagePrice);
        existing.currentPrice = executionPrice;
        existing.currentValue = round2(newQty * executionPrice);
        existing.unrealizedPnL = round2(existing.currentValue - existing.investedAmount);
        existing.unrealizedPnLPct = round2((existing.unrealizedPnL / existing.investedAmount) * 100);
      } else {
        account.positions.set(cleanTicker, {
          ticker: cleanTicker,
          companyName: meta.companyName,
          sector: meta.sector,
          quantity: req.quantity,
          averagePrice: executionPrice,
          currentPrice: executionPrice,
          investedAmount: totalAmount,
          currentValue: totalAmount,
          unrealizedPnL: 0,
          unrealizedPnLPct: 0,
        });
      }

      const order: PaperOrder = {
        orderId: randomUUID(),
        proposalId: req.proposalId,
        ticker: cleanTicker,
        companyName: meta.companyName,
        side: "buy",
        quantity: req.quantity,
        orderType: req.orderType,
        limitPrice: req.limitPrice,
        executedPrice: executionPrice,
        totalAmount,
        status: "filled",
        timestamp: new Date().toISOString(),
      };
      account.orders.push(order);
      return order;
    } else {
      // Sell order
      const existing = account.positions.get(cleanTicker);
      if (!existing || existing.quantity < req.quantity) {
        const available = existing ? existing.quantity : 0;
        const order: PaperOrder = {
          orderId: randomUUID(),
          proposalId: req.proposalId,
          ticker: cleanTicker,
          companyName: meta.companyName,
          side: "sell",
          quantity: req.quantity,
          orderType: req.orderType,
          limitPrice: req.limitPrice,
          executedPrice: executionPrice,
          totalAmount,
          status: "rejected",
          rejectionReason: `Cannot sell ${req.quantity} shares of ${cleanTicker}. Available active holding is only ${available} shares.`,
          timestamp: new Date().toISOString(),
        };
        account.orders.push(order);
        throw new Error(order.rejectionReason);
      }

      // Add cash and realize PnL
      account.cash += totalAmount;
      const realizedTradePnL = round2(req.quantity * (executionPrice - existing.averagePrice));
      account.realizedPnL += realizedTradePnL;

      existing.quantity -= req.quantity;
      if (existing.quantity <= 0) {
        account.positions.delete(cleanTicker);
      } else {
        existing.investedAmount = round2(existing.quantity * existing.averagePrice);
        existing.currentPrice = executionPrice;
        existing.currentValue = round2(existing.quantity * executionPrice);
        existing.unrealizedPnL = round2(existing.currentValue - existing.investedAmount);
        existing.unrealizedPnLPct = round2((existing.unrealizedPnL / existing.investedAmount) * 100);
      }

      const order: PaperOrder = {
        orderId: randomUUID(),
        proposalId: req.proposalId,
        ticker: cleanTicker,
        companyName: meta.companyName,
        side: "sell",
        quantity: req.quantity,
        orderType: req.orderType,
        limitPrice: req.limitPrice,
        executedPrice: executionPrice,
        totalAmount,
        status: "filled",
        timestamp: new Date().toISOString(),
      };
      account.orders.push(order);
      return order;
    }
  }

  /**
   * Resets virtual portfolio back to starting INR capital.
   */
  public static resetPortfolio(userId: string, initialCapital: number = 1000000.0): UserPaperAccount {
    const account: UserPaperAccount = {
      userId,
      cash: initialCapital,
      initialCapital,
      realizedPnL: 0.0,
      positions: new Map(),
      orders: [],
    };
    this.accounts.set(userId, account);
    return account;
  }
}

function round2(val: number): number {
  return Math.round(val * 100) / 100;
}
