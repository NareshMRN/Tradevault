# Confluence — Hybrid Multi-Agent Trading System (Backend Infrastructure)

Production-grade backend and ML agent runtime services for **Confluence**, a hybrid multi-agent quantitative trading advisory and execution platform.

---

## Architecture Overview

```
                               ┌──────────────────────────────────────────────┐
                               │           CONFLUENCE SYSTEM ARCHITECTURE     │
                               └──────────────────────┬───────────────────────┘
                                                      │
                     ┌────────────────────────────────┼────────────────────────────────┐
                     │                                │                                │
                     ▼                                ▼                                ▼
            [ BROKER API ]                   [ QUANT & FORECAST ]             [ MULTI-AGENT LLMs ]
            Alpaca (Paper / Live)            Internal Python Engines          Groq / Gemini / Mistral
            • Place / cancel orders          • Qlib factor mining             • 4 Analysts (Tech, Macro, etc.)
            • Fetch positions & P&L          • GluonTS distributions          • Bull vs Bear debate rounds
            • Daily OHLCV price bars         • PurgedCV backtesting           • Trader & Risk Manager
```

### Directory Layout

```
server/
├── docker-compose.yml             # Orchestrates mongodb, redis, api, agent-runtime
├── .env.example                   # Configuration template
├── packages/
│   └── shared-schemas/            # Zod validation schemas & TypeScript interfaces
│       └── src/index.ts
├── apps/
│   ├── api/                       # Node.js + Express (TypeScript) API Gateway
│   │   ├── src/
│   │   │   ├── server.ts          # Express + Socket.IO server
│   │   │   ├── config/            # Env and Redis configurations
│   │   │   ├── db/                # MongoDB connection & Mongoose schemas
│   │   │   ├── middleware/        # JWT auth, RBAC, kill-switch guard, rate limiting
│   │   │   ├── services/          # AES-256-GCM encryption, Alpaca broker, audit logger
│   │   │   ├── routes/            # REST API endpoints
│   │   │   └── websocket/         # Real-time WebSocket streaming
│   │   └── test/                  # Automated Vitest test suite
│   └── agent-runtime/             # Python 3.11 + FastAPI microservice
│       ├── app/
│       │   ├── main.py            # FastAPI entrypoint
│       │   ├── config.py          # Settings and model mappings
│       │   ├── llm/router.py      # LLMProviderRouter (circuit breakers, failovers)
│       │   ├── agents/            # MultiAgentDebateGraph & role prompts
│       │   ├── quant/             # Qlib factors & purgedcv overfitting validation
│       │   ├── forecasting/       # GluonTS probabilistic forecasting
│       │   └── execution/         # FinRL RL-assisted position sizing
│       └── tests/                 # Pytest test suite
```

---

## Specialized Multi-Model LLM Routing

Confluence routes each trading task to the exact provider and model best suited for it:

| Agent Role | Provider | Model | Task |
|---|---|---|---|
| **Technical Analyst** | **Groq** | `deepseek-r1-distill-llama-70b` | High-speed mathematical & technical indicator evaluation |
| **Bull vs Bear Debate** | **Groq** | `deepseek-r1-distill-llama-70b` | 1–3 rapid interactive counter-argument rounds |
| **Fundamentals Analyst** | **Google Gemini** | `gemini-2.0-flash` | Deep 10-K, 10-Q SEC reports and balance sheet analysis |
| **Sentiment Analyst** | **Google Gemini** | `gemini-2.0-flash` | Large-context social media dumps (Twitter/X, Reddit) |
| **Macro Analyst** | **NVIDIA NIM** | `meta/llama-3.3-70b-instruct` | Global economic trends, interest rate environment, inflation |
| **News Analyst** | **Mistral** | `mistral-large-latest` | Breaking catalyst classification and structured noise filtering |
| **Trader Proposal** | **Agent Router** | `deepseek-v4-flash` | Rapid quantitative proposal synthesis and sizing |
| **Risk Manager (Veto)** | **Agent Router** | `claude-opus-4.8` | Deep reasoning, limit checks, backtest gate compliance |
| **Portfolio Manager** | **Agent Router** | `gpt-6-astra` | Final decision, calibrated confidence, dispersion notes |
| **Universal Fallback** | **OpenRouter** | `deepseek/deepseek-r1` | Auto-routes if any primary provider reaches quota/timeout |

---

## Quantitative & Statistical Engines

1. **Quant Factor Engine (`app/quant/factors.py`)**:
   - Computes Momentum (5d, 20d, 60d), Volatility (realized vol / ATR), Mean-Reversion (RSI-14, %B), Value Proxy (distance to 200d SMA), and Technical Score (MACD / EMA).
   - Produces normalized composite score bounded in `[-1.0, 1.0]`.

2. **Probabilistic Forecasting (`app/forecasting/probabilistic.py`)**:
   - Replaces point estimates with a full quantile distribution: `P10`, `P25`, `Median`, `P75`, `P90`, and `Std Dev`.
   - Supports `1d`, `5d`, and `20d` horizons.

3. **Overfitting & Robustness Gate (`app/quant/backtest.py`)**:
   - Calculates Deflated Sharpe Ratio (DSR) and Probability of Backtest Overfitting (PBO via CSCV).
   - **Hard Rule**: If `is_eligible_for_paper_trading == false`, the Trader and Portfolio Manager are strictly prohibited from issuing a "buy" or "sell" recommendation — they are forced to "hold".

4. **RL-Assisted Position Sizing (`app/execution/sizing.py`)**:
   - Calculates lot size via fractional Kelly sizing and forecast volatility penalties, strictly capped by the Risk Manager's limit.

---

## Safety Rails & Security

- **Database**: MongoDB with document-level user isolation, compound unique indexes, and pre-hook immutability protection on `audit_log`.
- **API Key Encryption**: AES-256-GCM with unique 12-byte IV and 16-byte auth tag. Keys are decrypted only in-memory right before provider calls.
- **Kill Switch**: Single-click halt that immediately blocks all order approvals and dispatches at the middleware layer (`requireKillSwitchDisengaged`).
- **Alpaca Broker Safety**: Defaults strictly to Paper endpoint. Live execution requires typed confirmation phrase and expires after 24 hours.
