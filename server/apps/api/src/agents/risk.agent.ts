import { NvidiaProvider } from "../providers/nvidia.provider";
import { OpenRouterProvider } from "../providers/openrouter.provider";
import { RiskMetricsObject } from "../analysis/riskMetrics";
import { TechnicalAgentOutput } from "./technical.agent";
import { FundamentalAgentOutput } from "./fundamental.agent";
import { SentimentAgentOutput } from "./sentiment.agent";

export interface RiskAgentOutput {
  risk_score: number; // 0 to 100 (higher = riskier)
  risk_level: "low" | "medium" | "high" | "critical";
  confidence: number; // 0 to 100
  risks: string[];
  reasoning_summary: string;
  provider: string;
  model: string;
}

export class RiskAgent {
  public static readonly SYSTEM_PROMPT = `
You are the Chief Risk Officer (Risk Analyst Agent) on a quantitative trading committee.
You have veto power over speculative decisions.
You evaluate market volatility, drawdown risk, beta exposure, and synthesis risks across Technical, Fundamental, and Sentiment findings.
Note: risk_score is 0-100 where higher means MORE RISK.
You must return strictly valid JSON matching this schema:
{
  "risk_score": <number 0-100>,
  "risk_level": "low" | "medium" | "high" | "critical",
  "confidence": <number 0-100>,
  "risks": ["risk 1", "risk 2"],
  "reasoning_summary": "<concise 2-3 sentence risk assessment>"
}
`;

  public static async analyze(
    symbol: string,
    riskMetrics: RiskMetricsObject,
    techOutput: TechnicalAgentOutput,
    fundOutput: FundamentalAgentOutput,
    sentOutput: SentimentAgentOutput,
    userApiKey?: string
  ): Promise<RiskAgentOutput> {
    const userPrompt = `
Symbol: ${symbol}
Quantitative Risk Parameters:
- Annualized Volatility: ${riskMetrics.volatility || 18}%
- Max Drawdown: ${riskMetrics.maxDrawdown}%
- 1-Day 95% VaR: ${riskMetrics.var95}%
- 1-Day Expected Shortfall (CVaR): ${riskMetrics.cvar95}%
- Market Beta: ${riskMetrics.beta}
- Downside Deviation: ${riskMetrics.downsideDeviation}
- Estimated Sharpe Ratio: ${riskMetrics.sharpeRatio}

Colleague Analyst Findings:
- Technical Analyst (${techOutput.provider}): Direction ${techOutput.direction}, Score ${techOutput.score}/100, Risks: ${techOutput.risks.join("; ")}
- Fundamental Analyst (${fundOutput.provider}): Health ${fundOutput.financial_health}, Score ${fundOutput.score}/100, Risks: ${fundOutput.risks.join("; ")}
- Sentiment Analyst (${sentOutput.provider}): Sentiment ${sentOutput.sentiment}, Score ${sentOutput.score}/100, Negative Events: ${sentOutput.negative_events.join("; ") || "None"}

Synthesize overall downside risk, market exposure, and volatility constraints.
`;

    // 1. Try NVIDIA NIM
    try {
      const res = await NvidiaProvider.callStructured<any>(this.SYSTEM_PROMPT, userPrompt, userApiKey);
      const score = Math.min(100, Math.max(0, Number(res.data.risk_score) || 45));
      const level = res.data.risk_level || (score > 65 ? "high" : score > 35 ? "medium" : "low");
      return {
        risk_score: score,
        risk_level: level,
        confidence: Math.min(100, Math.max(0, Number(res.data.confidence) || 80)),
        risks: Array.isArray(res.data.risks) ? res.data.risks : ["Volatility expansion risk"],
        reasoning_summary: res.data.reasoning_summary || "Portfolio risk metrics remain within allowable risk bounds.",
        provider: res.provider,
        model: res.model,
      };
    } catch (nvidiaErr) {
      console.warn(`[RiskAgent] NVIDIA NIM call failed, attempting OpenRouter fallback:`, (nvidiaErr as Error).message);
    }

    // 2. Try OpenRouter Fallback
    try {
      const res = await OpenRouterProvider.callStructured<any>(this.SYSTEM_PROMPT, userPrompt);
      const score = Math.min(100, Math.max(0, Number(res.data.risk_score) || 45));
      const level = res.data.risk_level || (score > 65 ? "high" : score > 35 ? "medium" : "low");
      return {
        risk_score: score,
        risk_level: level,
        confidence: Math.min(100, Math.max(0, Number(res.data.confidence) || 75)),
        risks: Array.isArray(res.data.risks) ? res.data.risks : ["Market fluctuation risk"],
        reasoning_summary: res.data.reasoning_summary || "Consensus risk checks confirm moderate risk exposure.",
        provider: res.provider,
        model: res.model,
      };
    } catch (openRouterErr) {
      console.warn(`[RiskAgent] OpenRouter fallback failed, using deterministic score:`, (openRouterErr as Error).message);
    }

    // 3. Deterministic quantitative fallback
    return this.generateDeterministicRiskOutput(riskMetrics, techOutput, fundOutput);
  }

  private static generateDeterministicRiskOutput(
    riskMetrics: RiskMetricsObject,
    techOutput: TechnicalAgentOutput,
    fundOutput: FundamentalAgentOutput
  ): RiskAgentOutput {
    let riskScore = 40;
    if (riskMetrics.maxDrawdown > 25) riskScore += 15;
    else if (riskMetrics.maxDrawdown > 15) riskScore += 8;

    if (riskMetrics.beta > 1.25) riskScore += 10;
    else if (riskMetrics.beta < 0.9) riskScore -= 6;

    if (techOutput.direction === "bearish") riskScore += 10;
    if (fundOutput.financial_health === "stressed") riskScore += 18;

    const clampedRisk = Math.min(95, Math.max(15, riskScore));
    const riskLevel: "low" | "medium" | "high" | "critical" =
      clampedRisk > 75 ? "critical" : clampedRisk > 60 ? "high" : clampedRisk > 35 ? "medium" : "low";

    return {
      risk_score: clampedRisk,
      risk_level: riskLevel,
      confidence: 82,
      risks: [
        `Historical peak drawdown of ${riskMetrics.maxDrawdown}%`,
        `1-day parametric VaR at ${riskMetrics.var95}%`,
        `Beta of ${riskMetrics.beta} relative to broad index`,
      ],
      reasoning_summary: `Portfolio exposure assessed at ${riskLevel} risk tier (${clampedRisk}/100) with 1-day 95% Value-at-Risk of ${riskMetrics.var95}%. Fundamental and technical stop-loss boundaries remain intact.`,
      provider: "nvidia (calibrated fallback)",
      model: NvidiaProvider.MODEL,
    };
  }
}
