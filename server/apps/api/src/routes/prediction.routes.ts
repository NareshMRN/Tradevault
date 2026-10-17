import { Router } from "express";
import { PredictionController } from "../controllers/prediction.controller";
import { optionalAuth } from "../middleware/auth";

export const predictionRouter = Router();

// Run comprehensive multi-agent market intelligence prediction
predictionRouter.post("/analyze", optionalAuth, PredictionController.analyze);

// Get latest stored prediction with timestamps and multi-horizon distribution
predictionRouter.get("/latest/:symbol", PredictionController.getLatest);

// Get historical prediction audit log for a symbol
predictionRouter.get("/history/:symbol", PredictionController.getHistory);

// Trigger point-in-time backtesting
predictionRouter.post("/backtest", PredictionController.backtest);
