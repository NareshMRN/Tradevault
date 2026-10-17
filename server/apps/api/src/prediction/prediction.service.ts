import { MarketDataService, UnifiedMarketData } from "../market/marketData.service";
import { TechnicalIndicatorEngine, TechnicalFeatureObject } from "../analysis/technicalIndicators";
import { HistoricalAnalysisEngine, HistoricalAnalysisResult } from "../analysis/historicalAnalysis";
import { PatternMatcher, PatternMatchResult } from "../analysis/patternMatcher";
import { RiskMetricsEngine, RiskMetricsObject } from "../analysis/riskMetrics";
import { MarketRegimeEngine, MarketRegimeObject } from "../analysis/marketRegime";

import { TechnicalAgent, TechnicalAgentOutput } from "../agents/technical.agent";
import { FundamentalAgent, FundamentalAgentOutput } from "../agents/fundamental.agent";
import { SentimentAgent, SentimentAgentOutput } from "../agents/sentiment.agent";
import { RiskAgent, RiskAgentOutput } from "../agents/risk.agent";
import { VerificationAgent, VerificationAgentOutput } from "../agents/verification.agent";

import { FusionEngine, FusionResult } from "./fusionEngine";
import { ProbabilityEngine, HorizonKey, HorizonProbability } from "./probabilityEngine";
import { ConfidenceEngine, ConfidenceBreakdown } from "./confidenceEngine";
import { Prediction, IPrediction } from "../db/models";

export interface PredictionPipelineResult {
  symbol: string;
  exchange: "NSE" | "BSE";
  companyName: string;
  timestamps: {
    market_data_at: string;
    news_data_at: string;
    analysis_generated_at: string;
    historical_data_until: string;
  };
  market_snapshot: {
    price: number;
    change: number;
    changePct: number;
    open: number;
    high: number;
    low: number;
    volume: number;
    currency: string;
    source: string;
  };
  technical: {
    indicators: TechnicalFeatureObject;
    agent: TechnicalAgentOutput;
  };
  fundamental: {
    ratios: any;
    agent: FundamentalAgentOutput;
  };
  sentiment: {
    news_count: number;
    agent: SentimentAgentOutput;
  };
  risk: {
    metrics: RiskMetricsObject;
    agent: RiskAgentOutput;
  };
  historical: {
    analysis: HistoricalAnalysisResult;
    patterns: PatternMatchResult;
    regime: MarketRegimeObject;
  };
  verification: VerificationAgentOutput;
  fusion: FusionResult;
  confidence: ConfidenceBreakdown;
  horizons: Record<HorizonKey, HorizonProbability>;
  prediction: {
    horizon: HorizonKey;
    direction: "bullish" | "bearish" | "neutral";
    bullish_score: number;
    up_probability: number;
    sideways_probability: number;
    down_probability: number;
    confidence: number;
    action: "buy" | "sell" | "hold";
    reasoning: string;
  };
  predictionId?: string;
}

export class PredictionService {
  /**
   * Executes the full end-to-end Market Intelligence Engine pipeline.
   */
  public static async runPipeline(
    rawSymbol: string,
    horizon: HorizonKey = "5d",
    userId?: string,
    userApiKeys?: Record<string, string>
  ): Promise<PredictionPipelineResult> {
    const analysisGeneratedAt = new Date().toISOString();

    // ---------------------------------------------------------
    // Phase 2: Unified Market Data Layer
    // ---------------------------------------------------------
    const marketData: UnifiedMarketData = await MarketDataService.getUnifiedMarketData(rawSymbol);

    // ---------------------------------------------------------
    // Phase 3 & 4: Quantitative Feature Engines (Deterministic)
    // ---------------------------------------------------------
    const techIndicators = TechnicalIndicatorEngine.calculate(marketData.historical);
    const histAnalysis = HistoricalAnalysisEngine.analyze(marketData.historical);
    const patterns = PatternMatcher.match(marketData.historical, techIndicators);
    const riskMetrics = RiskMetricsEngine.calculate(histAnalysis, marketData.symbol);
    const regime = MarketRegimeEngine.classify(techIndicators, histAnalysis);

    // ---------------------------------------------------------
    // Phase 5 & 6: Specialized AI Agents (Concurrent Execution)
    // ---------------------------------------------------------
    // Run Tech, Fundamental, and Sentiment agents in parallel
    const [techAgentOut, fundAgentOut, sentAgentOut] = await Promise.all([
      TechnicalAgent.analyze(
        marketData.symbol,
        marketData.current.price,
        techIndicators,
        histAnalysis,
        patterns,
        userApiKeys?.groq
      ),
      FundamentalAgent.analyze(
        marketData.symbol,
        marketData.fundamentals,
        userApiKeys?.mistral
      ),
      SentimentAgent.analyze(
        marketData.symbol,
        marketData.news,
        userApiKeys?.gemini
      ),
    ]);

    // Risk Agent runs with market data + initial agent findings
    const riskAgentOut = await RiskAgent.analyze(
      marketData.symbol,
      riskMetrics,
      techAgentOut,
      fundAgentOut,
      sentAgentOut,
      userApiKeys?.nvidia
    );

    // Verification Agent cross-examines all findings
    const verificationOut = await VerificationAgent.verify(
      marketData.symbol,
      techAgentOut,
      fundAgentOut,
      sentAgentOut,
      riskAgentOut,
      userApiKeys?.openrouter
    );

    // ---------------------------------------------------------
    // Phase 8: Fusion Engine
    // ---------------------------------------------------------
    const fusionResult = FusionEngine.fuse(
      techAgentOut,
      fundAgentOut,
      sentAgentOut,
      riskAgentOut,
      verificationOut,
      patterns,
      regime
    );

    // ---------------------------------------------------------
    // Phase 11: Decoupled Confidence Engine
    // ---------------------------------------------------------
    const confidenceBreakdown = ConfidenceEngine.calculate(
      patterns,
      verificationOut,
      marketData.timestamps.market_data_at,
      techIndicators.signals.length
    );

    // ---------------------------------------------------------
    // Phase 9 & 10: Multi-Horizon Probability Engine
    // ---------------------------------------------------------
    const horizons = ProbabilityEngine.calculateHorizons(
      fusionResult.risk_adjusted_score,
      patterns,
      confidenceBreakdown.overall_confidence
    );

    const activeHorizonProb = horizons[horizon] || horizons["5d"];

    let action: "buy" | "sell" | "hold" = "hold";
    if (activeHorizonProb.up >= 55 && confidenceBreakdown.overall_confidence >= 60 && riskAgentOut.risk_level !== "critical") {
      action = "buy";
    } else if (activeHorizonProb.down >= 55 && confidenceBreakdown.overall_confidence >= 60) {
      action = "sell";
    }

    const reasoning = `${fusionResult.direction.toUpperCase()} stance: Bullish Score ${fusionResult.risk_adjusted_score}/100 with ${activeHorizonProb.up}% probability of upward expansion over ${horizon.toUpperCase()} horizon. ${verificationOut.reasoning_summary}`;

    const timestamps = {
      market_data_at: marketData.timestamps.market_data_at,
      news_data_at: marketData.timestamps.news_data_at,
      analysis_generated_at: analysisGeneratedAt,
      historical_data_until: marketData.timestamps.historical_data_until,
    };

    const marketSnapshot = {
      price: marketData.current.price,
      change: marketData.current.change,
      changePct: marketData.current.changePct,
      open: marketData.current.open,
      high: marketData.current.high,
      low: marketData.current.low,
      volume: marketData.current.volume,
      currency: "INR",
      source: marketData.source,
    };

    // ---------------------------------------------------------
    // Phase 13: Store Prediction in MongoDB
    // ---------------------------------------------------------
    let predictionId: string | undefined;
    try {
      const predDoc = await Prediction.create({
        userId: userId || undefined,
        symbol: marketData.symbol,
        exchange: marketData.exchange,
        timestamp: new Date(),
        timestamps,
        market_snapshot: marketSnapshot,
        technical: { indicators: techIndicators, agent: techAgentOut },
        fundamental: { ratios: marketData.fundamentals, agent: fundAgentOut },
        sentiment: { news_count: marketData.news.length, agent: sentAgentOut },
        risk: { metrics: riskMetrics, agent: riskAgentOut },
        historical: { analysis: histAnalysis, patterns, regime },
        verification: verificationOut,
        prediction: {
          horizon,
          up: activeHorizonProb.up,
          sideways: activeHorizonProb.sideways,
          down: activeHorizonProb.down,
          confidence: confidenceBreakdown.overall_confidence,
          raw_score: fusionResult.risk_adjusted_score,
          direction: fusionResult.direction,
        },
        horizons,
      });
      predictionId = predDoc._id.toString();
    } catch (saveErr) {
      console.warn(`[PredictionService] Warning saving prediction to database:`, (saveErr as Error).message);
    }

    return {
      symbol: marketData.symbol,
      exchange: marketData.exchange,
      companyName: marketData.companyName,
      timestamps,
      market_snapshot: marketSnapshot,
      technical: { indicators: techIndicators, agent: techAgentOut },
      fundamental: { ratios: marketData.fundamentals, agent: fundAgentOut },
      sentiment: { news_count: marketData.news.length, agent: sentAgentOut },
      risk: { metrics: riskMetrics, agent: riskAgentOut },
      historical: { analysis: histAnalysis, patterns, regime },
      verification: verificationOut,
      fusion: fusionResult,
      confidence: confidenceBreakdown,
      horizons,
      prediction: {
        horizon,
        direction: fusionResult.direction,
        bullish_score: fusionResult.risk_adjusted_score,
        up_probability: activeHorizonProb.up,
        sideways_probability: activeHorizonProb.sideways,
        down_probability: activeHorizonProb.down,
        confidence: confidenceBreakdown.overall_confidence,
        action,
        reasoning,
      },
      predictionId,
    };
  }

  /**
   * Retrieves the latest stored prediction for a symbol.
   */
  public static async getLatestPrediction(symbol: string): Promise<any> {
    const clean = symbol.trim().toUpperCase().replace(/\.NS$/, "").replace(/\.BO$/, "");
    return Prediction.findOne({ symbol: clean }).sort({ timestamp: -1 });
  }

  /**
   * Retrieves historical stored predictions for accuracy tracking.
   */
  public static async getPredictionHistory(symbol: string, limit: number = 20): Promise<any[]> {
    const clean = symbol.trim().toUpperCase().replace(/\.NS$/, "").replace(/\.BO$/, "");
    return Prediction.find({ symbol: clean }).sort({ timestamp: -1 }).limit(limit);
  }
}
