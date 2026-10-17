# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

The **Prime Developers** team takes the security of the **Confluence** quantitative trading platform extremely seriously. Because this project handles financial brokerage credentials (via Alpaca), LLM API keys, and automated capital execution, we require responsible disclosure for all security vulnerabilities.

**Please do not disclose security-related vulnerabilities publicly** via GitHub issues, pull requests, or public discussions until a formal patch or mitigation has been released.

- **Private Reporting:** Report vulnerabilities directly via [GitHub Security Advisories](https://github.com/shivannagorkal/Tradint-agent/security/advisories/new) or contact the Prime Developers maintainers privately.
- Please include a detailed description of the vulnerability, steps to reproduce, and any potential financial or architectural impact.

---

## Financial & API Credential Safety Guidelines

Given the quantitative and algorithmic nature of this platform, users and contributors must adhere to strict safety practices:

1. **Credential Isolation:** 
   - Never commit sensitive keys (Alpaca API secrets, LLM provider tokens, JWT secrets, or MongoDB URIs) to version control. 
   - Always utilize local `.env` files (which are ignored via `.gitignore`) and ensure AES-256-GCM master encryption keys are kept secure.
2. **Financial Risk & Paper Trading Default:** 
   - Confluence defaults strictly to **Alpaca Paper Trading** environments (`ALLOW_LIVE_TRADING=false`). 
   - Algorithmic trading and multi-agent LLM systems carry inherent financial risk due to model drift, hallucination, or market volatility. Always validate strategies through the platform's overfitting gates (DSR, PBO, CSCV) and test thoroughly in paper mode before risking real capital.
3. **Emergency Disruption & Kill Switch:** 
   - In the event of unexpected execution loops, anomalous behavior, or extreme market volatility, immediately engage the platform's global **Emergency Kill Switch** via the UI dashboard or API endpoint (`/api/kill-switch/engage`) to instantly halt all outgoing orders and trading workflows.
