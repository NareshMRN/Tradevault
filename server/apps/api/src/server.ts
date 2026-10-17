import http from "http";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { connectDB } from "./db/connection";
import { initSocketServer } from "./websocket/socketServer";

// Route modules
import { authRouter } from "./routes/auth";
import { onboardingRouter } from "./routes/onboarding";
import { credentialsRouter } from "./routes/credentials";
import { watchlistRouter } from "./routes/watchlist";
import { factorsRouter } from "./routes/factors";
import { forecastsRouter } from "./routes/forecasts";
import { backtestsRouter } from "./routes/backtests";
import { analysisRouter } from "./routes/analysis";
import { proposalsRouter } from "./routes/proposals";
import { ordersRouter } from "./routes/orders";
import { killSwitchRouter } from "./routes/killSwitch";
import { auditLogRouter } from "./routes/auditLog";
import { adminRouter } from "./routes/admin";
import { marketRouter } from "./routes/market";
import { predictionRouter } from "./routes/prediction.routes";
import morgan from "morgan";

export const app = express();
const httpServer = http.createServer(app);

// Request logger: prints every request and response path in the terminal
app.use(morgan("dev"));

// Parse CLIENT_URL for multiple origins (comma-separated)
const allowedOrigins = env.CLIENT_URL.split(",").map((o) => o.trim()).filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.some((allowed) => origin === allowed || allowed === "*")) {
        return callback(null, true);
      }
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));


// Health check endpoints
const healthCheckHandler = (req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "tradevault-api",
    timestamp: new Date().toISOString(),
    database: "mongodb",
  });
};
app.get("/health", healthCheckHandler);
app.get("/api/health", healthCheckHandler);

// API Routes
app.use("/api/auth", authRouter);
app.use("/api", onboardingRouter);
app.use("/api", credentialsRouter);
app.use("/api", watchlistRouter);
app.use("/api", factorsRouter);
app.use("/api", forecastsRouter);
app.use("/api", backtestsRouter);
app.use("/api", analysisRouter);
app.use("/api", proposalsRouter);
app.use("/api", ordersRouter);
app.use("/api", killSwitchRouter);
app.use("/api", auditLogRouter);
app.use("/api", adminRouter);
app.use("/api", marketRouter);
app.use("/api/prediction", predictionRouter);

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("[API Error Handler]", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
});

// Initialize Socket.io
initSocketServer(httpServer);

// Start server when run directly
if (process.env.NODE_ENV !== "test") {
  (async () => {
    await connectDB();
    httpServer.listen(env.PORT, () => {
      console.log(`🚀 TradeVault API Gateway running on port ${env.PORT} (${env.NODE_ENV})`);
    });
  })();
}

export { httpServer };
