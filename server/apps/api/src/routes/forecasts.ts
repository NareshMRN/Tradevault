import { Router, Request, Response } from "express";
import { Forecast } from "../db/models";
import { requireAuth } from "../middleware/auth";
import { AgentRuntimeClient } from "../services/agentRuntimeClient";

export const forecastsRouter = Router();

// Get probabilistic forecast distribution for ticker
forecastsRouter.get("/forecasts/:ticker", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const rawTicker = req.params.ticker;
    const ticker = (Array.isArray(rawTicker) ? rawTicker[0] : rawTicker).toUpperCase();
    const horizon = (req.query.horizon as "1d" | "5d" | "20d") || "5d";

    let forecast = await Forecast.findOne({ ticker, horizon }).sort({ asOfDate: -1 });

    if (!forecast) {
      // Compute on-demand via probabilistic forecasting engine
      const pred = await AgentRuntimeClient.predictForecast(ticker, horizon);
      forecast = await Forecast.findOneAndUpdate(
        { ticker, horizon, asOfDate: pred.asOfDate },
        { ...pred, ticker, horizon },
        { upsert: true, new: true }
      );
    }

    res.json(forecast);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
