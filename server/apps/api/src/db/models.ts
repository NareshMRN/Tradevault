import mongoose, { Document, Schema, Types } from "mongoose";

// ==========================================
// 1. User Model
// ==========================================
export interface IUser extends Document {
  email: string;
  passwordHash: string;
  displayName: string;
  role: "user" | "admin";
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    displayName: { type: String, required: true, trim: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
  },
  { timestamps: true }
);

// ==========================================
// 2. Risk Profile Model
// ==========================================
export interface IRiskProfile extends Document {
  userId: Types.ObjectId;
  riskCategory: "conservative" | "balanced" | "aggressive";
  allocatableCapital: number;
  maxPositionPct: number;
  maxDailyLossPct: number;
  liveTradingEnabled: boolean;
  liveTradingConfirmedAt?: Date | null;
  updatedAt: Date;
}

const RiskProfileSchema = new Schema<IRiskProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    riskCategory: { type: String, enum: ["conservative", "balanced", "aggressive"], required: true },
    allocatableCapital: { type: Number, required: true, min: 1 },
    maxPositionPct: { type: Number, required: true, min: 1, max: 25 },
    maxDailyLossPct: { type: Number, required: true, min: 1, max: 10 },
    liveTradingEnabled: { type: Boolean, default: false },
    liveTradingConfirmedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

// ==========================================
// 3. API Credentials Model (AES-256-GCM Encrypted)
// ==========================================
export interface IApiCredential extends Document {
  userId: Types.ObjectId;
  provider: "groq" | "gemini" | "mistral" | "nvidia" | "openrouter" | "agent_router" | "alpaca_paper" | "alpaca_live";
  encryptedKey: Buffer;
  encryptedSecret?: Buffer;
  keyIv: Buffer;
  keyAuthTag: Buffer;
  createdAt: Date;
}

const ApiCredentialSchema = new Schema<IApiCredential>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    provider: {
      type: String,
      enum: ["groq", "gemini", "mistral", "nvidia", "openrouter", "agent_router", "alpaca_paper", "alpaca_live"],
      required: true,
    },
    encryptedKey: { type: Buffer, required: true },
    encryptedSecret: { type: Buffer },
    keyIv: { type: Buffer, required: true },
    keyAuthTag: { type: Buffer, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
ApiCredentialSchema.index({ userId: 1, provider: 1 }, { unique: true });

// ==========================================
// 4. Watchlist Model
// ==========================================
export interface IWatchlistItem extends Document {
  userId: Types.ObjectId;
  ticker: string;
  assetClass: "equity" | "crypto";
  createdAt: Date;
}

const WatchlistItemSchema = new Schema<IWatchlistItem>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    ticker: { type: String, required: true, uppercase: true, trim: true },
    assetClass: { type: String, enum: ["equity", "crypto"], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
WatchlistItemSchema.index({ userId: 1, ticker: 1 }, { unique: true });

// ==========================================
// 5. Quant Factor Scores (Shared Market Data)
// ==========================================
export interface IFactorScore extends Document {
  ticker: string;
  asOfDate: string; // YYYY-MM-DD
  momentumScore: number;
  volatilityScore: number;
  meanReversionScore: number;
  valueProxyScore: number;
  technicalScore: number;
  compositeScore: number;
  computedAt: Date;
}

const FactorScoreSchema = new Schema<IFactorScore>(
  {
    ticker: { type: String, required: true, uppercase: true, trim: true, index: true },
    asOfDate: { type: String, required: true },
    momentumScore: { type: Number, default: 0 },
    volatilityScore: { type: Number, default: 0 },
    meanReversionScore: { type: Number, default: 0 },
    valueProxyScore: { type: Number, default: 0 },
    technicalScore: { type: Number, default: 0 },
    compositeScore: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: "computedAt", updatedAt: false } }
);
FactorScoreSchema.index({ ticker: 1, asOfDate: 1 }, { unique: true });

// ==========================================
// 6. Probabilistic Forecasts (Shared Market Data)
// ==========================================
export interface IForecast extends Document {
  ticker: string;
  horizon: "1d" | "5d" | "20d";
  asOfDate: string;
  p10: number;
  p25: number;
  median: number;
  p75: number;
  p90: number;
  stdDev: number;
  modelName: string;
  computedAt: Date;
}

const ForecastSchema = new Schema<IForecast>(
  {
    ticker: { type: String, required: true, uppercase: true, trim: true, index: true },
    horizon: { type: String, enum: ["1d", "5d", "20d"], required: true },
    asOfDate: { type: String, required: true },
    p10: { type: Number, required: true },
    p25: { type: Number, required: true },
    median: { type: Number, required: true },
    p75: { type: Number, required: true },
    p90: { type: Number, required: true },
    stdDev: { type: Number, required: true },
    modelName: { type: String, required: true },
  },
  { timestamps: { createdAt: "computedAt", updatedAt: false } }
);
ForecastSchema.index({ ticker: 1, horizon: 1, asOfDate: 1 }, { unique: true });

// ==========================================
// 7. Backtests & Overfitting Validation
// ==========================================
export interface IBacktest extends Document {
  userId: Types.ObjectId;
  strategyName: string;
  tickerUniverse: string[];
  startDate: string;
  endDate: string;
  sharpeRatio?: number;
  deflatedSharpeRatio?: number;
  probabilityOfBacktestOverfitting?: number;
  maxDrawdownPct?: number;
  isEligibleForPaperTrading: boolean;
  status: "pending" | "running" | "completed" | "failed";
  createdAt: Date;
  completedAt?: Date;
}

const BacktestSchema = new Schema<IBacktest>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    strategyName: { type: String, required: true },
    tickerUniverse: [{ type: String, uppercase: true }],
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    sharpeRatio: { type: Number },
    deflatedSharpeRatio: { type: Number },
    probabilityOfBacktestOverfitting: { type: Number },
    maxDrawdownPct: { type: Number },
    isEligibleForPaperTrading: { type: Boolean, default: false },
    status: { type: String, enum: ["pending", "running", "completed", "failed"], default: "pending" },
    completedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// ==========================================
// 8. Agent Runs & Messages
// ==========================================
export interface IAgentRun extends Document {
  userId: Types.ObjectId;
  ticker: string;
  horizon: string;
  status: "running" | "completed" | "failed";
  finalAction?: "buy" | "sell" | "hold";
  confidence?: number;
  rationale?: string;
  startedAt: Date;
  completedAt?: Date;
}

const AgentRunSchema = new Schema<IAgentRun>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    ticker: { type: String, required: true, uppercase: true },
    horizon: { type: String, required: true },
    status: { type: String, enum: ["running", "completed", "failed"], default: "running" },
    finalAction: { type: String, enum: ["buy", "sell", "hold"] },
    confidence: { type: Number },
    rationale: { type: String },
    completedAt: { type: Date },
  },
  { timestamps: { createdAt: "startedAt", updatedAt: false } }
);

export interface IAgentMessage extends Document {
  runId: Types.ObjectId;
  agentRole:
    | "fundamentals_analyst"
    | "sentiment_analyst"
    | "news_analyst"
    | "technical_analyst"
    | "macro_analyst"
    | "bull_researcher"
    | "bear_researcher"
    | "trader"
    | "risk_manager"
    | "portfolio_manager";
  llmProvider: "groq" | "gemini" | "mistral" | "nvidia" | "openrouter" | "agent_router";
  sequenceIndex: number;
  content: string;
  structuredOutput?: Record<string, any>;
  createdAt: Date;
}

const AgentMessageSchema = new Schema<IAgentMessage>(
  {
    runId: { type: Schema.Types.ObjectId, ref: "AgentRun", required: true, index: true },
    agentRole: {
      type: String,
      enum: [
        "fundamentals_analyst",
        "sentiment_analyst",
        "news_analyst",
        "technical_analyst",
        "macro_analyst",
        "bull_researcher",
        "bear_researcher",
        "trader",
        "risk_manager",
        "portfolio_manager",
      ],
      required: true,
    },
    llmProvider: {
      type: String,
      enum: ["groq", "gemini", "mistral", "nvidia", "openrouter", "agent_router"],
      required: true,
    },
    sequenceIndex: { type: Number, required: true },
    content: { type: String, required: true },
    structuredOutput: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// ==========================================
// 9. Trade Proposals & Orders
// ==========================================
export interface ITradeProposal extends Document {
  runId: Types.ObjectId;
  userId: Types.ObjectId;
  ticker: string;
  action: "buy" | "sell";
  suggestedQuantity?: number;
  suggestedSizePct?: number;
  confidence: number;
  status: "pending" | "approved" | "rejected" | "expired";
  reviewedAt?: Date;
  createdAt: Date;
}

const TradeProposalSchema = new Schema<ITradeProposal>(
  {
    runId: { type: Schema.Types.ObjectId, ref: "AgentRun", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    ticker: { type: String, required: true, uppercase: true },
    action: { type: String, enum: ["buy", "sell"], required: true },
    suggestedQuantity: { type: Number },
    suggestedSizePct: { type: Number },
    confidence: { type: Number, required: true },
    status: { type: String, enum: ["pending", "approved", "rejected", "expired"], default: "pending" },
    reviewedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export interface IOrder extends Document {
  proposalId?: Types.ObjectId;
  userId: Types.ObjectId;
  brokerOrderId?: string;
  ticker: string;
  side: "buy" | "sell";
  quantity: number;
  orderType: string;
  isPaper: boolean;
  status: string;
  filledAvgPrice?: number;
  submittedAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    proposalId: { type: Schema.Types.ObjectId, ref: "TradeProposal" },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    brokerOrderId: { type: String },
    ticker: { type: String, required: true, uppercase: true },
    side: { type: String, enum: ["buy", "sell"], required: true },
    quantity: { type: Number, required: true },
    orderType: { type: String, default: "market" },
    isPaper: { type: Boolean, default: true },
    status: { type: String, default: "submitted" },
    filledAvgPrice: { type: Number },
  },
  { timestamps: { createdAt: "submittedAt", updatedAt: true } }
);

// ==========================================
// 10. Risk Events & Kill Switch State
// ==========================================
export interface IRiskEvent extends Document {
  userId: Types.ObjectId;
  eventType: "veto" | "daily_loss_limit" | "kill_switch_engaged" | "kill_switch_disengaged";
  relatedRunId?: Types.ObjectId;
  detail?: string;
  createdAt: Date;
}

const RiskEventSchema = new Schema<IRiskEvent>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    eventType: {
      type: String,
      enum: ["veto", "daily_loss_limit", "kill_switch_engaged", "kill_switch_disengaged"],
      required: true,
    },
    relatedRunId: { type: Schema.Types.ObjectId, ref: "AgentRun" },
    detail: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export interface IKillSwitchState extends Document {
  userId: Types.ObjectId;
  isEngaged: boolean;
  engagedAt?: Date | null;
  engagedBy?: Types.ObjectId | null;
}

const KillSwitchStateSchema = new Schema<IKillSwitchState>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    isEngaged: { type: Boolean, default: false },
    engagedAt: { type: Date, default: null },
    engagedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  }
);

// ==========================================
// 11. Immutable Audit Log
// ==========================================
export interface IAuditLog extends Document {
  userId?: Types.ObjectId;
  eventType: string;
  entityType: string;
  entityId?: string;
  payload: Record<string, any>;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    eventType: { type: String, required: true, index: true },
    entityType: { type: String, required: true },
    entityId: { type: String },
    payload: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Immutability enforcement: block updates and deletes on AuditLog
AuditLogSchema.pre("updateOne", function (this: any, next: any) {
  next(new Error("Audit log is immutable: updates and deletions are strictly prohibited."));
});
AuditLogSchema.pre("updateMany", function (this: any, next: any) {
  next(new Error("Audit log is immutable: updates and deletions are strictly prohibited."));
});
AuditLogSchema.pre("deleteOne", function (this: any, next: any) {
  next(new Error("Audit log is immutable: updates and deletions are strictly prohibited."));
});
AuditLogSchema.pre("deleteMany", function (this: any, next: any) {
  next(new Error("Audit log is immutable: updates and deletions are strictly prohibited."));
});

// ==========================================
// 12. Stored Predictions (Market Intelligence Engine)
// ==========================================
export interface IPrediction extends Document {
  userId?: Types.ObjectId;
  symbol: string;
  exchange: string;
  timestamp: Date;
  timestamps: {
    market_data_at: string;
    news_data_at: string;
    analysis_generated_at: string;
    historical_data_until: string;
  };
  market_snapshot: Record<string, any>;
  technical: Record<string, any>;
  fundamental: Record<string, any>;
  sentiment: Record<string, any>;
  risk: Record<string, any>;
  historical: Record<string, any>;
  verification: Record<string, any>;
  prediction: {
    horizon: string;
    up: number;
    sideways: number;
    down: number;
    confidence: number;
    raw_score: number;
    direction: "bullish" | "bearish" | "neutral";
  };
  horizons: Record<string, {
    up: number;
    sideways: number;
    down: number;
    confidence: number;
    expectedMovePct?: number;
  }>;
  outcome?: {
    actualPrice?: number;
    evaluatedAt?: Date;
    wasCorrect?: boolean;
    returnPct?: number;
  };
}

const PredictionSchema = new Schema<IPrediction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    symbol: { type: String, required: true, uppercase: true, trim: true, index: true },
    exchange: { type: String, default: "NSE" },
    timestamp: { type: Date, default: Date.now, index: true },
    timestamps: {
      market_data_at: { type: String, required: true },
      news_data_at: { type: String, required: true },
      analysis_generated_at: { type: String, required: true },
      historical_data_until: { type: String, required: true },
    },
    market_snapshot: { type: Schema.Types.Mixed, default: {} },
    technical: { type: Schema.Types.Mixed, default: {} },
    fundamental: { type: Schema.Types.Mixed, default: {} },
    sentiment: { type: Schema.Types.Mixed, default: {} },
    risk: { type: Schema.Types.Mixed, default: {} },
    historical: { type: Schema.Types.Mixed, default: {} },
    verification: { type: Schema.Types.Mixed, default: {} },
    prediction: {
      horizon: { type: String, default: "5d" },
      up: { type: Number, required: true },
      sideways: { type: Number, required: true },
      down: { type: Number, required: true },
      confidence: { type: Number, required: true },
      raw_score: { type: Number, required: true },
      direction: { type: String, enum: ["bullish", "bearish", "neutral"], default: "neutral" },
    },
    horizons: { type: Schema.Types.Mixed, default: {} },
    outcome: {
      actualPrice: { type: Number },
      evaluatedAt: { type: Date },
      wasCorrect: { type: Boolean },
      returnPct: { type: Number },
    },
  },
  { timestamps: true }
);
PredictionSchema.index({ symbol: 1, timestamp: -1 });

// Compile and export models
export const User = mongoose.model<IUser>("User", UserSchema);
export const RiskProfile = mongoose.model<IRiskProfile>("RiskProfile", RiskProfileSchema);
export const ApiCredential = mongoose.model<IApiCredential>("ApiCredential", ApiCredentialSchema);
export const WatchlistItem = mongoose.model<IWatchlistItem>("WatchlistItem", WatchlistItemSchema);
export const FactorScore = mongoose.model<IFactorScore>("FactorScore", FactorScoreSchema);
export const Forecast = mongoose.model<IForecast>("Forecast", ForecastSchema);
export const Backtest = mongoose.model<IBacktest>("Backtest", BacktestSchema);
export const AgentRun = mongoose.model<IAgentRun>("AgentRun", AgentRunSchema);
export const AgentMessage = mongoose.model<IAgentMessage>("AgentMessage", AgentMessageSchema);
export const TradeProposal = mongoose.model<ITradeProposal>("TradeProposal", TradeProposalSchema);
export const Order = mongoose.model<IOrder>("Order", OrderSchema);
export const RiskEvent = mongoose.model<IRiskEvent>("RiskEvent", RiskEventSchema);
export const KillSwitchState = mongoose.model<IKillSwitchState>("KillSwitchState", KillSwitchStateSchema);
export const AuditLog = mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
export const Prediction = mongoose.model<IPrediction>("Prediction", PredictionSchema);

