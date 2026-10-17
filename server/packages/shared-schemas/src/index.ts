import { z } from "zod";

// ==========================================
// User & Risk Profiles
// ==========================================
export const riskCategorySchema = z.enum(["conservative", "balanced", "aggressive"]);
export type RiskCategory = z.infer<typeof riskCategorySchema>;

export const onboardingSchema = z.object({
  displayName: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(10).max(128),
  riskCategory: riskCategorySchema,
  allocatableCapital: z.number().positive(),
  maxPositionPct: z.number().min(1).max(25),
  maxDailyLossPct: z.number().min(1).max(10),
  marketFocus: z.array(z.enum(["equities", "crypto"])).min(1),
  notificationEmail: z.string().email(),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const updateRiskProfileSchema = z.object({
  riskCategory: riskCategorySchema.optional(),
  allocatableCapital: z.number().positive().optional(),
  maxPositionPct: z.number().min(1).max(25).optional(),
  maxDailyLossPct: z.number().min(1).max(10).optional(),
});
export type UpdateRiskProfileInput = z.infer<typeof updateRiskProfileSchema>;

// ==========================================
// API Credentials
// ==========================================
export const apiCredentialProviderSchema = z.enum([
  "groq",
  "gemini",
  "openrouter",
  "agent_router",
]);
export type ApiCredentialProvider = z.infer<typeof apiCredentialProviderSchema>;

export const apiCredentialSchema = z.object({
  provider: apiCredentialProviderSchema,
  key: z.string().min(1),
  secret: z.string().min(1).optional(),
});
export type ApiCredentialInput = z.infer<typeof apiCredentialSchema>;

// ==========================================
// Watchlist
// ==========================================
export const addWatchlistItemSchema = z.object({
  ticker: z.string().trim().toUpperCase().regex(/^[A-Z0-9.\-]{1,10}$/),
  assetClass: z.enum(["equity", "crypto"]),
});
export type AddWatchlistItemInput = z.infer<typeof addWatchlistItemSchema>;

// ==========================================
// Analysis Runs
// ==========================================
export const analysisRunRequestSchema = z.object({
  ticker: z.string().trim().toUpperCase().min(1).max(20),
  horizon: z.enum(["1d", "5d", "20d"]).default("5d"),
  minConfidence: z.number().min(0.5).max(0.95).default(0.7),
  debateRounds: z.number().int().min(1).max(3).default(2),
  requireUnanimousConvergence: z.boolean().default(false),
  language: z.enum(["en", "kn", "hi"]).default("en"),
});
export type AnalysisRunRequest = z.infer<typeof analysisRunRequestSchema>;

// ==========================================
// Trade Proposals & Orders
// ==========================================
export const proposalAdjustSchema = z.object({
  quantity: z.number().positive(),
});
export type ProposalAdjustInput = z.infer<typeof proposalAdjustSchema>;

export const orderSideSchema = z.enum(["buy", "sell"]);
export type OrderSide = z.infer<typeof orderSideSchema>;

export const createOrderSchema = z.object({
  proposalId: z.string().uuid().optional(),
  ticker: z.string().trim().toUpperCase(),
  side: orderSideSchema,
  quantity: z.number().positive(),
  orderType: z.enum(["market", "limit"]).default("market"),
  limitPrice: z.number().positive().optional(),
  isPaper: z.boolean().default(true),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

// ==========================================
// Backtesting & Overfitting
// ==========================================
export const backtestRequestSchema = z.object({
  strategyName: z.string().min(2).max(100),
  tickerUniverse: z.array(z.string().trim().toUpperCase()).min(1).max(50),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
});
export type BacktestRequest = z.infer<typeof backtestRequestSchema>;

// ==========================================
// LLM Agent Outputs (Section 16 Mirror)
// ==========================================
export const analystRoleSchema = z.enum([
  "fundamentals_analyst",
  "sentiment_analyst",
  "news_analyst",
  "technical_analyst",
]);
export type AnalystRole = z.infer<typeof analystRoleSchema>;

export const analystOutputSchema = z.object({
  role: analystRoleSchema,
  summary: z.string().max(800),
  key_evidence: z.array(z.string()).min(1).max(5),
  stance: z.enum(["bullish", "bearish", "neutral"]),
  confidence: z.number().min(0).max(1),
});
export type AnalystOutput = z.infer<typeof analystOutputSchema>;

export const researcherOutputSchema = z.object({
  role: z.enum(["bull_researcher", "bear_researcher"]),
  argument: z.string().max(1000),
  rebuttal_to_opponent: z.string().max(500),
  confidence: z.number().min(0).max(1),
});
export type ResearcherOutput = z.infer<typeof researcherOutputSchema>;

export const traderOutputSchema = z.object({
  action: z.enum(["buy", "sell", "hold"]),
  suggested_size_pct: z.number().min(0).max(25),
  rationale: z.string().max(1000),
  confidence: z.number().min(0).max(1),
});
export type TraderOutput = z.infer<typeof traderOutputSchema>;

export const riskManagerOutputSchema = z.object({
  decision: z.enum(["approve", "approve_with_reduction", "veto"]),
  adjusted_size_pct: z.number().min(0).max(25),
  veto_reason: z.string().max(500).nullable(),
  limits_checked: z.object({
    max_position_pct_ok: z.boolean(),
    max_daily_loss_pct_ok: z.boolean(),
    backtest_eligible: z.boolean(),
  }),
});
export type RiskManagerOutput = z.infer<typeof riskManagerOutputSchema>;

export const portfolioManagerOutputSchema = z.object({
  final_action: z.enum(["buy", "sell", "hold"]),
  final_confidence: z.number().min(0).max(1),
  rationale: z.string().max(1200),
  forecast_dispersion_note: z.string().max(300),
});
export type PortfolioManagerOutput = z.infer<typeof portfolioManagerOutputSchema>;

// ==========================================
// Discovery Scanner Schemas
// ==========================================
export const discoverySectorSchema = z.object({
  sector: z.string(),
  score: z.number().min(-1).max(1),
  trend: z.enum(["bullish", "bearish", "neutral"]),
  changePct5d: z.number(),
  changePct20d: z.number(),
  changePct60d: z.number(),
  volumeTrend: z.number(),
  volatility: z.number(),
  relativeStrength: z.number(),
  stockCount: z.number().int().nonnegative(),
  topStocks: z.array(z.string()),
});
export type DiscoverySector = z.infer<typeof discoverySectorSchema>;

export const discoveryStockPickSchema = z.object({
  symbol: z.string(),
  companyName: z.string(),
  sector: z.string(),
  marketCap: z.enum(["large", "mid", "small"]),
  price: z.number().positive(),
  changePct: z.number(),
  score: z.number(),
  riskTier: z.enum(["conservative", "balanced", "aggressive"]),
  signals: z.array(z.string()),
  quantMetrics: z.object({
    momentum20d: z.number(),
    momentum5d: z.number(),
    rsi14: z.number(),
    volatility: z.number(),
    volumeRatio: z.number(),
  }),
  debateSummary: z
    .object({
      consensus: z.enum(["buy", "sell", "hold"]),
      confidence: z.number().min(0).max(1),
      bullCase: z.string(),
      bearCase: z.string(),
      synthesis: z.string(),
      geminiGroqAgreement: z.number().min(0).max(1).optional(),
      llmSource: z.enum(["live", "cache", "fallback"]),
    })
    .optional(),
  dataSource: z.enum(["live", "cache", "sample"]),
});
export type DiscoveryStockPick = z.infer<typeof discoveryStockPickSchema>;

export const discoveryScanResultSchema = z.object({
  scanId: z.string(),
  timestamp: z.string(),
  benchmark: z.string().default("NIFTY 50"),
  sectors: z.array(discoverySectorSchema),
  picks: z.array(discoveryStockPickSchema),
  topPicks: z.array(discoveryStockPickSchema),
  dataSource: z.enum(["live", "cache", "sample"]),
});
export type DiscoveryScanResult = z.infer<typeof discoveryScanResultSchema>;

export const discoveryPicksQuerySchema = z.object({
  risk: z.enum(["conservative", "balanced", "aggressive", "low", "medium", "high"]).optional(),
  sector: z.string().optional(),
  limit: z.coerce.number().int().positive().max(50).default(10),
});
export type DiscoveryPicksQuery = z.infer<typeof discoveryPicksQuerySchema>;

// ==========================================
// Paper Trading Portfolio Schemas (INR)
// ==========================================
export const paperOrderRequestSchema = z.object({
  ticker: z.string().trim().toUpperCase().min(1).max(20),
  side: z.enum(["buy", "sell"]),
  quantity: z.number().int().positive(),
  orderType: z.enum(["market", "limit"]).default("market"),
  limitPrice: z.number().positive().optional(),
  proposalId: z.string().optional(),
});
export type PaperOrderRequest = z.infer<typeof paperOrderRequestSchema>;

export const paperPositionSchema = z.object({
  ticker: z.string(),
  companyName: z.string(),
  sector: z.string(),
  quantity: z.number().int().positive(),
  averagePrice: z.number().positive(),
  currentPrice: z.number().positive(),
  investedAmount: z.number().nonnegative(),
  currentValue: z.number().nonnegative(),
  unrealizedPnL: z.number(),
  unrealizedPnLPct: z.number(),
});
export type PaperPosition = z.infer<typeof paperPositionSchema>;

export const paperOrderSchema = z.object({
  orderId: z.string(),
  proposalId: z.string().optional(),
  ticker: z.string(),
  companyName: z.string().optional(),
  side: z.enum(["buy", "sell"]),
  quantity: z.number().int().positive(),
  orderType: z.enum(["market", "limit"]),
  limitPrice: z.number().positive().optional(),
  executedPrice: z.number().positive(),
  totalAmount: z.number().positive(),
  status: z.enum(["filled", "rejected", "cancelled"]),
  rejectionReason: z.string().optional(),
  timestamp: z.string(),
});
export type PaperOrder = z.infer<typeof paperOrderSchema>;

export const paperPortfolioSummarySchema = z.object({
  cash: z.number().nonnegative(),
  invested: z.number().nonnegative(),
  portfolioValue: z.number().nonnegative(),
  initialCapital: z.number().positive(),
  currency: z.literal("INR").default("INR"),
  totalPnL: z.number(),
  totalPnLPct: z.number(),
  realizedPnL: z.number(),
  unrealizedPnL: z.number(),
  winRatePct: z.number().min(0).max(100),
  positionCount: z.number().int().nonnegative(),
});
export type PaperPortfolioSummary = z.infer<typeof paperPortfolioSummarySchema>;


