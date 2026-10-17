import { Request, Response } from "express";
import { PredictionService } from "../prediction/prediction.service";
import { BacktestEngine } from "../backtesting/backtest.service";
import { HorizonKey } from "../prediction/probabilityEngine";
import { ApiCredential } from "../db/models";
import { decryptCredential } from "../services/encryption";

export class PredictionController {
  /**
   * Runs the complete Market Intelligence Engine pipeline.
   * POST /api/prediction/analyze
   */
  public static async analyze(req: Request, res: Response): Promise<void> {
    try {
      const { symbol, ticker, horizon = "5d" } = req.body;
      const targetSymbol = symbol || ticker;

      if (!targetSymbol) {
        res.status(400).json({ error: "Missing required parameter: symbol or ticker" });
        return;
      }

      // Check if user has decrypted custom API keys in database
      const userApiKeys: Record<string, string> = {};
      if (req.user?.id) {
        try {
          const userCreds = await ApiCredential.find({
            userId: req.user.id,
            provider: { $in: ["groq", "gemini", "mistral", "nvidia", "openrouter"] },
          });
          for (const cred of userCreds) {
            try {
              userApiKeys[cred.provider] = decryptCredential(
                cred.encryptedKey,
                cred.keyIv,
                cred.keyAuthTag
              );
            } catch (e) {}
          }
        } catch (e) {}
      }

      const result = await PredictionService.runPipeline(
        targetSymbol,
        horizon as HorizonKey,
        req.user?.id,
        userApiKeys
      );

      res.status(200).json(result);
    } catch (err: any) {
      console.error("[PredictionController.analyze] Error:", err);
      res.status(500).json({ error: err.message || "Failed to run prediction analysis" });
    }
  }

  /**
   * Fetches latest stored prediction for a symbol.
   * GET /api/prediction/latest/:symbol
   */
  public static async getLatest(req: Request, res: Response): Promise<void> {
    try {
      const symbol = String(req.params.symbol || "");
      const prediction = await PredictionService.getLatestPrediction(symbol);
      if (!prediction) {
        res.status(404).json({ error: `No stored prediction found for ${symbol}` });
        return;
      }
      res.status(200).json(prediction);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * Fetches historical predictions for a symbol to evaluate accuracy.
   * GET /api/prediction/history/:symbol
   */
  public static async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const symbol = String(req.params.symbol || "");
      const limit = parseInt((req.query.limit as string) || "20", 10);
      const history = await PredictionService.getPredictionHistory(symbol, limit);
      res.status(200).json(history);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }


  /**
   * Runs point-in-time backtesting.
   * POST /api/prediction/backtest
   */
  public static async backtest(req: Request, res: Response): Promise<void> {
    try {
      const { symbol = "RELIANCE", horizonDays = 5, testPeriodDays = 200 } = req.body;
      const report = await BacktestEngine.runBacktest({
        symbol,
        horizonDays: Number(horizonDays),
        testPeriodDays: Number(testPeriodDays),
      });
      res.status(200).json(report);
    } catch (err: any) {
      console.error("[PredictionController.backtest] Error:", err);
      res.status(500).json({ error: err.message || "Failed to execute backtest" });
    }
  }
}
