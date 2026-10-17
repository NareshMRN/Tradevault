import dotenv from "dotenv";
import path from "path";

import fs from "fs";

// Load .env from workspace or parent paths
const candidatePaths = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(__dirname, "../../../../.env"),
  path.resolve(__dirname, "../../../.env"),
  path.resolve(__dirname, "../../.env"),
];

for (const p of candidatePaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "4000", 10),
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",

  // MongoDB
  MONGODB_URI:
    process.env.MONGODB_URI || "mongodb://localhost:27017/confluence",

  // Redis / Upstash
  REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL || "",
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN || "",

  // Auth & Cryptography
  JWT_SECRET:
    process.env.JWT_SECRET ||
    "confluence-fallback-jwt-secret-for-development-must-be-long-and-random-321",
  SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME || "confluence_session",
  MASTER_ENCRYPTION_KEY:
    process.env.MASTER_ENCRYPTION_KEY ||
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",

  // LLM Providers (System Fallbacks)
  GROQ_API_KEY: process.env.GROQ_API_KEY || "",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  MISTRAL_API_KEY: process.env.MISTRAL_API_KEY || "",
  NVIDIA_API_KEY: process.env.NVIDIA_API_KEY || "",
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || "",
  AGENT_ROUTER_API_KEY: process.env.AGENT_ROUTER_API_KEY || "",

  // Broker
  ALPACA_PAPER_BASE_URL:
    process.env.ALPACA_PAPER_BASE_URL || "https://paper-api.alpaca.markets",
  ALPACA_LIVE_BASE_URL:
    process.env.ALPACA_LIVE_BASE_URL || "https://api.alpaca.markets",
  ALLOW_LIVE_TRADING: process.env.ALLOW_LIVE_TRADING === "true",

  // Groww Trading API
  GROWW_API_KEY: process.env.GROWW_API_KEY || "",
  GROWW_API_SECRET: process.env.GROWW_API_SECRET || "",
  GROWW_ACCESS_TOKEN: process.env.GROWW_ACCESS_TOKEN || "",
  GROWW_TOTP_SECRET: process.env.GROWW_TOTP_SECRET || "",

  // Agent Runtime
  AGENT_RUNTIME_URL: process.env.AGENT_RUNTIME_URL || "http://localhost:8000",
  AGENT_RUNTIME_INTERNAL_SECRET:
    process.env.AGENT_RUNTIME_INTERNAL_SECRET ||
    "confluence-shared-internal-secret-token-xyz987",

  // Notifications
  SMTP_HOST: process.env.SMTP_HOST || "",
  SMTP_PORT: parseInt(process.env.SMTP_PORT || "587", 10),
  SMTP_USER: process.env.SMTP_USER || "",
  SMTP_PASSWORD: process.env.SMTP_PASSWORD || "",
  NOTIFICATION_FROM_EMAIL:
    process.env.NOTIFICATION_FROM_EMAIL || "alerts@confluence.local",

  LOG_LEVEL: process.env.LOG_LEVEL || "info",
};
