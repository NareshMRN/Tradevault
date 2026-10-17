import { Router, Request, Response } from "express";
import { analysisRunRequestSchema } from "@confluence/shared-schemas";
import {
  AgentRun,
  AgentMessage,
  TradeProposal,
  RiskProfile,
  Backtest,
  ApiCredential,
} from "../db/models";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { AgentRuntimeClient } from "../services/agentRuntimeClient";
import { decryptCredential } from "../services/encryption";
import { logAuditEvent } from "../services/auditLogger";
import { PredictionService } from "../prediction/prediction.service";

export const analysisRouter = Router();


// Launch a multi-agent debate analysis run
analysisRouter.post(
  "/analysis/run",
  requireAuth,
  validateBody(analysisRunRequestSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { ticker, horizon, minConfidence, debateRounds, requireUnanimousConvergence } = req.body;

      // Create new agent run record
      const run = await AgentRun.create({
        userId: req.user!.id,
        ticker,
        horizon,
        status: "running",
      });

      // Decrypt any user-supplied LLM API keys in memory to pass to runtime
      const userCreds = await ApiCredential.find({
        userId: req.user!.id,
        provider: { $in: ["groq", "gemini", "mistral", "nvidia", "openrouter", "agent_router"] },
      });

      const userApiKeys: Record<string, string> = {};
      for (const cred of userCreds) {
        try {
          userApiKeys[cred.provider] = decryptCredential(
            cred.encryptedKey,
            cred.keyIv,
            cred.keyAuthTag
          );
        } catch (e) {}
      }

      await logAuditEvent({
        userId: req.user!.id,
        eventType: "analysis_run_started",
        entityType: "agent_run",
        entityId: run._id.toString(),
        payload: { ticker, horizon, debateRounds, minConfidence },
      });

      // Trigger multi-agent pipeline asynchronously via PredictionService
      (async () => {
        try {
          const predictionResult = await PredictionService.runPipeline(
            ticker,
            (horizon as any) || "5d",
            req.user!.id,
            userApiKeys
          );

          // Populate AgentMessage collection for full backward compatibility with frontend debate views
          const messagesToCreate = [
            {
              runId: run._id,
              agentRole: "technical_analyst" as const,
              llmProvider: "groq" as const,
              sequenceIndex: 1,
              content: predictionResult.technical.agent.reasoning_summary,
              structuredOutput: predictionResult.technical.agent,
            },
            {
              runId: run._id,
              agentRole: "fundamentals_analyst" as const,
              llmProvider: "mistral" as const,
              sequenceIndex: 2,
              content: predictionResult.fundamental.agent.reasoning_summary,
              structuredOutput: predictionResult.fundamental.agent,
            },
            {
              runId: run._id,
              agentRole: "sentiment_analyst" as const,
              llmProvider: "gemini" as const,
              sequenceIndex: 3,
              content: predictionResult.sentiment.agent.reasoning_summary,
              structuredOutput: predictionResult.sentiment.agent,
            },
            {
              runId: run._id,
              agentRole: "risk_manager" as const,
              llmProvider: "nvidia" as const,
              sequenceIndex: 4,
              content: predictionResult.risk.agent.reasoning_summary,
              structuredOutput: predictionResult.risk.agent,
            },
            {
              runId: run._id,
              agentRole: "portfolio_manager" as const,
              llmProvider: "openrouter" as const,
              sequenceIndex: 5,
              content: predictionResult.verification.reasoning_summary,
              structuredOutput: {
                verification: predictionResult.verification,
                fusion: predictionResult.fusion,
                horizons: predictionResult.horizons,
              },
            },
          ];

          for (const msg of messagesToCreate) {
            try {
              await AgentMessage.create(msg);
            } catch (e) {}
          }


          // Check if strategy backtest is eligible for paper trading
          const latestBacktest = await Backtest.findOne({
            userId: req.user!.id,
            tickerUniverse: ticker,
            status: "completed",
          }).sort({ completedAt: -1 });

          let finalAction = predictionResult.prediction.action;
          // Hard rule: If backtest eligibility is false, force 'hold'
          if (latestBacktest && !latestBacktest.isEligibleForPaperTrading && finalAction !== "hold") {
            finalAction = "hold";
            predictionResult.prediction.reasoning = `[OVERFITTING GATE ENGAGED]: Strategy backtest for ${ticker} has not passed deflated Sharpe / PBO robustness checks. Recommendation strictly forced to HOLD. Original draft was ${predictionResult.prediction.action}.`;
          }

          const confidenceVal = Number((predictionResult.confidence.overall_confidence / 100).toFixed(2));

          await AgentRun.findByIdAndUpdate(run._id, {
            status: "completed",
            finalAction,
            confidence: confidenceVal,
            rationale: predictionResult.prediction.reasoning,
            completedAt: new Date(),
          });

          // If action is buy or sell and confidence meets user's threshold, create trade proposal
          if (
            (finalAction === "buy" || finalAction === "sell") &&
            confidenceVal >= minConfidence
          ) {
            const riskProfile = await RiskProfile.findOne({ userId: req.user!.id });
            const capital = riskProfile?.allocatableCapital || 10000;
            const maxPosPct = riskProfile?.maxPositionPct || 10;
            const sizePct = Math.min(5, maxPosPct);
            const estPrice = predictionResult.market_snapshot.price || 150.0;
            const qty = Math.max(1, Math.floor((capital * (sizePct / 100)) / estPrice));

            await TradeProposal.create({
              runId: run._id,
              userId: req.user!.id,
              ticker,
              action: finalAction,
              suggestedQuantity: qty,
              suggestedSizePct: sizePct,
              confidence: confidenceVal,
              status: "pending",
            });
          }

          await logAuditEvent({
            userId: req.user!.id,
            eventType: "analysis_run_completed",
            entityType: "agent_run",
            entityId: run._id.toString(),
            payload: {
              finalAction,
              confidence: confidenceVal,
              predictionId: predictionResult.predictionId,
            },
          });
        } catch (err: any) {
          console.error(`[AnalysisRoute] Error executing prediction pipeline:`, err);
          await AgentRun.findByIdAndUpdate(run._id, {
            status: "failed",
            completedAt: new Date(),
          });
        }
      })();


      res.status(202).json({
        message: "Analysis run started. Track progress live via WebSocket or polling.",
        runId: run._id,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// List user's analysis runs
analysisRouter.get("/analysis/runs", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const runs = await AgentRun.find({ userId: req.user!.id }).sort({ startedAt: -1 }).limit(50);
    res.json(runs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get details for a specific run
analysisRouter.get("/analysis/runs/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const run = await AgentRun.findOne({ _id: req.params.id, userId: req.user!.id });
    if (!run) {
      res.status(404).json({ error: "Run not found." });
      return;
    }
    res.json(run);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get transcript of agent debate messages for a run
analysisRouter.get("/analysis/runs/:id/messages", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const run = await AgentRun.findOne({ _id: req.params.id, userId: req.user!.id });
    if (!run) {
      res.status(404).json({ error: "Run not found." });
      return;
    }

    const messages = await AgentMessage.find({ runId: run._id }).sort({ sequenceIndex: 1 });
    res.json(messages);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
