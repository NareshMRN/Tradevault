# TradeVault — Indian Market Multi-Agent Quantitative Platform

> **Modern quantitative stock screening, multi-agent AI advisory, and virtual paper trading platform engineered specifically for the National Stock Exchange of India (NSE).**

---

## Live Demo & Links
- **Live Platform**: [https://tradevaultone.vercel.app/](https://tradevaultone.vercel.app/)
- **Repository**: [https://github.com/NareshMRN/Tradevault.git](https://github.com/NareshMRN/Tradevault.git)

---

## Table of Contents
- [Core Architecture](#core-architecture)
- [Key Features](#key-features)
  - [1. NSE ML Stock Screening Pipeline (LightGBM)](#1-nse-ml-stock-screening-pipeline-lightgbm)
  - [2. Real-Time Market-Hours Awareness Engine (IST)](#2-real-time-market-hours-awareness-engine-ist)
  - [3. NSE Sector Heatmap & Momentum Matrix](#3-nse-sector-heatmap--momentum-matrix)
  - [4. Educational INR Paper Portfolio](#4-educational-inr-paper-portfolio)
  - [5. Multi-Agent AI Debate & Consensus Engine](#5-multi-agent-ai-debate--consensus-engine)
  - [6. Multi-Lingual Support (EN / KN / HI)](#6-multi-lingual-support-en--kn--hi)
  - [7. Real-Time Push Notifications & In-App Alerts](#7-real-time-push-notifications--in-app-alerts)
- [Monorepo Project Layout](#monorepo-project-layout)
- [REST API Routes Reference](#rest-api-routes-reference)
- [Environment Configuration](#environment-configuration)
- [Quick Start & Setup Guide](#quick-start--setup-guide)
- [Test Suite & Verification](#test-suite--verification)

---

## Core Architecture

TradeVault is built as a modular monorepo combining a fast TypeScript/Node.js API gateway, a specialized Python quantitative runtime, and an institutional React 19 frontend.

```
                           ┌──────────────────────────────────────────────┐
                           │          TRADEVAULT MONOREPO PLATFORM        │
                           └──────────────────────┬───────────────────────┘
                                                  │
          ┌───────────────────────────────────────┼───────────────────────────────────────┐
          │                                       │                                       │
          ▼                                       ▼                                       ▼
   [ FRONTEND SPA ]                        [ API GATEWAY ]                       [ PYTHON RUNTIME ]
   React 19 + TypeScript + Vite            Node.js + Express + Socket.IO         FastAPI Microservice (Port 8000)
   • Market status awareness banners       • JWT Auth & Google Sign-In           • LightGBM ML Classifier & Calibrator
   • Sector Heatmap & returns matrix       • Resilient in-memory fallback        • 5-Year daily OHLCV dataset pipeline
   • ML Screener & top 5 picks             • Virtual INR paper trading engine    • IST market-hours & holiday engine
   • Multi-agent debate inspection         • Proxy caching for Python engines    • Multi-agent debate orchestration
   • Multi-lingual (EN, ಕನ್ನಡ, हिन्दी)    • Firebase Cloud Messaging (FCM)      • NSE sector momentum scoring
          │                                       │                                       │
          └───────────────────┬───────────────────┘                                       │
                              │                                                           │
                              └───────────────────────────┬───────────────────────────────┘
                                                          │
                                         ┌────────────────┴────────────────┐
                                         │                                 │
                                         ▼                                 ▼
                                [ NSE MARKET DATA ]               [ DUAL AI COMMITTEE ]
                                Live Feed / yfinance              Gemini 2.5 + Groq DeepSeek-R1
                                • 40 liquid Nifty 50 stocks       • Technical analysis
                                • Official NSE holiday schedule   • Fundamental valuation
                                • Deterministic close quotes      • Risk assessment & consensus
```

---

## Key Features

### 1. NSE ML Stock Screening Pipeline (LightGBM)
- **Trained Model**: Gradient-boosted decision trees (LightGBM) trained on **5 years of daily OHLCV data** across 40 liquid Nifty 50 equities downloaded via `yfinance`.
- **Target Objective**: Scores the calibrated probability that a given stock outperforms the Nifty 50 index benchmark by at least **+0.5%** from open to close.
- **Isotonic Calibration**: Converts raw logit margins into strictly calibrated probabilities.
- **Chronological Time-Series Splits**: Strict separation without lookahead bias (60% Train, 20% Validation, 20% Test).
- **Diversified Portfolio Selection**: Selects up to 5 qualified top picks with a hard diversification constraint of **maximum 2 stocks per sector**.
- **Transparent Explainability**: Outputs the top 3 predictive feature drivers (RSI, volume breakout ratio, 5-day return momentum, volatility ratio) for every selected stock.
- **Single-Session Historical Reviews**: Analyzes previous session performance against the Nifty 50 baseline (hit rate, excess return, individual stock open-to-close metrics).
- **Market Closed Protection**: Automatically suspends top pick selection when the market is closed, displaying the next session opening date and time in IST.

### 2. Real-Time Market-Hours Awareness Engine (IST)
- **Timezone Native**: Operates strictly on **Asia/Kolkata (IST)** time, eliminating client-side timezone discrepancies.
- **Session States Tracked**:
  - `OPEN`: Regular trading session (Mon–Fri, 09:15 to 15:30 IST).
  - `PRE_OPEN`: Pre-market discovery window (Mon–Fri, 09:00 to 09:15 IST).
  - `AFTER_CLOSE`: Post-market hours (Mon–Fri, 15:30 to 23:59 IST).
  - `OVERNIGHT`: Overnight session prior to next market open (00:00 to 09:00 IST).
  - `WEEKEND`: Saturday & Sunday with next Monday opening countdown.
  - `HOLIDAY`: Matches official NSE trading holidays from `nse_holidays.json`.
- **Price Stabilization**: Micro-ticks and live refetch intervals pause outside trading hours, freezing quotes at the last authentic session close.

### 3. NSE Sector Heatmap & Momentum Matrix
- **Sector Coverage**: Comprehensive quantitative tracking across 10 key Indian market sectors:
  - Banking & Financials, IT & Technology, Oil & Gas / Energy, Automobiles, Pharmaceuticals, FMCG, Metals & Mining, Infrastructure, Telecom, and Defence.
- **Multi-Horizon Momentum**: Visualizes 5-day, 20-day, and 60-day historical returns alongside relative volume multiples.
- **Top Sector Equities**: Click any sector tile to view top-ranked equities with quantitative momentum tags.

### 4. Educational INR Paper Portfolio
- **Virtual Rupee Execution**: Paper trading denominated in **₹ INR** with an allocatable initial virtual capital (e.g., ₹25,000 to ₹10,00,000).
- **Order Management**: Supports instant simulated market BUY and SELL executions with average fill tracking, real-time cash balance deduction, and realized PnL calculations.
- **Zero Risk**: Eliminates live brokerage keys and financial risk while simulating institutional order routing.

### 5. Multi-Agent AI Debate & Consensus Engine
- **Committee of Specialists**:
  - **Fundamental Analyst** (Gemini 2.5): Analyzes earnings, quarterly growth, balance sheet strength, and P/E ratios.
  - **Technical Analyst** (Groq DeepSeek-R1): Evaluates chart patterns, candlestick structures, RSI, MACD, and volume profiles.
  - **Sentiment Analyst**: Gauges macroeconomic catalysts and institutional flow dynamics.
  - **Risk Manager**: Evaluates position limits, portfolio correlation, and daily stop-loss gates.
- **Consensus & Divergence**: Identifies agreement and flags divergences between fundamental and technical perspectives.

### 6. Multi-Lingual Support (EN / KN / HI)
- **Instant Language Switching**: Full UI localization in:
  - **English** (`EN`)
  - **ಕನ್ನಡ** (Kannada - `KN`)
  - **हिन्दी** (Hindi - `HI`)
- Switchable directly from the top navigation bar without reloading.

### 7. Real-Time Push Notifications & In-App Alerts
- **Firebase Cloud Messaging (FCM)**: Push notification delivery for filled paper orders, AI debate proposals, and market status updates.
- **In-App Toast Alerts**: Floating toast notifications with direct quick-action links.
- **Granular Preferences**: Custom alert toggle controls persisted per user in Settings.

---

## Monorepo Project Layout

```
.
├── frontend/                         # React 19 Client SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── analysis/             # AI Analysis & Debate Viewers
│   │   │   ├── charts/               # Lightweight Charts & Recharts
│   │   │   ├── common/               # Market status banners & metric cards
│   │   │   └── layout/               # TopBar, Sidebar, AppShell
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx     # Overview dashboard with live market quotes
│   │   │   ├── MLPicksPage.tsx       # LightGBM stock screening & session review
│   │   │   ├── SectorHeatmapPage.tsx # NSE sector momentum & heatmap
│   │   │   ├── TopPicksPage.tsx      # Multi-agent AI recommended stocks
│   │   │   ├── PaperPortfolioPage.tsx# Virtual INR portfolio & order terminal
│   │   │   ├── OrchestrationPage.tsx # Bull vs Bear multi-agent debate studio
│   │   │   ├── WatchlistPage.tsx     # Custom monitored ticker watchlist
│   │   │   ├── OrdersPage.tsx        # Completed virtual paper executions
│   │   │   ├── NotificationsPage.tsx # In-app notification center
│   │   │   ├── SettingsPage.tsx      # Risk profile constraints & alert preferences
│   │   │   └── LandingPage.tsx       # Institutional landing page
│   │   ├── services/                 # API service clients
│   │   └── store/                    # Zustand stores (Auth, Language, Market Status, Notifications)
│   └── package.json
│
└── server/                           # Backend Microservices
    ├── packages/
    │   └── shared-schemas/           # Zod validation contracts & TypeScript types
    └── apps/
        ├── api/                      # Node.js + Express API Gateway (Port 4000)
        │   ├── src/
        │   │   ├── routes/           # REST endpoints (Market, ML, Discovery, Portfolio, Auth)
        │   │   ├── services/         # PaperTradingService, CurrentPriceService, FirebaseAdmin
        │   │   ├── db/               # MongoDB models & inMemoryStore resilient fallback
        │   │   └── server.ts         # Express & Socket.IO server entrypoint
        │   └── test/                 # Vitest test suite (40 unit & integration tests)
        │
        └── agent-runtime/            # Python 3.11 + FastAPI ML Service (Port 8000)
            ├── app/
            │   ├── ml/               # LightGBM pipeline (train.py, predict.py, features.py)
            │   ├── market/           # IST market status engine & holiday calendar
            │   ├── scanner/          # Quantitative sector momentum scanner
            │   ├── agents/           # LangChain / LangGraph multi-agent debate graph
            │   └── main.py           # FastAPI entrypoint
            └── scripts/
                └── export_history.py # yfinance data extraction script
```

---

## REST API Routes Reference

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/market/status` | Returns current IST market state, session timers & next open date | No |
| `GET` | `/api/ml/picks` | Returns qualified top ML picks, calibrated scores & feature drivers | No |
| `GET` | `/api/ml/metrics` | Returns honest out-of-sample model validation metrics & limitations | No |
| `POST`| `/api/ml/run` | Triggers a fresh ML screening run on the universe | Yes |
| `GET` | `/api/discovery/sectors` | Returns 10 NSE sectors with momentum scores, returns & volume trend | No |
| `GET` | `/api/discovery/picks` | Returns top-ranked stocks filtered by risk profile and sector | No |
| `POST`| `/api/discovery/run` | Executes a complete discovery scan with debate summaries | Yes |
| `GET` | `/api/paper-portfolio` | Returns virtual INR portfolio summary, cash balance & equity | Yes |
| `GET` | `/api/paper-portfolio/positions` | Returns active paper stock holdings | Yes |
| `POST`| `/api/paper-portfolio/orders` | Executes a virtual BUY or SELL paper order | Yes |
| `POST`| `/api/paper-portfolio/reset` | Resets paper portfolio to initial virtual capital | Yes |
| `GET` | `/api/prediction/latest/:ticker` | Returns price predictions & technical indicator levels | No |
| `POST`| `/api/auth/register` | Registers a new trader account | No |
| `POST`| `/api/auth/login` | Authenticates user with JWT token | No |
| `POST`| `/api/auth/google` | Authenticates user via Firebase Google OAuth | No |
| `GET` | `/api/auth/me` | Returns authenticated user session | Yes |
| `GET` | `/api/notifications` | Returns user notification list | Yes |
| `POST`| `/api/notifications/register-token` | Registers Firebase device FCM token | Yes |

---

## Environment Configuration

Create a `.env` file in `server/`:

```bash
# Gateway Server
PORT=4000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Authentication
JWT_SECRET=your_jwt_secret_key_here

# Python Agent Runtime
AGENT_RUNTIME_URL=http://localhost:8000
INTERNAL_API_SECRET=confluence-internal-secret-2026

# Database (Optional - falls back seamlessly to In-Memory mode if offline)
MONGODB_URI=mongodb://localhost:27017/tradevault

# AI Model Providers
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key

# Firebase Push Notifications (Optional)
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
FIREBASE_PRIVATE_KEY="your_firebase_private_key"
```

And in `frontend/.env`:

```bash
VITE_API_URL=http://localhost:4000
VITE_SOCKET_URL=http://localhost:4000
```

---

## Quick Start & Setup Guide

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Python**: v3.10 or v3.11
- **npm** or **pnpm**

### 1. Start the API Gateway
```bash
cd server
npm install
npm run dev
# Running on http://localhost:4000
```

### 2. Start the Python Agent Runtime
```bash
cd server/apps/agent-runtime
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# Running on http://localhost:8000
```

### 3. Start the Frontend SPA
```bash
cd frontend
npm install
npm run dev
# Running on http://localhost:5173
```

---

## Test Suite & Verification

TradeVault features end-to-end unit and integration test coverage:

### Running Server Tests
```bash
cd server
npm test
```
*Executes all 8 test suites (Encryption, Prediction Engine, Overfitting Gate, Discovery Scanner, Market Status, ML Screening, Authentication, and Paper Trading).*

### Running Frontend Type-Check & Build
```bash
cd frontend
npm run build
```
*Validates all TypeScript interfaces and compiles the production bundle via Vite.*

---

## License
Educational and research quantitative software. Licensed under the [MIT License](LICENSE). Not SEBI-registered financial advisory. All simulated trades are strictly educational virtual INR.