import { Router, Request, Response } from "express";
import { FactorScore } from "../db/models";
import { requireAuth } from "../middleware/auth";
import { AgentRuntimeClient } from "../services/agentRuntimeClient";

export const factorsRouter = Router();

// Get factor scores for ticker
factorsRouter.get("/factors/:ticker", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const rawTicker = req.params.ticker;
    const ticker = (Array.isArray(rawTicker) ? rawTicker[0] : rawTicker).toUpperCase();
    let latest = await FactorScore.findOne({ ticker }).sort({ asOfDate: -1 });

    if (!latest) {
      // Compute on-demand via quant factor engine
      const factors = await AgentRuntimeClient.computeFactors(ticker);
      latest = await FactorScore.findOneAndUpdate(
        { ticker, asOfDate: factors.asOfDate },
        { ...factors, ticker },
        { upsert: true, new: true }
      );
    }

    const history = await FactorScore.find({ ticker }).sort({ asOfDate: -1 }).limit(30);

    res.json({
      current: latest,
      history,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
