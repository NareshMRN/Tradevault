import { Router, Request, Response } from "express";
import { env } from "../config/env";
import { optionalAuth } from "../middleware/auth";

export const mlScreeningRouter = Router();

const RUNTIME_BASE = env.AGENT_RUNTIME_URL;
const RUNTIME_SECRET = env.AGENT_RUNTIME_INTERNAL_SECRET;

/**
 * Helper to call Agent Runtime internal ML screening endpoints with X-Internal-Secret.
 */
async function callRuntimeML(endpoint: string, method: string = "GET", body?: any): Promise<any> {
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
    throw new Error(`Runtime ML screening returned ${response.status}: ${errorText}`);
  }

  return response.json();
}

/**
 * Fallback metrics if agent-runtime is cold or offline.
 */
function getFallbackMetrics() {
  return {
    base_rate: 0.2941,
    threshold: 0.52,
    n_test_rows: 9282,
    n_picks: 225,
    precision_at_threshold: 0.3733,
    lift_over_base_rate: 0.2693,
    avg_picks_per_day: 0.95,
    top5_daily_hit_rate: 0.3336,
    top5_avg_excess_return_after_costs: -0.0006,
    train_date_range: ["2021-11-17", "2024-10-29"],
    val_date_range: ["2024-11-06", "2025-10-21"],
    test_date_range: ["2025-10-30", "2026-10-16"],
    baseline_model: {
      name: "Logistic Regression (Standardized)",
      test_auc: 0.5311,
      test_accuracy: 0.7057,
    },
    lgbm_test_auc: 0.5449,
    feature_importances: {
      gap: 205,
      nifty_ret_5d: 154,
      vol_trend: 115,
      ret_1d: 98,
      volatility_20d: 98,
      rsi_14: 88,
      ret_5d: 87,
      dist_from_20d_high: 75,
      rel_strength_20d: 71,
      dist_from_20d_low: 66,
      ret_20d: 49,
    },
    limitations: [
      "Survivorship bias: Model trained on current liquid Nifty 50 constituents only.",
      "Modest edge expected: In liquid Indian large caps, honest model edge is 2-8% above base rate.",
      "Execution slippage: Opening bell prices at 9:15 AM IST may deviate from ideal theoretical fills.",
      "Educational screening tool: The model provides probabilistic ranking, not guaranteed price forecasts or SEBI-registered financial advice.",
    ],
  };
}

/**
 * GET /api/ml/picks
 * Returns latest saved ML picks with market hours awareness and fallback.
 */
mlScreeningRouter.get("/picks", optionalAuth, async (req: Request, res: Response): Promise<void> => {
  const demoState = (req.query.demoState || req.query.demo_state || "") as string;
  const endpoint = demoState ? `/internal/ml/picks?demo_state=${encodeURIComponent(demoState)}` : "/internal/ml/picks";

  try {
    const data = await callRuntimeML(endpoint, "GET");
    res.json(data);
  } catch (err: any) {
    console.warn(`[ML Screening] Runtime ${endpoint} unavailable (${err.message}). Returning bundled sample picks.`);
    res.json({
      generated_at: new Date().toISOString(),
      session_date: new Date().toISOString().slice(0, 10),
      for_session_date: new Date().toISOString().slice(0, 10),
      stale: true,
      data_source: "sample",
      threshold: 0.52,
      base_rate: 0.2941,
      total_screened: 40,
      passed_threshold_count: 5,
      picks: [
        {
          symbol: "RELIANCE",
          full_ticker: "RELIANCE.NS",
          sector: "Energy",
          score: 0.584,
          raw_score: 0.562,
          threshold: 0.52,
          price: 2742.50,
          price_label: "Last close",
          top_drivers: [
            { feature: "gap", value: -0.004, contribution: 0.14, description: "Overnight opening gap of -0.40%" },
            { feature: "vol_trend", value: 1.45, contribution: 0.09, description: "Volume running at 1.5x 20-day average" },
            { feature: "rel_strength_20d", value: 0.031, contribution: 0.07, description: "20-day relative strength vs Nifty at +3.10%" },
          ],
          explanation: "Overnight opening gap of -0.40%; Volume running at 1.5x 20-day average; 20-day relative strength vs Nifty at +3.10%.",
        },
        {
          symbol: "TCS",
          full_ticker: "TCS.NS",
          sector: "IT",
          score: 0.562,
          raw_score: 0.541,
          threshold: 0.52,
          price: 4125.80,
          price_label: "Last close",
          top_drivers: [
            { feature: "ret_5d", value: 0.024, contribution: 0.12, description: "5-day trailing momentum of +2.40%" },
            { feature: "rsi_14", value: 54.2, contribution: 0.07, description: "14-day RSI indicator at 54.2" },
            { feature: "vol_trend", value: 1.12, contribution: 0.04, description: "Volume running at 1.1x 20-day average" },
          ],
          explanation: "5-day trailing momentum of +2.40%; 14-day RSI indicator at 54.2; Volume running at 1.1x 20-day average.",
        },
      ],
      top_candidates: [],
      review: null,
    });
  }
});

/**
 * GET /api/ml/metrics
 * Returns time-series out-of-sample metrics.
 */
mlScreeningRouter.get("/metrics", optionalAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const data = await callRuntimeML("/internal/ml/metrics", "GET");
    res.json(data);
  } catch (err: any) {
    console.warn(`[ML Screening] Runtime /internal/ml/metrics unavailable (${err.message}). Using fallback metrics.`);
    res.json(getFallbackMetrics());
  }
});

/**
 * POST /api/ml/run
 * Recomputes ML picks on demand if market is open and >= 09:20 IST.
 */
mlScreeningRouter.post("/run", optionalAuth, async (req: Request, res: Response): Promise<void> => {
  const demoState = (req.query.demoState || req.query.demo_state || "") as string;
  const endpoint = demoState ? `/internal/ml/run?demo_state=${encodeURIComponent(demoState)}` : "/internal/ml/run";

  try {
    const data = await callRuntimeML(endpoint, "POST");
    res.json(data);
  } catch (err: any) {
    console.warn(`[ML Screening] Runtime ${endpoint} failed (${err.message}).`);
    res.status(500).json({ error: "Failed to recompute ML picks from agent runtime." });
  }
});
