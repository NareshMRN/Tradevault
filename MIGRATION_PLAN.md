# TradeVault to Indian Market AI Trading Agent — Migration Plan (MIGRATION_PLAN.md)

## Executive Summary
This document provides a comprehensive audit and step-by-step migration blueprint for transforming **TradeVault** (a US-centric, multi-broker, multi-agent quantitative execution platform) into **TradeVault India / Confluence NSE**: an educational AI Trading Agent for the **Indian Market (NSE)** that discovers growing sectors, ranks top companies, runs a multi-agent debate with explainable insights, supports paper trading with virtual INR, and is cloud-native on **Google Cloud Platform (GCP)**.

---

## 1. Audit: Legacy Code & Dependency Mapping

| Subsystem | Impacted Locations | Action in Migration |
| :--- | :--- | :--- |
| **Alpaca Integration** | • `server/apps/api/src/services/alpacaService.ts`<br>• `server/apps/api/src/routes/proposals.ts`<br>• `server/apps/api/src/routes/orders.ts`<br>• `server/apps/api/test/alpaca.test.ts`<br>• `server/apps/agent-runtime/requirements.txt` (`alpaca-py`)<br>• `server/packages/shared-schemas/src/index.ts` | **REMOVE**. Live broker execution is replaced by a local, educational `PaperTradingService`. |
| **Live Trading Safety** | • `ALLOW_LIVE_TRADING` in `env.ts`, `.env.example`<br>• `confirm-live` route in `onboarding.ts`<br>• Typed confirmation modal in `SettingsPage.tsx` & `OnboardingPage.tsx`<br>• Bracket order structures | **REMOVE**. Educational / simulation only; virtual money only. |
| **Groq, Mistral, NVIDIA** | • `server/apps/api/src/providers/{groq,mistral,nvidia}.provider.ts`<br>• `server/apps/agent-runtime/app/llm/router.py`<br>• `server/apps/agent-runtime/app/config.py`<br>• `server/apps/api/src/routes/admin.ts` | **REFACTOR**. Remove Mistral and NVIDIA. Retain & reconfigure Groq as an OpenAI-compatible client for Groq-hosted GPT models (`GROQ_BASE_URL`, `GROQ_API_KEY`, `GROQ_MODEL`). Transition LLM stack to Gemini API (`GEMINI_API_KEY`, `GEMINI_MODEL`) + Groq GPT. Remove OpenRouter (optional fallback if key provided). |
| **Kill Switch** | • `server/apps/api/src/middleware/killSwitchGuard.ts`<br>• `server/apps/api/src/routes/killSwitch.ts`<br>• `server/apps/api/test/killSwitch.test.ts`<br>• `server/apps/api/src/websocket/socketServer.ts` (`broadcastKillSwitchUpdate`)<br>• `frontend/src/store/killSwitchStore.ts`<br>• `frontend/src/services/killSwitchService.ts`<br>• `frontend/src/components/layout/TopBar.tsx` | **REMOVE** middleware, endpoints, and frontend store/buttons. Not required for educational paper trading. |
| **RBAC & Admin UI** | • `server/apps/api/src/middleware/roleGuard.ts`<br>• `server/apps/api/src/routes/admin.ts`<br>• `server/apps/api/src/routes/auditLog.ts`<br>• `server/apps/api/src/services/auditLogger.ts`<br>• `server/apps/api/test/auth.test.ts` (admin role test) | **SIMPLIFY** to a single `"user"` role. Delete admin & audit log routes and UI. Retain standard JWT session auth. |
| **Redis & BullMQ** | • `server/apps/api/src/config/redis.ts`<br>• `server/apps/api/package.json` (`@upstash/redis`, `ioredis`, `bullmq`)<br>• `server/docker-compose.yml` (`redis` service)<br>• `server/apps/agent-runtime/app/config.py` (`REDIS_URL`) | **REMOVE**. Replace with in-memory caching for local dev and Firestore for persistence. |
| **MongoDB / Mongoose** | • `server/apps/api/src/db/connection.ts`<br>• `server/apps/api/src/db/models.ts` (all Mongoose schemas)<br>• `server/apps/api/src/routes/*` (all direct Mongoose queries)<br>• `server/apps/agent-runtime/app/agents/graph.py` (Motor)<br>• `server/docker-compose.yml` (`mongodb` service) | **REPLACE** with Google Cloud Firestore (`firebase-admin` in Node, `google-cloud-firestore` in Python if needed, with in-memory fallback for local execution). |
| **Broker WebSocket Events** | • `server/apps/api/src/websocket/socketServer.ts` (`broadcastOrderStatus`)<br>• `frontend/src/services/socket.ts` | **REMOVE** broker order socket status events. Retain `streamAgentMessage` for live debate streaming. |
| **Overfitting Gate** | • `server/apps/api/src/routes/analysis.ts`<br>• `server/apps/agent-runtime/app/quant/backtest.py`<br>• `server/apps/api/test/overfitting_gate.test.ts` | **CONVERT** from hard "force HOLD" override to a calculated "Reliability Score" (0–100) and warning banner without blocking recommendations. |

---

## 2. File Action Matrix (Delete, Replace, Modify, Create)

### A. Files to DELETE
| File Path | Reason |
| :--- | :--- |
| `server/apps/api/src/services/alpacaService.ts` | Alpaca live & paper broker integration removed. |
| `server/apps/api/src/middleware/killSwitchGuard.ts` | Emergency kill switch not needed for educational paper trading. |
| `server/apps/api/src/routes/killSwitch.ts` | Kill switch endpoints deleted. |
| `server/apps/api/src/routes/admin.ts` | Multi-role admin management & telemetry routes deleted. |
| `server/apps/api/src/routes/auditLog.ts` | Financial audit log routes deleted. |
| `server/apps/api/src/services/auditLogger.ts` | Immutability audit logger deleted. |
| `server/apps/api/src/providers/mistral.provider.ts` | Mistral provider removed. |
| `server/apps/api/src/providers/nvidia.provider.ts` | NVIDIA NIM provider removed. |
| `server/apps/api/test/alpaca.test.ts` | Tests Alpaca order submission; obsolete. |
| `server/apps/api/test/killSwitch.test.ts` | Tests kill switch guard; obsolete. |
| `frontend/src/store/killSwitchStore.ts` | Frontend kill switch state deleted. |
| `frontend/src/services/killSwitchService.ts` | Frontend kill switch API calls deleted. |

### B. Files to CREATE
| File Path | Purpose |
| :--- | :--- |
| `MIGRATION_NOTES.md` | Persistent changelog listing all deletions, replacements, and architectural notes. |
| `server/apps/agent-runtime/app/data/__init__.py` | Package init for market data abstractions. |
| `server/apps/agent-runtime/app/data/base.py` | Abstract `MarketDataProvider` base class (`get_universe`, `get_history`, `get_quote`). |
| `server/apps/agent-runtime/app/data/angel_one.py` | Angel One SmartAPI provider with TOTP (pyotp), auto-refresh token, rate-limited batching. |
| `server/apps/agent-runtime/app/data/groww_provider.py` | Interface placeholder for future Groww integration (stub). |
| `server/apps/agent-runtime/app/data/sample_provider.py` | Resilient offline provider loading static 50+ Nifty CSV/JSON OHLCV datasets. |
| `server/apps/agent-runtime/app/data/cache.py` | Caching layer (Firestore daily candle cache with local in-memory fallback). |
| `server/apps/agent-runtime/app/data/nse_sectors.json` | Static mapping of Nifty 50 / Nifty 100 symbols to sectors (Banking, IT, Auto, Pharma, etc.). |
| `server/apps/agent-runtime/app/data/sample/` | Pre-bundled CSV/JSON historical OHLCV data for 50 Nifty stocks (approx. 1 year daily bars). |
| `server/apps/agent-runtime/app/scanner/__init__.py` | Package init for discovery scanner. |
| `server/apps/agent-runtime/app/scanner/engine.py` | Core discovery scanner: `sector_scores()` and `top_stocks()` filtered by risk profile. |
| `server/apps/api/src/services/paperTradingService.ts` | In-memory & Firestore paper trading service (virtual INR 1,000,000 cash balance, positions, live P&L). |
| `server/apps/api/src/routes/discovery.ts` | Discovery scanner routes (`/api/discovery/sectors`, `/api/discovery/picks`, `/api/discovery/run`). |
| `server/apps/api/src/routes/paperPortfolio.ts` | Paper portfolio endpoints (`/api/paper/portfolio`, `/api/paper/positions`, `/api/paper/trade`). |
| `server/apps/api/src/db/firestore.ts` | Firestore SDK initialization (`firebase-admin`) with fallback for local dev. |
| `frontend/src/pages/SectorHeatmapPage.tsx` | Main showcase page: sector score tiles, sector drill-down, top sector stocks. |
| `frontend/src/pages/TopPicksPage.tsx` | Top picks cards: risk badges, bullish/bearish points, Gemini vs Grok agreement, language switcher. |
| `frontend/src/pages/PaperPortfolioPage.tsx` | Virtual portfolio tracker: positions, equity curve, virtual cash, unrealized/realized P&L in ₹. |
| `frontend/src/services/discoveryService.ts` | Frontend client for discovery scanner endpoints. |
| `frontend/src/services/paperTradingService.ts` | Frontend client for virtual portfolio endpoints. |
| `deploy/render.yaml` | Render Blueprint defining both web services (Node API and Python runtime) with env var names, health check paths, and Docker build settings. |
| `deploy/DEPLOY.md` | Deployment guide for Render and Google Cloud setup. |
| `deploy/setup-gcp-resources.sh` | Shell script for provisioning Firestore, service account (role: Datastore User only), and Cloud Scheduler. |

### C. Files to REPLACE or SUBSTANTIALLY REFACTOR
| File Path | Nature of Modification |
| :--- | :--- |
| `server/apps/agent-runtime/app/llm/router.py` | Implement dual-provider LLM router: Gemini API (plain `GEMINI_API_KEY`, `GEMINI_MODEL`) + Groq OpenAI-compatible client (`GROQ_BASE_URL`, `GROQ_API_KEY`, `GROQ_MODEL`). Include shared async rate limiting, exponential backoff on 429, LLM result cache per `(symbol, date, language)`, bidirectional fallback (`Groq -> Gemini`, `Gemini -> Groq`), and fail-safe rule-based fallback flagged `llm_source: "fallback"`. |
| `server/apps/agent-runtime/app/agents/graph.py` | Streamline debate graph: Technical + Gemini (Fundamentals/News, Bull vs Bear debate 1–2 rounds) + Groq GPT (Second opinion, Social Sentiment, Risk Manager, Portfolio Manager). Execute debate only on top 5 picks. Add Gemini vs Groq agreement evaluation and multilingual support (`en`, `kn`, `hi`). |
| `server/apps/agent-runtime/app/agents/prompts.py` | Update prompts for Indian Market context (NSE, Nifty benchmarks, INR figures), low/medium reasoning effort on Groq GPT, capped max output tokens, multilingual synthesis (`en`, `kn`, `hi`), and agreement evaluation. |
| `server/apps/agent-runtime/app/config.py` | Configure `GEMINI_API_KEY`, `GEMINI_MODEL`, `GROQ_API_KEY`, `GROQ_BASE_URL`, `GROQ_MODEL`, and Angel One credentials. Remove `XAI_*`, `OPENROUTER_*`, and `GCP_LOCATION`. |
| `server/apps/agent-runtime/app/main.py` | Add scanner endpoints (`/internal/scanner/run`, `/internal/scanner/sectors`, `/internal/scanner/picks`), Cloud Scheduler shared-secret authentication. |
| `server/apps/agent-runtime/requirements.txt` | Remove `alpaca-py`. Add `google-genai` (for Gemini API), `pyotp`, `smartapi-python` (or direct Angel One client), `google-cloud-firestore`. |
| `server/apps/api/src/server.ts` | Remove kill switch, admin, audit log routers. Mount discovery router and paper portfolio router. Initialize Firestore. |
| `server/apps/api/src/routes/onboarding.ts` | Make risk profile required (conservative, balanced, aggressive). Remove Alpaca paper/live credential inputs and live confirmation. |
| `server/apps/api/src/routes/proposals.ts` | Route order approvals to `PaperTradingService` instead of `AlpacaService`. |
| `server/apps/api/src/routes/orders.ts` | Return paper trading orders/positions from `PaperTradingService`. |
| `server/apps/api/src/routes/analysis.ts` | Remove hard "force HOLD" override; pass through reliability score and warning banner. Support language param (`en`, `kn`, `hi`). |
| `server/apps/api/src/websocket/socketServer.ts` | Remove `broadcastOrderStatus` and `broadcastKillSwitchUpdate`. Retain `streamAgentMessage`. |
| `server/apps/api/src/middleware/roleGuard.ts` | Simplify to single role or deprecate. |
| `server/apps/api/src/config/env.ts` | Remove Alpaca, Redis, Mistral, and NVIDIA keys. Configure Gemini, Groq, GCP, and Angel One keys. |
| `server/apps/api/src/config/redis.ts` | Remove Redis dependencies; use in-memory cache fallback. |
| `server/packages/shared-schemas/src/index.ts` | Add discovery schemas (sector scores, top picks, agreement), update onboarding schema (remove Alpaca, require riskCategory), update order schema for paper trading. |
| `server/docker-compose.yml` | Remove mongo and redis containers. Add Firestore emulator for local testing. |
| `server/.env.example` | Document clean environment variable list for Google Cloud, Vertex AI, Grok, OpenRouter, and Angel One. |
| `frontend/src/App.tsx` | Remove kill switch initialization. Add routes for `/sectors` (Heatmap), `/picks` (Top Picks), `/paper-portfolio`. |
| `frontend/src/components/layout/Sidebar.tsx` | Update navigation: add Sectors (Heatmap), Top Picks, Paper Portfolio. Remove Orders / Kill Switch. |
| `frontend/src/components/layout/TopBar.tsx` | Remove Kill Switch button and status. Add disclaimer banner ("Educational purposes only. Not SEBI-registered investment advice."). |
| `frontend/src/pages/OnboardingPage.tsx` | Simplify to risk profile questionnaire and allocatable virtual capital; remove Alpaca inputs. |
| `frontend/src/pages/SettingsPage.tsx` | Remove Alpaca credentials tab and kill switch settings. |
| `frontend/src/pages/DashboardPage.tsx` | Adapt to Indian market symbols (NSE), INR currency formatting (₹), add data source badge (`live` \| `cache` \| `sample`). |

---

## 3. Phase-by-Phase Implementation Roadmap

### Phase 0: Audit & Migration Planning (CURRENT PHASE)
- **Objective**: Complete exhaustive codebase audit without altering existing code.
- **Deliverables**:
  - `MIGRATION_PLAN.md` (this file) covering all phases, dependency mapping, and file action matrices.
- **Verification**: Zero code regression, current server and frontend remain running.

---

### Phase 1: Remove / Simplify
- **Objective**: Strip out Alpaca, live-trading mechanisms, Redis/BullMQ, Groq/Mistral/Nvidia providers, RBAC admin overhead, and the kill switch, while keeping the app buildable and tests passing.
- **Tasks**:
  1. Delete `alpacaService.ts`, `alpaca.test.ts`. Replace proposal approval execution with a mock paper-order response temporarily.
  2. Delete `killSwitchGuard.ts`, `killSwitch.ts`, `killSwitch.test.ts`, `broadcastKillSwitchUpdate`.
  3. Delete `admin.ts`, `auditLog.ts`, `auditLogger.ts`.
  4. Simplify `roleGuard.ts` and `auth.test.ts` to single "user" role.
  5. Remove `broadcastOrderStatus` from `socketServer.ts`.
  6. Remove `bullmq`, `ioredis`, `@upstash/redis`, `@alpacahq/alpaca-trade-api` from `server/apps/api/package.json`.
  7. Remove `mistral.provider.ts` and `nvidia.provider.ts` from API. Clean legacy provider routes; retain Groq credentials and OpenAI-compatible configuration for the Phase 4 Groq GPT model.
  8. Remove `alpaca-py` from `requirements.txt`.
  9. Update `server/apps/api/src/routes/analysis.ts` and `agent-runtime/app/quant/backtest.py`: modify overfitting gate so `isEligibleForPaperTrading == false` attaches a `reliabilityScore` and `warning` rather than forcibly replacing recommendations with `hold`.
  10. Update `shared-schemas` to strip `alpacaPaperKey`, `alpacaLiveKey`, `confirmLiveTradingSchema`.
  11. Clean frontend: remove `killSwitchStore.ts`, `killSwitchService.ts`, and TopBar kill switch button.
- **Verification**: `npm run build` in server and frontend, `npx vitest run` passing for updated tests.

---

### Phase 2: Market Data Layer (Angel One + Caching + Sample Data)
- **Objective**: Build a robust, rate-limited, multi-tiered market data layer for Indian Equities (NSE).
- **Tasks**:
  1. Create `server/apps/agent-runtime/app/data/base.py` defining `MarketDataProvider`:
     - `get_universe() -> list[dict]` (NSE symbols with sector)
     - `get_history(symbol: str, days: int) -> pd.DataFrame` (daily OHLCV)
     - `get_quote(symbol: str) -> dict` (LTP, change, volume)
  2. Implement `AngelOneProvider` (`app/data/angel_one.py`):
     - Daily session login using `ANGEL_CLIENT_ID`, `ANGEL_PIN`, `ANGEL_API_KEY`, and automated TOTP generation via `pyotp.TOTP(ANGEL_TOTP_SECRET)`.
     - Session token caching and transparent auto-refresh on expiration.
     - Instrument master loader to fetch NSE equity universe.
     - Rate limit protection: sequential batch requests with backoff delays.
  3. Create `SampleDataProvider` (`app/data/sample_provider.py`):
     - Bundle at least 50 Nifty stocks with ~1 year of daily OHLCV bars in `app/data/sample/`.
     - Returns data immediately when Angel One is unconfigured or encounters API/network errors.
  4. Create `CacheLayer` (`app/data/cache.py`):
     - Caches daily candles for the current day (Firestore collection `market_cache` with in-memory dict fallback for local development).
  5. Add static sector mapping `app/data/nse_sectors.json` for Nifty 50/100 stocks.
  6. Create `GrowwProvider` stub (`app/data/groww_provider.py`) implementing `MarketDataProvider` to keep interface extensible.
  7. Router metadata: ensure every quote/history payload includes `data_source: "live" | "cache" | "sample"`.
- **Verification**: Python unit tests verifying `SampleDataProvider` loads 50+ stocks and calculates valid candles; Angel One login tested with fallback activation.

---

### Phase 3: Discovery Scanner (Core Feature)
- **Objective**: Create quant scanning algorithms that rank growing Indian sectors and select top stocks per risk profile.
- **Tasks**:
  1. Create `server/apps/agent-runtime/app/scanner/engine.py`:
     - `sector_scores()`: aggregates 5d/20d/60d returns, relative strength vs Nifty 50 index, volume trend, and annualized volatility for each sector. Outputs normalized score in `[-1.0, 1.0]`.
     - `top_stocks(sector=None, risk_profile='balanced')`:
       - **Low Risk**: Large-cap, lower volatility (ATR / standard deviation), steady momentum.
       - **Medium Risk**: Balanced market-cap, moderate momentum, solid factor score.
       - **High Risk**: Mid/small-cap, high momentum, breakout volume patterns.
  2. Expose runtime scanner endpoints:
     - `POST /internal/scanner/run` (triggers complete scan, runs multi-agent debate only on top 5 picks, caches results)
     - `GET /internal/scanner/sectors` (returns latest ranked sectors)
     - `GET /internal/scanner/picks?risk=low|medium|high` (returns top stocks with debate summaries)
  3. Expose Node API gateway endpoints:
     - `/api/discovery/sectors`
     - `/api/discovery/picks`
     - `/api/discovery/run`
  4. Create shared Zod validation schemas for discovery in `shared-schemas`.
- **Verification**: `curl /internal/scanner/run` completes and outputs top sectors and filtered picks with valid JSON.

---

### Phase 4: LLM Layer Refactor (Gemini API + Groq GPT)
- **Objective**: Implement a resilient, rate-limited multi-agent committee using plain Google Gemini API and Groq OpenAI-compatible client, featuring agreement evaluation, multilingual outputs, and fail-safe quant fallbacks.
- **Tasks**:
  1. **Google Gemini API**:
     - Plain `GEMINI_API_KEY` (using `google-genai` SDK or REST client; NO Vertex AI, no `vertexai=True`, no `GCP_LOCATION`).
     - Model configurable via `GEMINI_MODEL` (e.g. `gemini-2.0-flash`).
     - Assigned Roles: Fundamentals Analysis, News Summarization, Bull vs Bear interactive debate rounds (1–2 rounds), and Multilingual Output synthesis (`en`, `kn`, `hi`).
  2. **Groq GPT (OpenAI-compatible client)**:
     - Configured via `GROQ_BASE_URL=https://api.groq.com/openai/v1`, `GROQ_API_KEY`, and `GROQ_MODEL` (a GPT model hosted on Groq, e.g. `openai/gpt-oss-120b`).
     - Assigned Roles: Second Opinion, Social Sentiment Analysis, Risk Manager (veto/limits check), and Portfolio Manager (final decision and sizing).
     - Set reasoning effort to `low` or `medium` and cap max output tokens to manage latency and rate limits.
  3. **OpenRouter Cleanup & Optional Fallback**:
     - Remove OpenRouter completely from regular config, validation, and requirements.
     - If `OPENROUTER_API_KEY` is not set, silently skip it. If provided, keep it as an optional tertiary fallback.
     - Primary Bidirectional Fallback Chain: `Groq -> Gemini` and `Gemini -> Groq`.
  4. **Free-Tier Rate Limiting & Performance Safeguards**:
     - Implement a shared async rate limiter per provider (tokens-per-minute / requests-per-minute guards).
     - Automated retries with exponential backoff on HTTP 429 status codes.
     - Cache LLM analysis results per `(symbol, date, language)` key in Firestore (with in-memory dict fallback) so repeated scans do not re-consume rate quotas.
     - **Debate Limitation**: Multi-agent debate is executed **strictly on the top 5 picks** from the scanner, never the full universe.
  5. **Timeouts & Fail-Safe Rule-Based Fallback**:
     - Strict timeouts on all LLM calls (e.g. 15–20s).
     - **Zero-Crash Guarantee**: A failed or rate-limited LLM call must never crash a scanner run. If both providers fail or time out, return a deterministic, rule-based explanation generated directly from the Python quant factors (momentum, volatility, RSI, SMA distance), flagged with `llm_source: "fallback"`.
  6. **Gemini vs Groq Agreement Metric**:
     - Compare the Gemini analysis verdict and the Groq GPT second-opinion verdict.
     - Output an `agreement` evaluation: `agree | partially_agree | disagree` with a concise explanatory sentence.
  7. **Multilingual Synthesis**:
     - Support `language` query/body parameter (`en` for English, `kn` for Kannada, `hi` for Hindi).
     - Instruct LLM to output the `rationale`, `bullish_points`, and `risk_points` in the selected Indian language while strictly maintaining validated JSON structures.
- **Verification**: Test run on sample stock producing schema-validated JSON, agreement meter, and language output with simulated 429/timeout gracefully triggering fallback.

---

### Phase 5: Storage and Paper Trading (Firestore)
- **Objective**: Replace MongoDB with Cloud Firestore and implement a full virtual paper trading engine.
- **Tasks**:
  1. Add `firebase-admin` to Node API; initialize Firestore client with project ID from env (`GCP_PROJECT_ID`). Support Firestore emulator via `FIRESTORE_EMULATOR_HOST`.
  2. Create collections: `users`, `watchlists`, `scan_results`, `proposals`, `paper_portfolios`, `paper_trades`.
  3. Remove Mongoose connection and replace database repository calls with Firestore document and collection queries.
  4. Implement `PaperTradingService`:
     - Default virtual cash: ₹1,000,000 (10 Lakhs INR).
     - On proposal approval: fetch current LTP from runtime data provider, create paper trade position (symbol, qty, entry price, timestamp).
     - Live P&L calculation: compare current quote against entry price.
     - Endpoints: `GET /api/paper/portfolio`, `GET /api/paper/positions`, `POST /api/paper/order`.
  5. Update `docker-compose.yml`: remove `mongodb` and `redis`, add `gcr.io/google.com/cloudsdktool/google-cloud-cli:emulators` for Firestore emulator.
- **Verification**: User can register, view starting ₹10,00,000 cash balance, execute a paper trade, and inspect live P&L.

---

### Phase 6: Frontend Experience
- **Objective**: Deliver a modern Indian Market UI featuring Sector Heatmap, Top Picks cards, multilingual toggle, and Paper Portfolio.
- **Tasks**:
  1. **Sector Heatmap Page** (`SectorHeatmapPage.tsx`):
     - Interactive grid of Indian sectors (Nifty Bank, Nifty IT, Nifty Auto, Nifty Pharma, Nifty FMCG, etc.) color-coded by score `[-1, 1]`.
     - Clicking a sector highlights top momentum stocks within that sector.
  2. **Top Picks View** (`TopPicksPage.tsx` or integrated into Dashboard):
     - Cards displaying: Ticker, Company Name, Sector, Score, Risk Level (Low/Med/High badge).
     - Explainable "Why this pick": Bullish factors list, Risk factors list, Forecast range (P10 - P90), Confidence meter.
     - **Gemini vs Grok Agreement Meter**: Visual badge (`Agree` 🟢 / `Partial` 🟡 / `Disagree` 🔴).
     - **Language Switcher**: Header toggle for English (EN), Hindi (HI), and Kannada (KN).
     - **Data Source Badge**: Clearly visible indicator (`🟢 Live (Angel One)` | `🟡 Cached` | `🔵 Sample Data`).
     - **SEBI Disclaimer**: Persistent banner: *"Educational purposes only. Not SEBI-registered investment advice."*
  3. **Paper Portfolio Page** (`PaperPortfolioPage.tsx`):
     - Virtual Net Worth (₹), Available Cash (₹), Unrealized P&L, Realized P&L.
     - Open positions table with live LTP and percentage gains.
     - Equity curve chart using existing chart components.
  4. **Onboarding & Settings Refactor**:
     - Require Risk Profile selection (Low / Medium / High).
     - Remove broker API keys inputs from onboarding and settings.
     - Currency formatted everywhere as INR (`₹`) with Indian numbering format (Lakhs/Crores where appropriate).
- **Verification**: Complete UI walk-through on browser verifying all pages, navigation, language switching, and paper trade execution.

---

### Phase 7: Deployment Readiness (Render Backend + Google Cloud Services)
- **Objective**: Package the Node API and Python Runtime for Render hosting, integrate Google Cloud services (Vertex AI, Firestore, Cloud Scheduler) via service account credentials, and handle cold starts.
- **Tasks**:
  1. **Render Web Services**:
     - Host backend on Render (NOT Cloud Run; all Cloud Run-specific code removed).
     - Node API and Python runtime each get a production `Dockerfile` that listens on the `PORT` env var provided by Render, exposes `/health`, and is stateless.
     - Add `deploy/render.yaml` (Render Blueprint) defining both web services with their env var names (no values), health check paths, and Docker build settings.
  2. **Google Cloud Services Access from Render**:
     - Read service account JSON from `GCP_SERVICE_ACCOUNT_JSON` env var (supports base64 or raw JSON string).
     - At application startup, write it securely to a temporary file (e.g. in OS temp directory), set `GOOGLE_APPLICATION_CREDENTIALS` dynamically, and initialize Firestore (`firebase-admin`). Never commit the JSON file to version control.
     - Gemini API is accessed directly using `GEMINI_API_KEY` (no Vertex AI, no `GCP_LOCATION`).
  3. **Python Runtime Security on Public Free Tier**:
     - Since the Python runtime cannot be a private network service on Render's free tier, it will be a public service.
     - Protect every `/internal/*` route with the `X-Internal-Secret` header using constant-time comparison (`secrets.compare_digest`), strictly rejecting requests without it.
     - Node API calls the runtime using `RUNTIME_URL`.
  4. **Cloud Scheduler Trigger & Service Wakeup**:
     - Keep `POST /internal/scanner/run` callable by Cloud Scheduler (HTTP target with `X-Internal-Secret` header).
     - Add a lightweight `GET /health` endpoint that Cloud Scheduler or an external uptime pinger can call to wake the services from sleep before market scans.
  5. **Cold-Start Handling & CORS**:
     - In the frontend, handle Render slow cold starts: show a "Waking up the server..." indicator and retry `/health` before issuing the first real request.
     - Configure CORS on the Node API using `CLIENT_URL` (the deployed frontend URL on Firebase Hosting or custom domain).
  6. **Internal Scanner Rate Limiting**:
     - Remove Cloud Tasks. Instead, implement rate limiting directly inside the scanner (an async queue with a concurrency limit and delay between Angel One calls to stay within API thresholds).
  7. **Deployment Scripts & Guides**:
     - In `deploy/`, include `render.yaml`, `DEPLOY.md` (clear step-by-step instructions), and `setup-gcp-resources.sh` with `gcloud` commands for creating the Firestore database, creating the service account (role: `Datastore User` only), and scheduling the daily 8:00 AM IST Cloud Scheduler job.
  8. **Documentation**:
     - In `README.md`, add a **"Google Cloud products used"** section listing Firestore, Cloud Scheduler, Firebase Hosting (and Firebase Auth if used), and the Gemini API, plus a **"Hosting"** section noting the backend runs on Render.
- **Verification**: Production Dockerfiles build successfully; local dry-run with service account JSON and `X-Internal-Secret` validates secure cross-service communication.

---

### Phase 8: Final Cleanup & Verification
- **Objective**: Full system audit, updated documentation, verified test suite.
- **Tasks**:
  1. Update `README.md` with Indian market architecture, data flow diagrams, env vars, and setup guides.
  2. Produce `MIGRATION_NOTES.md` documenting all removed components and trade-offs.
  3. Ensure `server/.env.example` is 100% current with only names and descriptions.
  4. Run and pass:
     - `npm run build` in root, `api`, `shared-schemas`, and `frontend`.
     - `npm run lint` / typecheck.
     - Vitest suite for API & Paper Trading.
     - Pytest suite for Python Runtime, Scanner, and Sample Provider.
- **Verification**: End-to-end demo flow runs cleanly from discovery scan -> debate -> paper trade.

---

## 4. Environment Variables Specification

```env
# ==========================================
# Application & Environment
# ==========================================
NODE_ENV=development
PORT=4000
CLIENT_URL=http://localhost:5173

# ==========================================
# Google Cloud Platform (GCP)
# ==========================================
GCP_PROJECT_ID=your-gcp-project-id
# Service account JSON (raw or base64) for Render access to Firestore (role: Datastore User only)
GCP_SERVICE_ACCOUNT_JSON=
FIRESTORE_EMULATOR_HOST=localhost:8080

# ==========================================
# LLM Providers (Gemini API & Groq GPT)
# ==========================================
# Google Gemini API (plain API key; no Vertex AI, no GCP_LOCATION)
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.0-flash

# Groq (OpenAI-compatible client hosting GPT model, e.g. openai/gpt-oss-120b)
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_API_KEY=
GROQ_MODEL=openai/gpt-oss-120b

# Optional fallback (silently skipped if unset)
OPENROUTER_API_KEY=

# ==========================================
# Indian Market Broker (Angel One SmartAPI)
# ==========================================
ANGEL_API_KEY=
ANGEL_CLIENT_ID=
ANGEL_PIN=
ANGEL_TOTP_SECRET=

# ==========================================
# Python Agent Runtime Microservice
# ==========================================
# Runtime URL (Node API -> Python Runtime; public URL on Render)
RUNTIME_URL=http://localhost:8000
# Shared secret for /internal/* route protection (generate with: openssl rand -hex 32)
X_INTERNAL_SECRET=
# Cloud Scheduler shared secret header (generate with: openssl rand -hex 32)
CLOUD_SCHEDULER_SECRET=

# ==========================================
# Authentication & Security
# ==========================================
# JWT secret for user sessions (generate with: openssl rand -base64 48)
JWT_SECRET=
SESSION_COOKIE_NAME=confluence_session
# 32-byte master encryption key for credentials (generate with: openssl rand -hex 32)
MASTER_ENCRYPTION_KEY=
```

---

## 5. Next Steps
Phase 0 is complete. Awaiting user approval to proceed to **Phase 1: Remove / Simplify**.
