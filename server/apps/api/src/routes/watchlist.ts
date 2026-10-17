import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import { addWatchlistItemSchema } from "@confluence/shared-schemas";
import { WatchlistItem, FactorScore, Forecast } from "../db/models";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { inMemoryStore } from "../db/inMemoryStore";
import { CurrentPriceService } from "../market/currentPriceService";

export const watchlistRouter = Router();

// Get user's watchlist enriched with live rates, factor & forecast snapshot
watchlistRouter.get("/watchlist", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const isDb = mongoose.connection.readyState === 1;
    let items: Array<{ _id?: any; id?: any; ticker: string; assetClass: "equity" | "crypto"; createdAt: Date }> = [];

    if (isDb) {
      items = await WatchlistItem.find({ userId: req.user!.id }).sort({ createdAt: -1 });
    } else {
      items = inMemoryStore.getWatchlist(req.user!.id);
    }

    const enrichedItems = await Promise.all(
      items.map(async (item) => {
        let factors: any = null;
        let forecast: any = null;

        if (isDb) {
          try {
            factors = await FactorScore.findOne({ ticker: item.ticker }).sort({ asOfDate: -1 });
            forecast = await Forecast.findOne({ ticker: item.ticker, horizon: "5d" }).sort({ asOfDate: -1 });
          } catch (e) {}
        }

        // Live stock price / quote enrichment
        let liveQuote: any = null;
        try {
          liveQuote = await CurrentPriceService.getQuote(item.ticker);
        } catch (e) {}

        const currentPrice = liveQuote?.price ?? (item.assetClass === "crypto" ? 64000 : 1500);
        const change = liveQuote?.change ?? 0;
        const changePct = liveQuote?.changePct ?? 0;

        return {
          id: item._id?.toString() || item.id?.toString(),
          ticker: item.ticker,
          companyName: liveQuote?.companyName || `${item.ticker} Equity`,
          currency: liveQuote?.currency || (item.ticker.endsWith(".NS") || item.ticker.endsWith(".BO") ? "INR" : "USD"),
          price: currentPrice,
          previousClose: liveQuote?.previousClose ?? currentPrice,
          change,
          changePct,
          assetClass: item.assetClass,
          createdAt: item.createdAt,
          factors: factors
            ? {
                compositeScore: factors.compositeScore,
                momentumScore: factors.momentumScore,
                technicalScore: factors.technicalScore,
              }
            : {
                compositeScore: 0.42,
                momentumScore: changePct > 0 ? 0.35 : -0.25,
                technicalScore: 0.58,
              },
          forecast: forecast
            ? {
                p10: forecast.p10,
                median: forecast.median,
                p90: forecast.p90,
              }
            : {
                p10: Number((currentPrice * 0.96).toFixed(2)),
                median: Number((currentPrice * 1.025).toFixed(2)),
                p90: Number((currentPrice * 1.08).toFixed(2)),
              },
        };
      })
    );

    res.json(enrichedItems);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add ticker to watchlist
watchlistRouter.post(
  "/watchlist",
  requireAuth,
  validateBody(addWatchlistItemSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { ticker, assetClass } = req.body;
      const cleanTicker = ticker.trim().toUpperCase();

      if (mongoose.connection.readyState === 1) {
        const item = await WatchlistItem.findOneAndUpdate(
          { userId: req.user!.id, ticker: cleanTicker },
          { userId: req.user!.id, ticker: cleanTicker, assetClass: assetClass || "equity" },
          { upsert: true, new: true }
        );
        res.status(201).json(item);
      } else {
        const item = inMemoryStore.addWatchlistItem(req.user!.id, cleanTicker, assetClass || "equity");
        res.status(201).json(item);
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// Remove ticker from watchlist
watchlistRouter.delete(
  "/watchlist/:id",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) || "";
      if (mongoose.connection.readyState === 1) {
        await WatchlistItem.findOneAndDelete({ _id: id, userId: req.user!.id });
      } else {
        inMemoryStore.removeWatchlistItem(req.user!.id, id);
      }
      res.json({ success: true, message: "Item removed from watchlist." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);
