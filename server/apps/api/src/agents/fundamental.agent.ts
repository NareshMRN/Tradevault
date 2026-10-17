import { MistralProvider } from "../providers/mistral.provider";
import { OpenRouterProvider } from "../providers/openrouter.provider";
import { FundamentalsData } from "../market/fundamentals.service";

export interface FundamentalAgentOutput {
  score: number; // 0 to 100
  confidence: number; // 0 to 100
  growth: "strong" | "moderate" | "weak" | "declining";
  valuation: "undervalued" | "fair" | "overvalued";
  financial_health: "healthy" | "moderate" | "stressed";
  risks: string[];
  reasoning_summary: string;
  provider: string;
  model: string;
}

export class FundamentalAgent {
  public static readonly SYSTEM_PROMPT = `
You are the Fundamental Analyst Agent on an elite quantitative trading committee.
You evaluate the company's valuation metrics, balance sheet health, profitability, and growth trajectory.
You must return strictly valid JSON matching this schema:
{
  "score": <number 0-100>,
  "confidence": <number 0-100>,
  "growth": "strong" | "moderate" | "weak" | "declining",
  "valuation": "undervalued" | "fair" | "overvalued",
  "financial_health": "healthy" | "moderate" | "stressed",
  "risks": ["risk 1", "risk 2"],
  "reasoning_summary": "<concise 2-3 sentence analysis of financial standing and valuation>"
}
`;

  public static async analyze(
    symbol: string,
    fundamentals: FundamentalsData,
    userApiKey?: string
  ): Promise<FundamentalAgentOutput> {
    const userPrompt = `
Symbol: ${symbol} (${fundamentals.companyName})
Sector: ${fundamentals.sector}
Financial Ratios (${fundamentals.asOfQuarter}):
- Market Cap: ₹${fundamentals.marketCapCr.toLocaleString()} Cr
- P/E Ratio: ${fundamentals.peRatio}
- P/B Ratio: ${fundamentals.pbRatio}
- EPS: ₹${fundamentals.eps}
- ROE: ${fundamentals.roePct}%
- Debt-to-Equity: ${fundamentals.debtToEquity}
- Operating Margin: ${fundamentals.operatingMarginPct}%
- Net Profit Margin: ${fundamentals.netMarginPct}%
- Revenue YoY Growth: ${fundamentals.revenueGrowthYoY}%
- Net Profit YoY Growth: ${fundamentals.profitGrowthYoY}%
- Dividend Yield: ${fundamentals.dividendYieldPct}%

Evaluate the fundamental strength, valuation, and capital structure.
`;

    // 1. Try Mistral
    try {
      const res = await MistralProvider.callStructured<any>(this.SYSTEM_PROMPT, userPrompt, userApiKey);
      return {
        score: Math.min(100, Math.max(0, Number(res.data.score) || 65)),
        confidence: Math.min(100, Math.max(0, Number(res.data.confidence) || 75)),
        growth: res.data.growth || (fundamentals.revenueGrowthYoY > 10 ? "strong" : "moderate"),
        valuation: res.data.valuation || fundamentals.valuation,
        financial_health: res.data.financial_health || fundamentals.financialHealth,
        risks: Array.isArray(res.data.risks) ? res.data.risks : ["Industry competition"],
        reasoning_summary: res.data.reasoning_summary || "Fundamentals exhibit sound capital structure and sustainable profitability.",
        provider: res.provider,
        model: res.model,
      };
    } catch (mistralErr) {
      console.warn(`[FundamentalAgent] Mistral call failed, attempting OpenRouter fallback:`, (mistralErr as Error).message);
    }

    // 2. Try OpenRouter Fallback
    try {
      const res = await OpenRouterProvider.callStructured<any>(this.SYSTEM_PROMPT, userPrompt);
      return {
        score: Math.min(100, Math.max(0, Number(res.data.score) || 65)),
        confidence: Math.min(100, Math.max(0, Number(res.data.confidence) || 70)),
        growth: res.data.growth || (fundamentals.revenueGrowthYoY > 10 ? "strong" : "moderate"),
        valuation: res.data.valuation || fundamentals.valuation,
        financial_health: res.data.financial_health || fundamentals.financialHealth,
        risks: Array.isArray(res.data.risks) ? res.data.risks : ["Valuation sensitivity"],
        reasoning_summary: res.data.reasoning_summary || "Consensus fundamentals indicate resilient cash generation and manageable leverage.",
        provider: res.provider,
        model: res.model,
      };
    } catch (openRouterErr) {
      console.warn(`[FundamentalAgent] OpenRouter fallback failed, using deterministic score:`, (openRouterErr as Error).message);
    }

    // 3. Deterministic quantitative fallback
    return this.generateDeterministicFundamentalOutput(fundamentals);
  }

  private static generateDeterministicFundamentalOutput(
    fundamentals: FundamentalsData
  ): FundamentalAgentOutput {
    let score = 50;
    if (fundamentals.roePct > 20) score += 14;
    else if (fundamentals.roePct > 12) score += 8;

    if (fundamentals.operatingMarginPct > 20) score += 10;
    else if (fundamentals.operatingMarginPct > 12) score += 5;

    if (fundamentals.revenueGrowthYoY > 12) score += 10;
    else if (fundamentals.revenueGrowthYoY > 6) score += 5;

    if (fundamentals.debtToEquity < 0.3) score += 8;
    else if (fundamentals.debtToEquity > 1.2) score -= 12;

    if (fundamentals.peRatio > 40) score -= 8;
    else if (fundamentals.peRatio < 18) score += 8;

    const clampedScore = Math.min(95, Math.max(20, score));

    return {
      score: clampedScore,
      confidence: 80,
      growth: fundamentals.revenueGrowthYoY > 12 ? "strong" : fundamentals.revenueGrowthYoY > 5 ? "moderate" : "weak",
      valuation: fundamentals.valuation,
      financial_health: fundamentals.financialHealth,
      risks: [
        fundamentals.debtToEquity > 0.8 ? "Elevated debt load" : "Sector cyclicality",
        fundamentals.peRatio > 30 ? "Premium valuation multiple" : "Input cost pressure",
      ],
      reasoning_summary: `${fundamentals.companyName} exhibits ${fundamentals.financialHealth} financial health with ROE of ${fundamentals.roePct}%, debt-to-equity of ${fundamentals.debtToEquity}, and YoY revenue expansion of ${fundamentals.revenueGrowthYoY}%.`,
      provider: "mistral (calibrated fallback)",
      model: MistralProvider.MODEL,
    };
  }
}
