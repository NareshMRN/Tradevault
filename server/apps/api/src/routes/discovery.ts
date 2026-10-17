import { Router, Request, Response } from "express";
import { env } from "../config/env";
import {
  discoveryPicksQuerySchema,
  DiscoverySector,
  DiscoveryStockPick,
  DiscoveryScanResult,
} from "@confluence/shared-schemas";

export const discoveryRouter = Router();

const RUNTIME_BASE = env.AGENT_RUNTIME_URL;
const RUNTIME_SECRET = env.AGENT_RUNTIME_INTERNAL_SECRET;

/**
 * Helper to call Agent Runtime internal scanner endpoints with authentication.
 */
async function callRuntimeScanner(endpoint: string, method: string = "GET", body?: any): Promise<any> {
  const url = `${RUNTIME_BASE}${endpoint}`;
  const headers: Record<string, string> = {
    "x-internal-secret": RUNTIME_SECRET,
    "Content-Type": "application/json",
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Runtime scanner returned ${response.status}: ${errorText}`);
  }

  return response.json();
}

/**
 * Fallback static sector rankings for local offline development or runtime outages.
 */
function getFallbackSectors(): DiscoverySector[] {
  return [
    {
      sector: "Banking",
      score: 0.62,
      trend: "bullish",
      changePct5d: 1.85,
      changePct20d: 5.4,
      changePct60d: 11.2,
      volumeTrend: 1.35,
      volatility: 0.185,
      relativeStrength: 2.1,
      stockCount: 6,
      topStocks: ["HDFCBANK", "ICICIBANK", "SBIN"],
    },
    {
      sector: "Energy",
      score: 0.45,
      trend: "bullish",
      changePct5d: 1.2,
      changePct20d: 4.1,
      changePct60d: 8.9,
      volumeTrend: 1.15,
      volatility: 0.21,
      relativeStrength: 1.4,
      stockCount: 5,
      topStocks: ["RELIANCE", "NTPC", "POWERGRID"],
    },
    {
      sector: "IT",
      score: 0.28,
      trend: "bullish",
      changePct5d: 0.6,
      changePct20d: 2.8,
      changePct60d: 6.5,
      volumeTrend: 1.05,
      volatility: 0.22,
      relativeStrength: 0.8,
      stockCount: 6,
      topStocks: ["TCS", "INFY", "HCLTECH"],
    },
    {
      sector: "Auto",
      score: 0.15,
      trend: "neutral",
      changePct5d: 0.3,
      changePct20d: 1.5,
      changePct60d: 4.2,
      volumeTrend: 0.98,
      volatility: 0.24,
      relativeStrength: 0.2,
      stockCount: 6,
      topStocks: ["TATAMOTORS", "M&M", "MARUTI"],
    },
    {
      sector: "Pharma",
      score: -0.08,
      trend: "neutral",
      changePct5d: -0.4,
      changePct20d: -0.9,
      changePct60d: 1.8,
      volumeTrend: 0.92,
      volatility: 0.19,
      relativeStrength: -0.6,
      stockCount: 5,
      topStocks: ["SUNPHARMA", "CIPLA", "DRREDDY"],
    },
    {
      sector: "Metals",
      score: -0.32,
      trend: "bearish",
      changePct5d: -1.5,
      changePct20d: -3.8,
      changePct60d: -5.2,
      volumeTrend: 0.88,
      volatility: 0.31,
      relativeStrength: -2.3,
      stockCount: 5,
      topStocks: ["TATASTEEL", "HINDALCO", "JSWSTEEL"],
    },
  ];
}

/**
 * Fallback top stock picks for offline development or runtime outages.
 */
function getFallbackPicks(risk: string = "balanced"): DiscoveryStockPick[] {
  const isConservative = risk === "conservative" || risk === "low";
  const isAggressive = risk === "aggressive" || risk === "high";

  return [
    {
      symbol: "HDFCBANK",
      companyName: "HDFC Bank Ltd",
      sector: "Banking",
      marketCap: "large",
      price: 1680.5,
      changePct: 1.45,
      score: isConservative ? 0.88 : 0.76,
      riskTier: isConservative ? "conservative" : isAggressive ? "aggressive" : "balanced",
      signals: [
        "Strong 20d momentum (+5.8%)",
        "Nifty 50 Tier-1 Blue Chip",
        "Low annualized volatility stability (18.2%)",
        "Leading Banking sector trend",
      ],
      quantMetrics: {
        momentum20d: 5.8,
        momentum5d: 1.85,
        rsi14: 62.4,
        volatility: 0.182,
        volumeRatio: 1.42,
      },
      debateSummary: {
        consensus: "buy",
        confidence: 0.85,
        bullCase: "Strong private credit growth, expanding net interest margins, and institutional accumulation.",
        bearCase: "Near-term consolidation resistance around ₹1,720.",
        synthesis: "Committee Consensus: High conviction BUY. Best in class risk-reward for Indian financial allocation.",
        geminiGroqAgreement: 0.92,
        llmSource: "fallback",
      },
      dataSource: "sample",
    },
    {
      symbol: "RELIANCE",
      companyName: "Reliance Industries Ltd",
      sector: "Energy",
      marketCap: "large",
      price: 2950.0,
      changePct: 0.82,
      score: 0.72,
      riskTier: isConservative ? "conservative" : isAggressive ? "aggressive" : "balanced",
      signals: [
        "Strong 20d momentum (+4.2%)",
        "Nifty 50 Tier-1 Blue Chip",
        "Institutional volume surge (1.25x 50d avg)",
      ],
      quantMetrics: {
        momentum20d: 4.2,
        momentum5d: 1.1,
        rsi14: 58.7,
        volatility: 0.205,
        volumeRatio: 1.25,
      },
      debateSummary: {
        consensus: "buy",
        confidence: 0.8,
        bullCase: "Telecom subscriber expansion and retail margin expansion support robust cash flows.",
        bearCase: "Global refining margin volatility remains an earnings overhang.",
        synthesis: "Committee Consensus: BUY. Strong conglomerate stability with growth optionality.",
        geminiGroqAgreement: 0.85,
        llmSource: "fallback",
      },
      dataSource: "sample",
    },
    {
      symbol: "TCS",
      companyName: "Tata Consultancy Services Ltd",
      sector: "IT",
      marketCap: "large",
      price: 4120.0,
      changePct: -0.25,
      score: 0.65,
      riskTier: isConservative ? "conservative" : isAggressive ? "aggressive" : "balanced",
      signals: [
        "Low annualized volatility stability (19.4%)",
        "Nifty 50 Tier-1 Blue Chip",
        "Healthy free cash flow generation",
      ],
      quantMetrics: {
        momentum20d: 2.9,
        momentum5d: 0.6,
        rsi14: 53.2,
        volatility: 0.194,
        volumeRatio: 1.08,
      },
      debateSummary: {
        consensus: "hold",
        confidence: 0.74,
        bullCase: "Resilient deal pipeline and large enterprise multi-year digital transformation contracts.",
        bearCase: "Slowdown in discretionary tech spending in US and European client bases.",
        synthesis: "Committee Consensus: Steady HOLD / Accumulate on dips. High quality defensive tech holding.",
        geminiGroqAgreement: 0.82,
        llmSource: "fallback",
      },
      dataSource: "sample",
    },
  ];
}

/**
 * GET /api/discovery/sectors
 * Returns ranked Indian market sectors with momentum scores.
 */
discoveryRouter.get("/discovery/sectors", async (_req: Request, res: Response): Promise<void> => {
  try {
    const data = await callRuntimeScanner("/internal/scanner/sectors");
    res.json({ sectors: data, dataSource: "live" });
  } catch (err: any) {
    console.warn(`[Discovery] Runtime scanner/sectors unavailable (${err.message}). Using fallback data.`);
    res.json({ sectors: getFallbackSectors(), dataSource: "sample" });
  }
});

/**
 * GET /api/discovery/picks
 * Returns top stock picks filtered by risk profile and optional sector.
 */
discoveryRouter.get("/discovery/picks", async (req: Request, res: Response): Promise<void> => {
  const parsed = discoveryPicksQuerySchema.safeParse(req.query);
  const risk = (parsed.success ? parsed.data.risk : req.query.risk as string) || "balanced";
  const sector = (parsed.success ? parsed.data.sector : req.query.sector as string) || "";
  const limit = (parsed.success ? parsed.data.limit : 10) || 10;

  try {
    const query = new URLSearchParams({
      risk,
      limit: String(limit),
      ...(sector ? { sector } : {}),
    });

    const data = await callRuntimeScanner(`/internal/scanner/picks?${query.toString()}`);
    res.json({ picks: data, dataSource: "live" });
  } catch (err: any) {
    console.warn(`[Discovery] Runtime scanner/picks unavailable (${err.message}). Using fallback picks.`);
    res.json({ picks: getFallbackPicks(risk), dataSource: "sample" });
  }
});

/**
 * POST /api/discovery/run
 * Triggers a fresh quant discovery scan and debate synthesis on top 5 picks.
 */
discoveryRouter.post("/discovery/run", async (req: Request, res: Response): Promise<void> => {
  const risk = (req.body?.risk || req.query.risk || "balanced") as string;

  try {
    const query = new URLSearchParams({ risk });
    const result: DiscoveryScanResult = await callRuntimeScanner(`/internal/scanner/run?${query.toString()}`, "POST");
    res.json(result);
  } catch (err: any) {
    console.warn(`[Discovery] Runtime scanner/run failed (${err.message}). Generating fallback scan result.`);
    const fallbackPicks = getFallbackPicks(risk);
    res.json({
      scanId: `offline-${Date.now()}`,
      timestamp: new Date().toISOString(),
      benchmark: "NIFTY 50",
      sectors: getFallbackSectors(),
      picks: fallbackPicks,
      topPicks: fallbackPicks.slice(0, 5),
      dataSource: "sample",
    });
  }
});

/**
 * GET /api/discovery/latest
 * Returns latest full discovery scan results.
 */
discoveryRouter.get("/discovery/latest", async (_req: Request, res: Response): Promise<void> => {
  try {
    const data = await callRuntimeScanner("/internal/scanner/latest");
    res.json(data);
  } catch (err: any) {
    console.warn(`[Discovery] Runtime scanner/latest unavailable (${err.message}). Using fallback.`);
    const fallbackPicks = getFallbackPicks("balanced");
    res.json({
      scanId: `offline-${Date.now()}`,
      timestamp: new Date().toISOString(),
      benchmark: "NIFTY 50",
      sectors: getFallbackSectors(),
      picks: fallbackPicks,
      topPicks: fallbackPicks.slice(0, 5),
      dataSource: "sample",
    });
  }
});
