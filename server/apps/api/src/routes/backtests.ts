import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import { backtestRequestSchema } from "@confluence/shared-schemas";
import { Backtest } from "../db/models";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { RealBacktestEngine } from "../services/realBacktestEngine";
import { inMemoryStore } from "../db/inMemoryStore";
import { logAuditEvent } from "../services/auditLogger";

export const backtestsRouter = Router();

// Launch a new backtest & overfitting validation run on real market data
backtestsRouter.post(
  "/backtests",
  requireAuth,
  validateBody(backtestRequestSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { strategyName, tickerUniverse, startDate, endDate } = req.body;
      const isDb = mongoose.connection.readyState === 1;

      let backtestId: string;

      if (isDb) {
        const backtest = await Backtest.create({
          userId: req.user!.id,
          strategyName,
          tickerUniverse,
          startDate,
          endDate,
          status: "running",
        });
        backtestId = backtest._id.toString();
      } else {
        const backtest = inMemoryStore.createBacktest(
          req.user!.id,
          strategyName,
          tickerUniverse,
          startDate,
          endDate
        );
        backtestId = backtest.id;
      }

      // Execute quantitative strategy simulation on real historical market data
      (async () => {
        try {
          const result = await RealBacktestEngine.runBacktest(
            strategyName,
            tickerUniverse,
            startDate,
            endDate
          );

          if (isDb) {
            await Backtest.findByIdAndUpdate(backtestId, {
              sharpeRatio: result.sharpeRatio,
              deflatedSharpeRatio: result.deflatedSharpeRatio,
              probabilityOfBacktestOverfitting: result.probabilityOfBacktestOverfitting,
              maxDrawdownPct: result.maxDrawdownPct,
              isEligibleForPaperTrading: result.isEligibleForPaperTrading,
              status: "completed",
              completedAt: new Date(),
            });
          } else {
            inMemoryStore.updateBacktest(req.user!.id, backtestId, {
              sharpeRatio: result.sharpeRatio,
              deflatedSharpeRatio: result.deflatedSharpeRatio,
              probabilityOfBacktestOverfitting: result.probabilityOfBacktestOverfitting,
              maxDrawdownPct: result.maxDrawdownPct,
              isEligibleForPaperTrading: result.isEligibleForPaperTrading,
              status: "completed",
              completedAt: new Date(),
              details: {
                annualizedReturn: result.annualizedReturn,
                annualizedVolatility: result.annualizedVolatility,
                winRate: result.winRate,
                totalTrades: result.totalTrades,
                benchmarkReturn: result.benchmarkReturn,
              },
            });
          }

          await logAuditEvent({
            userId: req.user!.id,
            eventType: "backtest_completed",
            entityType: "backtest",
            entityId: backtestId,
            payload: {
              strategyName,
              sharpeRatio: result.sharpeRatio,
              deflatedSharpeRatio: result.deflatedSharpeRatio,
              pbo: result.probabilityOfBacktestOverfitting,
              eligible: result.isEligibleForPaperTrading,
              annualizedReturn: result.annualizedReturn,
              realData: true,
            },
          }).catch(() => {});
        } catch (err: any) {
          console.error("[Backtest Engine Error]", err);
          if (isDb) {
            await Backtest.findByIdAndUpdate(backtestId, {
              status: "failed",
              completedAt: new Date(),
            });
          } else {
            inMemoryStore.updateBacktest(req.user!.id, backtestId, {
              status: "failed",
              completedAt: new Date(),
            });
          }
        }
      })();

      res.status(202).json({
        message: "Backtest validation job launched on real market data.",
        backtestId,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// List user's backtests
backtestsRouter.get("/backtests", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const isDb = mongoose.connection.readyState === 1;
    if (isDb) {
      const list = await Backtest.find({ userId: req.user!.id }).sort({ createdAt: -1 });
      res.json(list);
    } else {
      const list = inMemoryStore.getBacktests(req.user!.id);
      res.json(list);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get backtest details by ID
backtestsRouter.get("/backtests/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) || "";
    const isDb = mongoose.connection.readyState === 1;
    if (isDb) {
      const backtest = await Backtest.findOne({ _id: id, userId: req.user!.id });
      if (!backtest) {
        res.status(404).json({ error: "Backtest not found." });
        return;
      }
      res.json(backtest);
    } else {
      const backtest = inMemoryStore.getBacktestById(req.user!.id, id);
      if (!backtest) {
        res.status(404).json({ error: "Backtest not found." });
        return;
      }
      res.json(backtest);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
