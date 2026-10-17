import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Lock } from 'lucide-react';
import logoImg from '@/assets/logo.png';

export function PrivacyPolicyPage() {
  const lastUpdated = 'September 23, 2026';

  return (
    <div className="min-h-screen bg-[#fafbfc] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top App Bar */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logoImg} alt="TradeVault Logo" className="h-8 w-auto object-contain rounded-lg" />
            <span className="font-bold text-base text-slate-900 tracking-tight">TradeVault</span>
          </Link>

          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {/* Document Header Card */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-10 m3-elevation-1 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/70 text-xs font-bold text-indigo-700 uppercase tracking-wider mb-4">
            <Shield className="h-3.5 w-3.5 text-indigo-600" />
            <span>Official Legal Notice</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Privacy Policy
          </h1>
          <p className="mt-3 text-slate-600 text-sm sm:text-base leading-relaxed">
            At TradeVault, we are committed to protecting your privacy and securing your quantitative trading telemetry and broker credentials with enterprise-grade cryptographic standards.
          </p>
          <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
            <span>Effective Date: <strong>{lastUpdated}</strong></span>
            <span>Version: <strong>2.4.0 (GDPR & CCPA Compliant)</strong></span>
          </div>
        </div>

        {/* Policy Body */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-12 m3-elevation-1 space-y-10 text-slate-700 leading-relaxed text-sm sm:text-base">
          {/* Section 1 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-slate-900 font-bold text-lg">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 text-xs font-black">1</span>
              <h2>Information We Collect</h2>
            </div>
            <p>
              When you use TradeVault (including our web platform, APIs, and multi-agent AI advisory services), we collect the following categories of information:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-600">
              <li>
                <strong>Account Credentials:</strong> Display name, email address, and hashed authentication records. We do not store plaintext passwords.
              </li>
              <li>
                <strong>External Broker Credentials (Optional):</strong> If you choose to connect an Alpaca account, we collect your API Key and Secret. These are immediately encrypted using AES-256-GCM before database persistence.
              </li>
              <li>
                <strong>Platform Usage & Research Telemetry:</strong> Monitored stock symbols, watchlist configurations, backtest inputs, and proposal approval actions.
              </li>
              <li>
                <strong>Technical Diagnostics:</strong> IP address, browser type, and API gateway response latencies necessary for rate-limiting and DDoS mitigation.
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-slate-900 font-bold text-lg">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 text-xs font-black">2</span>
              <h2>Zero-Trust Cryptographic Protection of API Keys</h2>
            </div>
            <p>
              TradeVault employs a strict zero-trust security architecture for all third-party credentials:
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2 text-xs sm:text-sm">
              <p className="font-semibold text-slate-900 flex items-center gap-2">
                <Lock className="h-4 w-4 text-emerald-600" />
                <span>AES-256-GCM Encryption Standard</span>
              </p>
              <p className="text-slate-600 leading-relaxed">
                Broker keys are encrypted with 32-byte master encryption keys and unique 12-byte initialization vectors (IVs) with 16-byte authentication tags. Keys are decrypted exclusively in volatile memory only at the instant of order dispatch or balance queries, and are never emitted in client-side bundles or application log streams.
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-slate-900 font-bold text-lg">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 text-xs font-black">3</span>
              <h2>Multi-Agent AI & Third-Party LLM Providers</h2>
            </div>
            <p>
              TradeVault coordinates multi-model debate workflows across providers including Groq (DeepSeek-R1), Google (Gemini 2.0 Flash), Mistral AI, and NVIDIA NIM.
            </p>
            <p>
              <strong>Data Privacy Boundary:</strong> Market OHLCV price bars, public 10-K filings, and macroeconomic indicators sent to LLM providers contain strictly anonymized market data. Your personal identity, account balance, broker credentials, or trading volume are <em>never</em> sent to external generative AI model providers.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-slate-900 font-bold text-lg">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 text-xs font-black">4</span>
              <h2>Simulated Paper Trading Sandbox Default</h2>
            </div>
            <p>
              By default, all TradeVault accounts are provisioned exclusively in a simulated paper trading sandbox. No live capital is at risk. You are not required to provide real financial account details or credit card information to use TradeVault.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-slate-900 font-bold text-lg">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 text-xs font-black">5</span>
              <h2>Immutable Audit Logging & Retention</h2>
            </div>
            <p>
              To maintain institutional compliance and protect users against unintended trading activity, TradeVault logs all proposal creations, risk vetoes, emergency kill-switch activations, and order executions into a tamper-evident, append-only database collection.
            </p>
            <p>
              These logs are retained for a minimum of 24 months for forensic and compliance auditing, protected against unauthorized modification or deletion.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-slate-900 font-bold text-lg">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 text-xs font-black">6</span>
              <h2>Your Rights (GDPR & CCPA)</h2>
            </div>
            <p>
              Under global data privacy regulations, you have the right to:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-600">
              <li>Request an export of all account data and saved watchlist items.</li>
              <li>Request the permanent erasure of your account and encrypted broker keys.</li>
              <li>Opt-out of optional market intelligence newsletters or notification dispatches.</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2.5 text-slate-900 font-bold text-lg">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 text-xs font-black">7</span>
              <h2>Contact Our Data Protection Officer</h2>
            </div>
            <p className="text-slate-600">
              For security disclosures, privacy requests, or questions regarding our cryptographic safeguards, contact our security team at{' '}
              <a href="mailto:privacy@tradevault.local" className="text-indigo-600 font-semibold hover:underline">
                privacy@tradevault.local
              </a>.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-xs text-slate-400">
          <p>© 2026 TradeVault. All rights reserved. Built for institutional quantitative intelligence.</p>
        </div>
      </main>
    </div>
  );
}
