# Migration Notes — TradeVault to Indian Market AI Trading Agent

This document tracks all removals, replacements, and architectural refactoring decisions made during the migration, along with the rationale for each change.

---

## Phase 1: Remove / Simplify

### 1. Alpaca Broker & Live-Trading Code
- **Files Deleted**:
  - `server/apps/api/src/services/alpacaService.ts`: Deleted. Alpaca REST execution, bracket orders, and live order submissions are not needed for an educational, Indian-market platform.
  - `server/apps/api/test/alpaca.test.ts`: Deleted. Tested Alpaca broker order submission.
- **Dependencies Removed**:
  - `@alpacahq/alpaca-trade-api` from `server/apps/api/package.json`.
  - `alpaca-py` from `server/apps/agent-runtime/requirements.txt`.
- **Files Modified**:
  - `server/apps/api/src/routes/proposals.ts`: Replaced `AlpacaService.submitOrder()` with an immediate virtual paper-order acknowledgment pending Phase 5 `PaperTradingService`.
  - `server/apps/api/src/routes/onboarding.ts`: Removed `alpacaPaperKey`, `alpacaPaperSecret`, and the `confirm-live` route.
  - `server/apps/api/src/routes/credentials.ts`: Removed `alpaca_paper` and `alpaca_live` credential providers.
  - `server/apps/api/src/config/env.ts`: Removed `ALPACA_PAPER_BASE_URL`, `ALPACA_LIVE_BASE_URL`, and `ALLOW_LIVE_TRADING`.
  - `server/packages/shared-schemas/src/index.ts`: Removed Alpaca key fields and `confirmLiveTradingSchema`.
  - `frontend/src/pages/OnboardingPage.tsx` & `SettingsPage.tsx`: Removed Alpaca API key inputs and broker configuration rows.
  - `frontend/src/services/onboardingService.ts`: Removed `confirmLiveTrading` and Alpaca key parameters.
- **Rationale**: Target product is strictly educational paper trading with virtual INR. Real broker credentials and live capital execution mechanisms introduce unnecessary risk, security overhead, and US-market coupling.

### 2. Emergency Kill Switch
- **Files Deleted**:
  - `server/apps/api/src/middleware/killSwitchGuard.ts`: Deleted middleware.
  - `server/apps/api/src/routes/killSwitch.ts`: Deleted `/api/kill-switch/*` endpoints.
  - `server/apps/api/test/killSwitch.test.ts`: Deleted test suite.
  - `frontend/src/store/killSwitchStore.ts`: Deleted frontend state store.
  - `frontend/src/services/killSwitchService.ts`: Deleted frontend service.
- **Files Modified**:
  - `server/apps/api/src/server.ts`: Removed `killSwitchRouter`.
  - `server/apps/api/src/websocket/socketServer.ts`: Removed `broadcastKillSwitchUpdate`.
  - `server/apps/api/src/routes/auth.ts`: Removed `killSwitchEngaged` property from auth payload.
  - `frontend/src/App.tsx`: Removed `initKillSwitch()`.
  - `frontend/src/components/layout/TopBar.tsx`: Removed kill switch emergency button.
- **Rationale**: The kill switch was designed to immediately halt real-money automated market orders. With no live trading and only educational virtual simulation, the kill switch is redundant.

### 3. RBAC, Admin Routes & Financial Audit Log
- **Files Deleted**:
  - `server/apps/api/src/routes/admin.ts`: Deleted. Multi-role admin management and token accounting routes removed.
  - `server/apps/api/src/routes/auditLog.ts`: Deleted. Immutability audit-log endpoints removed.
  - `server/apps/api/src/services/auditLogger.ts`: Deleted.
- **Files Modified**:
  - `server/apps/api/src/middleware/roleGuard.ts`: Simplified to single `"user"` role.
  - `server/apps/api/src/server.ts`: Unmounted `adminRouter` and `auditLogRouter`.
  - `server/apps/api/test/auth.test.ts`: Updated tests for single role.
- **Rationale**: Hackathon project is user-facing; multi-tier administrative governance and enterprise audit immutability logs add unnecessary code complexity.

### 4. Redis and BullMQ
- **Files Modified**:
  - `server/apps/api/src/config/redis.ts`: Replaced Upstash/ioredis client with lightweight, fast in-memory cache client.
  - `server/apps/api/src/config/env.ts`: Removed `REDIS_URL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
  - `server/apps/agent-runtime/app/config.py`: Removed `REDIS_URL`.
  - `server/apps/api/package.json`: Removed `bullmq`, `ioredis`, `@upstash/redis`.
  - `server/docker-compose.yml`: Removed `redis` container service.
- **Rationale**: Removes external Redis infrastructure dependency. In-memory caching provides instant local development speed without requiring background Redis instances.

### 5. Legacy LLM Providers (Mistral & NVIDIA NIM)
- **Files Deleted**:
  - `server/apps/api/src/providers/mistral.provider.ts`: Deleted.
  - `server/apps/api/src/providers/nvidia.provider.ts`: Deleted.
- **Files Modified**:
  - `server/apps/agent-runtime/app/config.py`: Removed Mistral and NVIDIA API keys and model configurations.
- **Rationale**: The LLM committee is being unified around the Gemini API and Groq GPT (OpenAI-compatible client).

### 6. Broker WebSocket Status Events
- **Files Modified**:
  - `server/apps/api/src/websocket/socketServer.ts`: Removed `broadcastOrderStatus` event emitter. Retained `streamAgentMessage` for live agent debate streaming.
  - `frontend/src/services/socket.ts`: Cleaned listener.
- **Rationale**: Alpaca order lifecycle events (`order:status`) are no longer used.

### 7. Overfitting Gate Soft Override
- **Files Modified**:
  - `server/apps/api/src/routes/analysis.ts`: Converted the hard block that forcibly coerced recommendations into `"hold"` when `isEligibleForPaperTrading == false`. Replaced with a non-blocking `reliabilityScore` (0–100) and an `overfittingWarning` banner.
  - `server/apps/agent-runtime/app/quant/backtest.py`: Computes composite `reliabilityScore` alongside DSR and PBO.
  - `server/apps/api/test/overfitting_gate.test.ts`: Updated to verify recommendations are preserved while the warning is surfaced.
- **Rationale**: In an educational platform, users should see the agent committee's reasoning accompanied by statistical reliability diagnostics rather than opaque forced "HOLD" overrides.

### 8. Environment Example Clean-up
- **Files Modified**:
  - `server/.env.example`: Removed placeholder secret values (`JWT_SECRET`, `MASTER_ENCRYPTION_KEY`, internal secret). Added generation instructions via `openssl`. Removed all Alpaca, Redis, and legacy provider keys. Added Gemini and Groq GPT keys.

---

## Phase 2: Market Data Layer (NSE + Indian Sectors + Resilient Multi-Provider)

### 1. Abstract Base & Contracts
- **Files Created**:
  - `server/apps/agent-runtime/app/data/base.py`: Defines the `MarketDataProvider` abstract base class with standard async/sync interfaces: `get_universe()`, `get_history(symbol, days)`, and `get_quote(symbol)`.
- **Rationale**: Ensures uniform interfaces across disparate market providers (Angel One, Groww, Sample Data) so the rest of the application remains decoupled from provider-specific schemas.

### 2. Static NSE Sector Universe Mapping
- **Files Created**:
  - `server/apps/agent-runtime/app/data/nse_sectors.json`: Static mapping of 55 prominent Nifty 50 and Nifty 100 stocks spanning 10 key sectors: Banking, IT, Energy, Auto, FMCG, Pharma, Metals, Infrastructure, Telecom, and Defence. Categorized with market cap tier (large, mid, small) and clean company names.
- **Rationale**: Provides guaranteed sector classification and universe metadata even in completely offline, simulated, or rate-limited environments.

### 3. Sample Data Provider (Bundled Offline OHLCV)
- **Files Created**:
  - `server/apps/agent-runtime/app/data/sample_provider.py`: Automatically generates and bundles realistic 1-year daily OHLCV bars for all 55 stocks in `server/apps/agent-runtime/app/data/sample/`.
  - Generates realistic Indian price levels (e.g. MRF at ~₹125,000, Reliance at ~₹2,950, ITC at ~₹430) with geometric Brownian motion drift and volatility.
- **Rationale**: Eliminates reliance on live market API credentials during development, testing, hackathon judging, and emergency outages.

### 4. Angel One SmartAPI Provider
- **Files Created**:
  - `server/apps/agent-runtime/app/data/angel_one.py`: Implements `AngelOneProvider` using SmartAPI REST client with automated TOTP login (`pyotp.TOTP`), JWT token caching, auto-refresh on expiration, instrument master lookup, and sequential request rate-limiting with 0.35s throttling.
- **Rationale**: Provides live NSE market quotes and candle data when valid Angel One developer credentials are provided.

### 5. Multi-Tier Cache Layer
- **Files Created**:
  - `server/apps/agent-runtime/app/data/cache.py`: Supports in-memory TTL caching with optional Google Cloud Firestore collection (`market_cache`).
- **Rationale**: Drastically reduces external API calls, preserves rate limits, and accelerates response times for repeated queries within the same trading session.

### 6. Groww Provider Adapter
- **Files Created**:
  - `server/apps/agent-runtime/app/data/groww_provider.py`: Implements `MarketDataProvider` contract wrapping the existing `GrowwMarketClient`.
- **Rationale**: Retains the Groww client as a secondary provider in the fallback pipeline.

### 7. Unified Market Data Router & Endpoint Protection
- **Files Created / Modified**:
  - `server/apps/agent-runtime/app/data/router.py`: Coordinates the fallback chain: `Angel One -> Groww -> Cache -> Sample Data`. Attaches `data_source: "live" | "cache" | "sample"` metadata to every quote and historical series.
  - `server/apps/agent-runtime/app/main.py`: Exposes `/internal/market/quote/{ticker}`, `/internal/market/history/{ticker}`, `/internal/market/universe`, and `/internal/market/sectors`. Protected with `secrets.compare_digest` against `AGENT_RUNTIME_INTERNAL_SECRET`.
  - `server/apps/agent-runtime/app/quant/factors.py`: Updated to source daily historical bars directly through `market_router.get_history`.
- **Rationale**: Transparently guarantees market data availability under all conditions while tagging origin metadata and securing internal runtime endpoints.

### 8. Verification & Tests
- **Files Created / Modified**:
  - `server/apps/agent-runtime/tests/test_market_data.py`: Added 7 comprehensive unit tests (sample provider, Angel One unconfigured fallback, cache TTL, router fallback chain & metadata, sector filtering).
  - `server/apps/agent-runtime/tests/test_groww_client.py`: Updated model mapping assertions for Gemini + Groq GPT.
  - Test suites: 19/19 Python tests passing, 19/19 Node Vitest tests passing.

---

## Phase 3: Discovery Scanner (Core Feature)

### 1. Discovery Zod Schemas
- **Files Modified**:
  - `server/packages/shared-schemas/src/index.ts`: Added `discoverySectorSchema`, `discoveryStockPickSchema`, `discoveryScanResultSchema`, and `discoveryPicksQuerySchema`.
- **Rationale**: Establishes strong end-to-end type contracts across Node API, Agent Runtime, and Frontend.

### 2. Quant Discovery Scanner Engine
- **Files Created**:
  - `server/apps/agent-runtime/app/scanner/__init__.py`: Package entrypoint.
  - `server/apps/agent-runtime/app/scanner/engine.py`: Implements `ScannerEngine`:
    - `sector_scores()`: Aggregates 5d, 20d, and 60d returns, relative strength against the benchmark (Nifty 50 proxy), 20d/50d volume trend ratio, and annualized volatility for each sector. Produces normalized momentum score in `[-1.0, 1.0]` and classifies trend (`bullish`, `bearish`, `neutral`).
    - `top_stocks()`: Ranks stocks tailored to risk profiles (`conservative`, `balanced`, `aggressive`):
      - *Conservative*: Prioritizes large-cap stability, low volatility (<0.22 annualized), and steady momentum.
      - *Balanced*: Balances momentum, volume surge, and high-quality large/mid cap factors.
      - *Aggressive*: Prioritizes high momentum, volume breakout patterns (>1.25x), and mid/small caps.
      - Generates rich diagnostic signals (e.g. "Strong 20d momentum (+8.4%)", "Institutional volume surge (1.42x 50d avg)").
    - `run_full_scan()`: Runs a complete universe scan, selects top stocks, and runs multi-agent debate synthesis strictly on the top 5 picks with a zero-crash fallback guarantee (`llm_source: "fallback"`).
- **Rationale**: Replaces manual single-stock guessing with an algorithmic scanner specifically designed for the Indian equities landscape.

### 3. Agent Runtime Internal Scanner Endpoints
- **Files Modified**:
  - `server/apps/agent-runtime/app/main.py`: Exposes:
    - `POST /internal/scanner/run` (triggers full scan, debate on top 5 picks, caches results)
    - `GET /internal/scanner/sectors` (returns ranked sectors)
    - `GET /internal/scanner/picks` (returns top stocks per risk profile and sector)
    - `GET /internal/scanner/latest` (returns latest scan cache)
  - All endpoints are protected with constant-time `secrets.compare_digest(token, settings.AGENT_RUNTIME_INTERNAL_SECRET)`.
- **Rationale**: Enables both scheduled execution (Cloud Scheduler) and on-demand user discovery.

### 4. Node API Discovery Gateway
- **Files Created / Modified**:
  - `server/apps/api/src/routes/discovery.ts`: Proxies discovery requests to the Agent Runtime with `x-internal-secret` and provides offline fallback data if the runtime service is unreachable.
  - `server/apps/api/src/server.ts`: Mounted `/api` discovery routes.
- **Rationale**: Shields the internal Python runtime behind the Node API gateway and guarantees continuous uptime for frontend consumers.

### 5. Verification & Test Coverage
- **Files Created / Modified**:
  - `server/apps/agent-runtime/tests/test_scanner.py`: 4 comprehensive unit tests verifying sector score bounds, risk profile filtering, top 5 debate generation, and constant-time token security.
  - `server/apps/api/test/discovery.test.ts`: 4 integration tests verifying Node gateway responses for `/api/discovery/sectors`, `/api/discovery/picks`, `/api/discovery/run`, and `/api/discovery/latest`.
  - Pytest Suite: **23/23 tests passing**.
  - Vitest Suite: **23/23 tests passing**.
  - TypeScript Compilation: `server` and `frontend` builds pass with 0 errors.

---

## Phase 4: LLM Layer Refactor (Gemini API + Groq GPT + Multilingual & Agreement)

### 1. Dual-Provider LLM Router Architecture
- **Files Modified**:
  - `server/apps/agent-runtime/app/llm/router.py`: Replaced legacy Mistral/NVIDIA client code with a high-performance dual-provider architecture:
    - **Google Gemini API**: Plain `GEMINI_API_KEY` with `GEMINI_MODEL` (`gemini-2.5-flash`), responsible for Fundamentals, News Summarization, Bull vs Bear interactive debate rounds (1-2), and Multilingual Output synthesis (`en`, `kn`, `hi`).
    - **Groq GPT**: OpenAI-compatible client (`GROQ_BASE_URL=https://api.groq.com/openai/v1`, `GROQ_API_KEY`, `GROQ_MODEL=openai/gpt-oss-120b`) with low/medium reasoning temperature (0.2) and capped output tokens (800), responsible for Technical Analysis, Social Sentiment, Quantitative Trader, Risk Manager, and Portfolio Manager.
    - **Bidirectional Fallback**: Automatic failover `Groq -> Gemini` and `Gemini -> Groq`. OpenRouter is skipped completely unless `OPENROUTER_API_KEY` is provided.
    - **Resilience & Rate Limiting**: Shared async semaphore, exponential backoff on HTTP 429 (`1.5 * 2^attempt`), circuit breaker tripping after 3 consecutive failures for 30s.
    - **In-Memory Cache**: Caches responses per `(symbol, date, language, role)`.
    - **Zero-Crash Guarantee**: If all external LLMs fail or time out, deterministic rule-based outputs are derived directly from quant factors (momentum, RSI, volatility, volume), tagged with `llm_source: "fallback"`.
- **Rationale**: Eliminates unstable multi-provider dependencies while preserving deep reasoning diversity between Gemini and Groq with 100% uptime guarantees.

### 2. Multi-Agent Debate Graph Streamlining & Agreement Evaluation
- **Files Modified**:
  - `server/apps/agent-runtime/app/agents/graph.py`: Streamlined to 4 analysts (Gemini Fundamentals & News, Groq Technical & Sentiment) + Gemini Bull/Bear debate rounds (1-2) + Groq Trader + Groq Risk Manager + Groq Portfolio Manager.
  - **Agreement Evaluation Engine**: Calculates numerical consensus between Gemini stances and Groq stances, comparing analyst direction and Bull conviction vs Portfolio Manager confidence. Yields `geminiGroqAgreement` in `[0.0, 1.0]` and flags divergence (`divergenceFlag = True` when < 0.60).
  - **Multilingual Synthesis**: Synthesizes committee decisions into English (`en`), Kannada (`kn` / ಕನ್ನಡ), or Hindi (`hi` / हिन्दी).
  - `server/apps/agent-runtime/app/agents/prompts.py`: Rewritten specifically for Indian Equities (NSE/Nifty, INR currency, SEBI educational disclaimers, regional multilingual translation rules).
- **Rationale**: Empowers Indian retail investors with regional language accessibility while providing transparent AI committee agreement diagnostics.

### 3. Shared Schemas & Node Alignment
- **Files Modified**:
  - `server/packages/shared-schemas/src/index.ts`: Added `language` (`"en" | "kn" | "hi"`) to `analysisRunRequestSchema`.
  - `server/apps/agent-runtime/app/schemas/agent_schemas.py`: Added `MultilingualSynthesisOutput`, updated `min_length`/`max_length`.
  - `server/apps/api/src/services/agentRuntimeClient.ts`: Added `language` support.
  - `server/apps/api/src/routes/analysis.ts`: Forwarded `language` to execution pipeline.
- **Rationale**: Ensures type-safe schema synchronization across monorepo boundaries.

### 4. Verification & Test Coverage
- **Files Modified**:
  - `server/apps/agent-runtime/tests/test_router.py`: Expanded with 6 unit and integration tests (fallback chain, circuit breaker, caching, Kannada/Hindi synthesis, and full multi-agent debate run with agreement evaluation).
  - Pytest Suite: **27/27 tests passing**.
---

## Phase 5: Paper Trading Portfolio in INR (Virtual Capital & Execution)

### 1. Shared Paper Trading Schemas
- **Files Modified**:
  - `server/packages/shared-schemas/src/index.ts`: Added schemas for paper trading:
    - `paperOrderRequestSchema`: Validates symbol (NSE format e.g. `RELIANCE`, `TCS`), action (`BUY` / `SELL`), quantity, orderType (`MARKET` / `LIMIT`), limitPrice, and optional proposalId.
    - `paperPositionSchema`: Tracks symbol, quantity, averageEntryPrice, currentPrice, marketValue, unrealizedPnL, unrealizedPnLPercent, and lastUpdated.
    - `paperOrderSchema`: Full order audit record with id, userId, symbol, action, quantity, executedPrice, totalValue, status (`FILLED` / `REJECTED` / `CANCELLED`), reason, and executedAt.
    - `paperPortfolioSummarySchema`: Comprehensive portfolio health metric including totalCapital, availableCash, investedCapital, currentValue, totalPnL, totalPnLPercent, realizedPnL, unrealizedPnL, winRate, tradesCount, currency (`"INR"`), positions, and recentOrders.
- **Rationale**: Strongly typed contracts across shared packages ensure zero serialization mismatch between Node backend and frontend clients.

### 2. High-Performance Paper Trading Service
- **Files Created**:
  - `server/apps/api/src/services/paperTradingService.ts`:
    - Manages virtual capital with default ₹1,000,000 INR (`INITIAL_VIRTUAL_CAPITAL_INR`).
    - Multi-tenant state support keyed by `userId` (with in-memory persistence and automatic quote resolution).
    - Quote resolution integrated directly with `AgentRuntimeClient.getQuote(symbol)` and fallback price table for top NSE stocks.
    - Real-time mark-to-market calculations on portfolio retrieval, recalculating positions against live/cached market quotes.
    - Buy executions validate cash sufficiency; Sell executions validate holding quantities and calculate realized PnL against weighted average cost basis.
    - Portfolio reset functionality (`resetPortfolio`) for instant simulation restarts.
    - Win-rate tracking based on historical realized trade PnLs.
- **Rationale**: Replaces US-broker live trading and bracket orders with a localized, educational virtual paper trading engine adhering to Indian market prices and accounting.

### 3. REST API Endpoints & Route Integration
- **Files Created / Modified**:
  - `server/apps/api/src/routes/paperPortfolio.ts`: Exposes:
    - `GET /api/paper-portfolio` (fetches real-time portfolio summary, holdings, and recent orders)
    - `POST /api/paper-portfolio/order` (executes virtual market/limit BUY or SELL)
    - `POST /api/paper-portfolio/reset` (resets account balance back to ₹10,00,000 INR)
    - `GET /api/paper-portfolio/positions` & `GET /api/paper-portfolio/orders`
  - `server/apps/api/src/server.ts`: Mounted `paperPortfolioRouter` at `/api/paper-portfolio`.
  - `server/apps/api/src/routes/proposals.ts`: Integrated proposal approval handler directly with `PaperTradingService.executeOrder()` so accepted AI recommendations immediately translate into virtual portfolio positions.
  - `server/apps/api/src/routes/orders.ts`: Updated order history queries to pull from `PaperTradingService`.
- **Rationale**: Seamlessly connects discovery and debate recommendations directly into the user's paper portfolio.

### 4. Verification & Test Coverage
- **Files Created**:
  - `server/apps/api/test/paper_trading.test.ts`: Added 11 automated unit and integration tests covering:
    - Initial virtual capital balance of ₹10,00,000 INR.
    - Market BUY order execution, cash deduction, and position creation.
    - Multi-buy weighted average entry price calculation.
    - Rejection of BUY orders exceeding available virtual cash.
    - Market SELL order execution, realized profit/loss calculation, and cash credit.
    - Rejection of SELL orders exceeding current holdings.
    - Complete liquidation of position on total quantity sale.
    - Real-time mark-to-market portfolio valuation with simulated market price shifts.
    - Portfolio balance reset back to initial capital.
    - Direct integration with Proposal approval endpoint.
  - Vitest Suite: **34/34 tests passing** across 6 test suites (`overfitting_gate`, `encryption`, `prediction_engine`, `discovery`, `auth`, `paper_trading`).
  - Monorepo Compilation: Both `@confluence/shared-schemas` and `@confluence/api` build with 0 TypeScript errors.

---

## Phase 6: Frontend Refactor (Indian Market UX + Discovery + Paper Portfolio)

### 1. Indian Rupee (INR) & Number Formatters
- **Files Created**:
  - `frontend/src/utils/formatters.ts`: Implemented `formatINR(amount, options)` supporting standard Indian comma groupings (e.g., `₹10,00,000.00`, Lakhs/Crores compact formatting `₹10.0 L`, `₹1.5 Cr`), `formatPercent(val)`, and `formatIndianNumber(num)`.
- **Rationale**: Replaced US dollar formatting across all client pages with authentic Indian financial formatting.

### 2. Multilingual State Store & Translations
- **Files Created**:
  - `frontend/src/store/languageStore.ts`: Provides dynamic language state for English (`en`), Kannada (`kn` / ಕನ್ನಡ), and Hindi (`hi` / हिन्दी) persisted in localStorage with translations for all navigation, discovery signals, agreement diagnostics, and portfolio metrics.
- **Rationale**: Empowers Indian retail investors across regional languages with localized AI committee explanations and disclaimers.

### 3. Frontend Discovery & Paper Portfolio API Services
- **Files Created**:
  - `frontend/src/services/discoveryService.ts`: Typed API client for `getSectors()`, `getTopPicks(riskProfile, sector, language)`, `getLatestScan()`, and `runScan(riskProfile, language)`.
  - `frontend/src/services/paperPortfolioService.ts`: Typed API client for `getPortfolio()`, `executeOrder(order)`, `resetPortfolio()`, `getPositions()`, and `getOrders()`.
- **Rationale**: Decouples UI components from REST endpoints and provides strongly-typed interfaces.

### 4. Interactive NSE Sector Heatmap Page
- **Files Created**:
  - `frontend/src/pages/SectorHeatmapPage.tsx`: Interactive color-coded grid across 10 NSE sectors (Banking, IT, Energy, Auto, Pharma, FMCG, Metals, Infrastructure, Telecom, Defence):
    - Color-coded momentum scale `[-1, 1]` (emerald for strong bull, teal for moderate, amber for neutral, rose for bearish).
    - Returns breakdown (5d, 20d, 60d), volume trend ratio, constituent count.
    - Click-to-filter interaction dynamically surfacing constituent top momentum stocks.
    - On-demand "Scan Market Now" button triggering full algorithmic market scan.
    - Data source badge (`🟢 Live (Angel One)` | `🟡 Cached Data` | `🔵 Sample Mode`).
- **Rationale**: Gives users a bird's-eye view of where institutional capital is flowing across the Indian economy.

### 5. AI Top Picks Recommendation Page
- **Files Created**:
  - `frontend/src/pages/TopPicksPage.tsx`:
    - Risk Profile filter tabs: Conservative (Low Risk), Balanced (Recommended), Aggressive (High Momentum).
    - Sector filter dropdown.
    - AI Committee Agreement Meter: Visual status badge (`Strong Consensus 🟢` / `Moderate Agreement 🟡` / `Divergent Debate 🔴`) with percentage score and divergence alert banner.
    - Explainable "Why this pick": Bullish factors, risk factors, GluonTS P10-P90 forecast ranges, and localized rationale in selected language.
    - One-click "Paper Buy" modal executing immediate virtual orders with quantity toggles and instant mark-to-market cost calculations.
- **Rationale**: Translates complex quant scanning and dual-LLM debates into actionable, explainable cards for everyday investors.

### 6. INR Virtual Paper Portfolio Management Page
- **Files Created**:
  - `frontend/src/pages/PaperPortfolioPage.tsx`:
    - Primary Metrics: Virtual Net Worth (₹), Available Cash (₹), Invested Capital (₹), Unrealized P&L (₹ & %), Realized P&L (₹ & %), Win Rate (%), and Total Trades.
    - Open Holdings Table: Live mark-to-market pricing, average cost basis, total market value, unrealized gain/loss with quick "Sell" action modal.
    - Reset Portfolio Modal: Allows resetting account back to ₹10,00,000 INR starting capital.
    - Recent Paper Orders audit log showing time, symbol, side, quantity, executed price, and status.
- **Rationale**: Provides users a zero-risk educational sandbox with authentic Indian equities pricing.

### 7. Layout, Navigation & Disclaimer Enhancements
- **Files Modified**:
  - `frontend/src/components/layout/TopBar.tsx`:
    - Persistent SEBI educational disclaimer banner: *"Educational purposes only. Not SEBI-registered investment advice. All trades are virtual in INR."*
    - Header Language Switcher dropdown: English (EN), ಕನ್ನಡ (KN), हिन्दी (HI).
    - NSE Market badge with Gemini 2.5 + Groq indicator.
  - `frontend/src/components/layout/Sidebar.tsx`: Added navigation links for `/sectors` (Heatmap), `/picks` (Top Picks), and `/paper-portfolio` (Portfolio) with live data status indicator.
  - `frontend/src/App.tsx`: Registered `/sectors`, `/picks`, and `/paper-portfolio` routes inside `AppShell`.
  - `frontend/src/pages/OnboardingPage.tsx`: Required risk profile selection and default ₹10,00,000 virtual INR capital setup.
  - `frontend/src/pages/SettingsPage.tsx`: Formatted capital limits in `₹ INR`.
  - `frontend/src/pages/ProposalsPage.tsx`: Formatted order proposals in `₹` and labeled approvals as virtual paper execution.
  - `frontend/src/pages/OrdersPage.tsx`: Swapped all US broker and dollar references for NSE virtual execution in `₹`.
  - `frontend/src/pages/DashboardPage.tsx`: Replaced dollar amounts with `formatINR()`.
- **Rationale**: Guarantees a cohesive Indian market look, feel, and compliance posture throughout the application.

### 8. Verification & Compilation
- `server` build: `tsc` on `@confluence/shared-schemas` and `@confluence/api` succeeded with 0 errors.
- `frontend` build: Vite production build succeeded with 0 TypeScript errors (1711 modules transformed in 1.81s).
- Pytest Suite: **27/27 tests passing**.
- Vitest Suite: **34/34 tests passing**.




