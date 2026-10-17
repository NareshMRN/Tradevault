import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { InteractiveDotGrid } from '../components/common/InteractiveDotGrid';
import logoImg from '@/assets/logo.png';
import {
  ArrowRight,
  ShieldCheck,
  Brain,
  TrendingUp,
  Cpu,
  BarChart3,
  Lock,
  Play,
  CheckCircle2,
  ChevronDown,
  Terminal,
  Sparkles,
  ShieldAlert,
  Server,
  Sliders,
  Menu,
  X,
} from 'lucide-react';

// Sample tickers data for interactive debate simulation
const SAMPLE_TICKERS = {
  NVDA: {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    price: '$128.40',
    change: '+4.2%',
    technical: {
      score: 0.85,
      agent: 'Groq DeepSeek-R1',
      summary: 'Strong 20d/60d momentum breakout above 50-day EMA. RSI-14 at 62 (healthy continuation, not overbought). Volume 1.4x 30d avg.',
      signal: 'BULLISH',
    },
    fundamental: {
      score: 0.92,
      agent: 'Google Gemini 2.0 Flash',
      summary: 'Data Center revenue +154% YoY in latest 10-Q filing. Free cash flow conversion over 52%. Blackwell architecture order backlog fully booked through 2027.',
      signal: 'VERY BULLISH',
    },
    macro: {
      score: 0.70,
      agent: 'NVIDIA NIM Llama 3.3',
      summary: 'AI CapEx guidance raised by hyperscalers. Yield curve steepening slightly, but enterprise generative tech investment remains resilient.',
      signal: 'BULLISH',
    },
    news: {
      score: 0.78,
      agent: 'Mistral Large',
      summary: 'Multiple tier-1 cloud partnerships announced at GTC keynote. Export restrictions already priced in according to analyst consensus.',
      signal: 'BULLISH',
    },
    debate: {
      bull: 'Uncontested monopoly in accelerated compute with CUDA moat. Blackwell ramp offers expanding gross margins and unconstrained demand across enterprise.',
      bear: 'Hyperscaler CapEx cyclicality risk by late 2026. Any cloud spending moderation will trigger multiples compression from current 38x forward P/E.',
      rounds: 3,
      consensus: 'STRONG BUY (86% Conviction)',
    },
    quant: {
      dsr: '1.92 (Passed)',
      pbo: '3.4% (Pass < 5%)',
      forecastMedian: '+8.4% (20d)',
      sizingKelly: '4.2% of Equity',
      status: 'APPROVED BY RISK VETO',
    },
  },
  AAPL: {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: '$224.15',
    change: '+0.8%',
    technical: {
      score: 0.35,
      agent: 'Groq DeepSeek-R1',
      summary: 'Consolidating in tight Bollinger bands between $218 and $228. MACD histogram hovering near zero-line. Neutral mean-reversion posture.',
      signal: 'NEUTRAL',
    },
    fundamental: {
      score: 0.65,
      agent: 'Google Gemini 2.0 Flash',
      summary: 'Services segment reached all-time high gross margins of 74%. iPhone 16 replacement cycle progressing steadily, supported by Apple Intelligence rollout.',
      signal: 'MODERATE BULLISH',
    },
    macro: {
      score: 0.50,
      agent: 'NVIDIA NIM Llama 3.3',
      summary: 'Consumer discretionary spending under mild pressure in Greater China. Offset by strong North American services growth.',
      signal: 'NEUTRAL',
    },
    news: {
      score: 0.60,
      agent: 'Mistral Large',
      summary: 'App Store regulatory scrutiny in EU stable; Siri upgrade schedule confirmed on track for upcoming iOS update release.',
      signal: 'MODERATE BULLISH',
    },
    debate: {
      bull: 'Massive installed base of 2.2B active devices creates an unprecedented captive audience for on-device Apple Intelligence upgrades and recurring services.',
      bear: 'Stagnant unit sales in hardware and elongated smartphone replacement cycles cap multi-year top-line acceleration.',
      rounds: 2,
      consensus: 'ACCUMULATE / HOLD (62% Conviction)',
    },
    quant: {
      dsr: '1.45 (Passed)',
      pbo: '4.1% (Pass < 5%)',
      forecastMedian: '+2.8% (20d)',
      sizingKelly: '2.5% of Equity',
      status: 'APPROVED BY RISK VETO',
    },
  },
  TSLA: {
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    price: '$218.80',
    change: '-2.1%',
    technical: {
      score: -0.40,
      agent: 'Groq DeepSeek-R1',
      summary: 'Rejected at 200-day moving average on above-average volume. Lower highs confirmed on 4-hour timeframe. ATR volatility elevated at 4.8%.',
      signal: 'BEARISH',
    },
    fundamental: {
      score: 0.20,
      agent: 'Google Gemini 2.0 Flash',
      summary: 'Automotive gross margin excluding regulatory credits contracted to 14.6%. Price incentives continuing to compress operating income.',
      signal: 'WEAK / CAUTION',
    },
    macro: {
      score: -0.30,
      agent: 'NVIDIA NIM Llama 3.3',
      summary: 'High financing rates impacting consumer auto loan affordability. EV subsidy shifts in European key markets creating headwind.',
      signal: 'BEARISH',
    },
    news: {
      score: 0.45,
      agent: 'Mistral Large',
      summary: 'Robotaxi autonomy roadmap timeline debated; Energy storage Megapack deployments up +125% YoY providing cushion.',
      signal: 'MIXED',
    },
    debate: {
      bull: 'Autonomous FSD licensing and Energy Megapack storage margin expansion represent a high-margin transformation beyond traditional vehicle manufacturing.',
      bear: 'Vehicle delivery volumes decelerating while legacy OEM EV competition tightens in China and Europe. Valuation remains priced as pure AI tech.',
      rounds: 3,
      consensus: 'HOLD / RISK VETO (41% Conviction)',
    },
    quant: {
      dsr: '0.88 (Failed)',
      pbo: '14.8% (Fail > 5%)',
      forecastMedian: '-3.1% (20d)',
      sizingKelly: '0.0% (Forbidden)',
      status: 'VETOED: OVERFITTING GATE',
    },
  },
};

type TickerKey = keyof typeof SAMPLE_TICKERS;

export function LandingPage() {
  const heroRef = useRef<HTMLElement | null>(null);
  const [selectedTicker, setSelectedTicker] = useState<TickerKey>('NVDA');
  const [activeTab, setActiveTab] = useState<'debate' | 'quant' | 'risk'>('debate');
  const [architectureLayer, setArchitectureLayer] = useState<'frontend' | 'gateway' | 'runtime' | 'quant'>('frontend');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeStock = SAMPLE_TICKERS[selectedTicker];

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  return (
    <div className="min-h-screen bg-[#fafbfc] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* ─────────────────────────────────────────────────────────────
          1. TOP APP BAR (Material 3 Surface with Full-Width Layout)
      ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 h-14 flex items-center justify-between">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2.5 group shrink-0">
            <img
              src={logoImg}
              alt="TradeVault Logo"
              className="h-8 w-auto object-contain rounded-lg shadow-sm border border-slate-100 group-hover:scale-105 transition-transform"
            />
            <div className="flex flex-col">
              <span className="text-base font-black tracking-tight text-slate-900 leading-none">TradeVault</span>
              <span className="text-[9px] text-slate-400 font-semibold tracking-wide uppercase mt-0.5">Multi-Agent Quant</span>
            </div>
          </Link>

          {/* Nav links */}
          <nav className="hidden lg:flex items-center gap-5 text-sm font-semibold text-slate-600">
            <a href="#debate-demo" className="hover:text-indigo-600 transition-colors whitespace-nowrap">Debate Engine</a>
            <a href="#architecture" className="hover:text-indigo-600 transition-colors whitespace-nowrap">Architecture</a>
            <a href="#quant-factors" className="hover:text-indigo-600 transition-colors whitespace-nowrap">Quant & ML</a>
            <a href="#safety-rails" className="hover:text-indigo-600 transition-colors whitespace-nowrap">Safety</a>
            <a href="#faq" className="hover:text-indigo-600 transition-colors">FAQ</a>
          </nav>

          {/* Action CTAs & Mobile Hamburger */}
          <div className="flex items-center gap-2">
            {/* Desktop only: status badge, sign in, launch */}
            <div className="hidden xl:flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2.5 py-1.5 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live</span>
            </div>

            <Link
              to="/login"
              className="hidden lg:inline-flex text-sm font-semibold text-slate-700 hover:text-indigo-600 px-3 py-1.5 rounded-lg transition-colors"
            >
              Sign In
            </Link>

            <Link
              to="/dashboard"
              className="hidden lg:flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-sm shadow-indigo-600/30 hover:shadow-indigo-600/40 transition-all"
            >
              <span>Launch</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>

            {/* Hamburger — visible on all < lg */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-6 space-y-4 shadow-xl">
            <nav className="flex flex-col space-y-3 text-base font-semibold text-slate-700">
              <a
                href="#debate-demo"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors"
              >
                Debate Engine
              </a>
              <a
                href="#architecture"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors"
              >
                System Architecture
              </a>
              <a
                href="#quant-factors"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors"
              >
                Quant & ML Pipeline
              </a>
              <a
                href="#safety-rails"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors"
              >
                Safety & Guardrails
              </a>
              <Link
                to="/terms"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors"
              >
                Terms of Service
              </Link>
              <Link
                to="/privacy"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors"
              >
                Privacy Policy
              </Link>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors"
              >
                FAQ
              </a>
            </nav>

            <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-3 py-2 rounded-lg">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Paper Trading Sandbox Active ($100k Virtual Capital)</span>
              </div>
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Sign In
              </Link>
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 shadow-md shadow-indigo-500/20"
              >
                Launch Terminal
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. HERO SECTION (Material 3 Hero with Crisp White Surface)
      ───────────────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative pt-10 pb-14 md:pt-16 md:pb-20 overflow-hidden bg-gradient-to-b from-white via-slate-50/50 to-white border-b border-slate-200/60">
        {/* Antigravity Interactive Dotted Canvas Grid with Cursor Illumination & Repulsion */}
        <InteractiveDotGrid
          containerRef={heroRef}
          dotSpacing={26}
          baseRadius={1.3}
          hoverRadius={3.2}
          spotlightRadius={170}
        />

        {/* Subtle decorative background blur discs */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-indigo-100/60 via-purple-50/40 to-transparent rounded-full blur-3xl pointer-events-none z-0 animate-hero-glow" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="animate-hero-fade-1 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm text-xs font-semibold text-slate-700 mb-5 hover:border-indigo-300 transition-colors">
            <span className="relative flex h-2 w-2 mr-0.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600" />
            </span>
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            <span>Multi-Model AI Committee</span>
            <span className="text-slate-300">•</span>
            <span className="text-indigo-600 font-bold">Groq + Gemini + Mistral + NVIDIA</span>
          </div>

          {/* Heading */}
          <h1 className="animate-hero-fade-2 text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1] max-w-4xl mx-auto">
            Autonomous <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700">Multi-Agent Trading</span> Intelligence
          </h1>

          {/* Subtitle */}
          <p className="animate-hero-fade-3 mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed font-normal">
            Eliminate single-model hallucinations and backtest curve-fitting. TradeVault pits specialized AI analysts against each other in real-time debate, governed by Deflated Sharpe Ratios, probabilistic quantiles, and automated risk vetoes.
          </p>

          {/* CTA Buttons */}
          <div className="animate-hero-fade-4 mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/dashboard"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm sm:text-base px-5 py-2.5 sm:px-7 sm:py-3.5 rounded-xl shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 group"
            >
              <span>Open Trading Terminal</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <a
              href="#debate-demo"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm sm:text-base px-4 py-2.5 sm:px-6 sm:py-3.5 rounded-xl border border-slate-200/90 shadow-sm hover:border-slate-300 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            >
              <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-indigo-600 fill-indigo-600" />
              <span>Simulate Agent Debate</span>
            </a>

            <a
              href="#architecture"
              className="hidden sm:flex w-full sm:w-auto items-center justify-center gap-2 text-slate-600 hover:text-indigo-600 font-semibold text-sm sm:text-base px-4 py-2.5 sm:px-5 sm:py-3.5 rounded-xl hover:bg-slate-100/80 transition-all duration-200"
            >
              <Terminal className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-500" />
              <span>System Specs</span>
            </a>
          </div>

          {/* Trust Metric Badges */}
          <div className="animate-hero-fade-5 mt-10 grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 max-w-4xl mx-auto pt-6 sm:pt-8 border-t border-slate-200/80">
            <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/70 m3-elevation-1 text-center hover:-translate-y-1 hover:shadow-md hover:border-indigo-200 transition-all duration-300 cursor-default">
              <p className="text-lg sm:text-2xl font-black text-indigo-600">4 LLMs</p>
              <p className="text-[10px] sm:text-xs font-medium text-slate-500 mt-0.5 sm:mt-1">Specialized Domain Models</p>
            </div>
            <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/70 m3-elevation-1 text-center hover:-translate-y-1 hover:shadow-md hover:border-indigo-200 transition-all duration-300 cursor-default">
              <p className="text-lg sm:text-2xl font-black text-emerald-600">5 Factors</p>
              <p className="text-[10px] sm:text-xs font-medium text-slate-500 mt-0.5 sm:mt-1">Qlib Quant Mining</p>
            </div>
            <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/70 m3-elevation-1 text-center hover:-translate-y-1 hover:shadow-md hover:border-indigo-200 transition-all duration-300 cursor-default">
              <p className="text-lg sm:text-2xl font-black text-slate-900">&lt;5% PBO</p>
              <p className="text-[10px] sm:text-xs font-medium text-slate-500 mt-0.5 sm:mt-1">Overfitting Gate</p>
            </div>
            <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/70 m3-elevation-1 text-center hover:-translate-y-1 hover:shadow-md hover:border-indigo-200 transition-all duration-300 cursor-default">
              <p className="text-lg sm:text-2xl font-black text-indigo-600">100% Safe</p>
              <p className="text-[10px] sm:text-xs font-medium text-slate-500 mt-0.5 sm:mt-1">Paper Sandbox Default</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. INTERACTIVE AGENT DEBATE SIMULATION
      ───────────────────────────────────────────────────────────── */}
      <section id="debate-demo" className="py-20 bg-slate-50/60 border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/70 text-xs font-bold text-indigo-700 uppercase tracking-wider mb-3">
              Interactive Live Simulation
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Watch the AI Committee Debate in Real-Time
            </h2>
            <p className="mt-3 text-slate-600 text-base leading-relaxed">
              Before any trade proposal is generated, four domain-specialist models analyze the stock simultaneously, followed by an adversarial Bull vs. Bear debate and automated risk manager veto.
            </p>

            {/* Stock selector tabs */}
            <div className="mt-8 flex justify-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 bg-white border border-slate-200 rounded-2xl m3-elevation-1 w-full max-w-md mx-auto">
              {(Object.keys(SAMPLE_TICKERS) as TickerKey[]).map((ticker) => (
                <button
                  key={ticker}
                  onClick={() => setSelectedTicker(ticker)}
                  className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-1.5 sm:py-2 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all min-w-0 ${selectedTicker === ticker
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                >
                  <span className="font-extrabold">{ticker}</span>
                  <span className={`text-[11px] sm:text-xs font-semibold ${selectedTicker === ticker ? 'text-indigo-200' : 'text-slate-400'}`}>
                    {SAMPLE_TICKERS[ticker].change}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Debate Card Surface */}
          <div className="bg-white rounded-3xl border border-slate-200 m3-elevation-2 overflow-hidden max-w-6xl mx-auto">
            {/* Header with ticker metadata */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200/80 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white font-black flex items-center justify-center text-sm shadow-sm shrink-0">
                  {activeStock.symbol.slice(0, 2)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-base">{activeStock.symbol}</span>
                    <span className="text-xs text-slate-500 font-medium">{activeStock.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-slate-900">{activeStock.price}</span>
                    <span className={`font-bold ${activeStock.change.startsWith('+') ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {activeStock.change}
                    </span>
                  </div>
                </div>
              </div>

              {/* View mode toggle */}
              <div className="w-full sm:w-auto flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setActiveTab('debate')}
                  className={`flex-1 sm:flex-none text-center px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap text-[11px] sm:text-xs ${activeTab === 'debate' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  <span className="sm:hidden">Debate</span>
                  <span className="hidden sm:inline">Multi-Agent Debate</span>
                </button>
                <button
                  onClick={() => setActiveTab('quant')}
                  className={`flex-1 sm:flex-none text-center px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap text-[11px] sm:text-xs ${activeTab === 'quant' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  <span className="sm:hidden">Signals</span>
                  <span className="hidden sm:inline">Specialist Signals</span>
                </button>
                <button
                  onClick={() => setActiveTab('risk')}
                  className={`flex-1 sm:flex-none text-center px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap text-[11px] sm:text-xs ${activeTab === 'risk' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  <span className="sm:hidden">Risk & Sizing</span>
                  <span className="hidden sm:inline">Risk Veto & Sizing</span>
                </button>
              </div>
            </div>

            {/* Body content based on activeTab */}
            <div className="p-4 sm:p-6 md:p-8">
              {activeTab === 'debate' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Left: 4 Specialist Summaries */}
                  <div className="lg:col-span-5 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Step 1 • Parallel Specialist Ingestion
                    </h3>

                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-indigo-200 transition-all">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-slate-800">Technical Analyst</span>
                        <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                          Groq DeepSeek-R1
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{activeStock.technical.summary}</p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-indigo-200 transition-all">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-slate-800">Fundamentals Analyst</span>
                        <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                          Gemini 2.0 Flash
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{activeStock.fundamental.summary}</p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-indigo-200 transition-all">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-slate-800">Macro Analyst</span>
                        <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                          NVIDIA NIM Llama-3.3
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{activeStock.macro.summary}</p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-indigo-200 transition-all">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-slate-800">News & Catalysts</span>
                        <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                          Mistral Large
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{activeStock.news.summary}</p>
                    </div>
                  </div>

                  {/* Right: The Adversarial Debate Arena */}
                  <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Step 2 • Adversarial Counter-Argument Arena
                        </h3>
                        <span className="inline-flex items-center self-start sm:self-auto text-[11px] sm:text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200/50 whitespace-nowrap">
                          {activeStock.debate.rounds} Debate Rounds Conducted
                        </span>
                      </div>

                      {/* Bull Argument */}
                      <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 mb-3.5">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide">Bull Thesis</span>
                        </div>
                        <p className="text-sm text-emerald-950 leading-relaxed font-normal">
                          "{activeStock.debate.bull}"
                        </p>
                      </div>

                      {/* Bear Counter-Argument */}
                      <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200/80">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="h-2 w-2 rounded-full bg-rose-500" />
                          <span className="text-xs font-bold text-rose-900 uppercase tracking-wide">Bear Counter-Thesis</span>
                        </div>
                        <p className="text-sm text-rose-950 leading-relaxed font-normal">
                          "{activeStock.debate.bear}"
                        </p>
                      </div>
                    </div>

                    {/* Consensus banner */}
                    <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
                      <div>
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          Portfolio Manager Synthesis
                        </p>
                        <p className="text-base font-bold text-white mt-0.5">{activeStock.debate.consensus}</p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold ${activeStock.quant.status.includes('APPROVED')
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}>
                          {activeStock.quant.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'quant' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                    <p className="text-xs font-semibold text-slate-500">Technical Indicator Score</p>
                    <p className="text-2xl font-black text-slate-900 mt-2">{activeStock.technical.score > 0 ? `+${activeStock.technical.score}` : activeStock.technical.score}</p>
                    <div className="mt-3 w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full"
                        style={{ width: `${Math.max(10, (activeStock.technical.score + 1) * 50)}%` }}
                      />
                    </div>
                    <p className="text-xs font-bold text-indigo-700 mt-3">{activeStock.technical.signal}</p>
                  </div>

                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                    <p className="text-xs font-semibold text-slate-500">Fundamental Health</p>
                    <p className="text-2xl font-black text-slate-900 mt-2">{activeStock.fundamental.score > 0 ? `+${activeStock.fundamental.score}` : activeStock.fundamental.score}</p>
                    <div className="mt-3 w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full"
                        style={{ width: `${Math.max(10, (activeStock.fundamental.score + 1) * 50)}%` }}
                      />
                    </div>
                    <p className="text-xs font-bold text-emerald-700 mt-3">{activeStock.fundamental.signal}</p>
                  </div>

                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                    <p className="text-xs font-semibold text-slate-500">Macro Environment</p>
                    <p className="text-2xl font-black text-slate-900 mt-2">{activeStock.macro.score > 0 ? `+${activeStock.macro.score}` : activeStock.macro.score}</p>
                    <div className="mt-3 w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full"
                        style={{ width: `${Math.max(10, (activeStock.macro.score + 1) * 50)}%` }}
                      />
                    </div>
                    <p className="text-xs font-bold text-blue-700 mt-3">{activeStock.macro.signal}</p>
                  </div>

                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                    <p className="text-xs font-semibold text-slate-500">News Catalyst Sentiment</p>
                    <p className="text-2xl font-black text-slate-900 mt-2">{activeStock.news.score > 0 ? `+${activeStock.news.score}` : activeStock.news.score}</p>
                    <div className="mt-3 w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-purple-600 h-full rounded-full"
                        style={{ width: `${Math.max(10, (activeStock.news.score + 1) * 50)}%` }}
                      />
                    </div>
                    <p className="text-xs font-bold text-purple-700 mt-3">{activeStock.news.signal}</p>
                  </div>
                </div>
              )}

              {activeTab === 'risk' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Backtest Gate</p>
                    <p className="text-xl font-bold text-slate-900 mt-2">Deflated Sharpe (DSR)</p>
                    <p className="text-3xl font-black text-indigo-600 mt-2">{activeStock.quant.dsr.split(' ')[0]}</p>
                    <p className="text-xs text-slate-500 mt-2">
                      Adjusts for non-normal skewness & multiple testing sample sizes.
                    </p>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Overfitting Risk</p>
                    <p className="text-xl font-bold text-slate-900 mt-2">Probability Overfitting (PBO)</p>
                    <p className={`text-3xl font-black mt-2 ${activeStock.quant.pbo.includes('Pass') ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {activeStock.quant.pbo.split(' ')[0]}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      Calculated via Combinatorially Symmetric Cross-Validation (CSCV).
                    </p>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Execution Limit</p>
                    <p className="text-xl font-bold text-slate-900 mt-2">Fractional Kelly Lot Size</p>
                    <p className="text-3xl font-black text-slate-900 mt-2">{activeStock.quant.sizingKelly}</p>
                    <p className="text-xs text-slate-500 mt-2">
                      Volatility-penalized position cap determined by Risk Manager.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer with terminal launch trigger */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Live backtesting verification executed via TradeVault Python microservice
              </span>
              <Link
                to="/picks"
                className="font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                <span>View AI Top Picks</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. INTERACTIVE 4-TIER ARCHITECTURE VISUALIZER
      ───────────────────────────────────────────────────────────── */}
      <section id="architecture" className="py-24 bg-white border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Full-Stack Architecture
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Engineered for Speed, Precision & Zero Data Leakage
            </h2>
            <p className="mt-3 text-slate-600 text-base leading-relaxed">
              TradeVault decouples high-speed UI streaming, secure API credential vaults, and Python quantitative computing into a high-performance modular monorepo.
            </p>
          </div>

          {/* Interactive Tier Switcher */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto mb-8">
            <button
              onClick={() => setArchitectureLayer('frontend')}
              className={`p-4 rounded-2xl border text-left transition-all ${architectureLayer === 'frontend'
                ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
            >
              <div className="h-8 w-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center mb-2">
                <Terminal className="h-4 w-4" />
              </div>
              <p className="text-xs font-bold text-slate-900">1. Client SPA</p>
              <p className="text-[11px] text-slate-500">React 19 + Charts</p>
            </button>

            <button
              onClick={() => setArchitectureLayer('gateway')}
              className={`p-4 rounded-2xl border text-left transition-all ${architectureLayer === 'gateway'
                ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
            >
              <div className="h-8 w-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center mb-2">
                <Server className="h-4 w-4" />
              </div>
              <p className="text-xs font-bold text-slate-900">2. API Gateway</p>
              <p className="text-[11px] text-slate-500">Express + Vault</p>
            </button>

            <button
              onClick={() => setArchitectureLayer('runtime')}
              className={`p-4 rounded-2xl border text-left transition-all ${architectureLayer === 'runtime'
                ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
            >
              <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-2">
                <Cpu className="h-4 w-4" />
              </div>
              <p className="text-xs font-bold text-slate-900">3. Agent Runtime</p>
              <p className="text-[11px] text-slate-500">Python 3.11 + FastAPI</p>
            </button>

            <button
              onClick={() => setArchitectureLayer('quant')}
              className={`p-4 rounded-2xl border text-left transition-all ${architectureLayer === 'quant'
                ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
            >
              <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2">
                <BarChart3 className="h-4 w-4" />
              </div>
              <p className="text-xs font-bold text-slate-900">4. Quant & Broker</p>
              <p className="text-[11px] text-slate-500">Qlib + NSE Market API</p>
            </button>
          </div>

          {/* Tier Detailed Inspection Card */}
          <div className="bg-slate-50 rounded-3xl border border-slate-200/90 p-8 max-w-4xl mx-auto m3-elevation-1">
            {architectureLayer === 'frontend' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100/60 px-2.5 py-1 rounded-md">
                    Frontend Layer (SPA)
                  </span>
                  <span className="text-xs font-mono text-slate-500">Port 5173 • Vite 8</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">React 19, Lightweight Charts & Real-Time Socket.IO</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  The client delivers an ultra-fast trading interface featuring TradingView-grade financial candlestick charts, live multi-agent debate stream viewers, and optimistic UI mutations backed by Zustand and TanStack React Query v5.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
                    <p className="font-bold text-slate-800">State Layer</p>
                    <p className="text-slate-500 mt-1">Zustand + React Query</p>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
                    <p className="font-bold text-slate-800">Charts Engine</p>
                    <p className="text-slate-500 mt-1">Lightweight Charts + Recharts</p>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
                    <p className="font-bold text-slate-800">Shared Contracts</p>
                    <p className="text-slate-500 mt-1">@tradevault/shared-schemas</p>
                  </div>
                </div>
              </div>
            )}

            {architectureLayer === 'gateway' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-100/60 px-2.5 py-1 rounded-md">
                    API Gateway Layer
                  </span>
                  <span className="text-xs font-mono text-slate-500">Port 4000 • Node.js / Express</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">Zero-Trust Credential Vault & Guardrail Middleware</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Enforces JWT authentication via HTTP-only cookies, AES-256-GCM hardware-grade encryption for broker and LLM keys, emergency kill-switch interception, and rate-limited asynchronous queues via BullMQ and Redis.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
                    <p className="font-bold text-slate-800">Key Security</p>
                    <p className="text-slate-500 mt-1">AES-256-GCM + 12-byte IV</p>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
                    <p className="font-bold text-slate-800">Job Queues</p>
                    <p className="text-slate-500 mt-1">BullMQ + Redis 7</p>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
                    <p className="font-bold text-slate-800">Audit Trail</p>
                    <p className="text-slate-500 mt-1">Immutable MongoDB Logs</p>
                  </div>
                </div>
              </div>
            )}

            {architectureLayer === 'runtime' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-100/60 px-2.5 py-1 rounded-md">
                    Agent Runtime Microservice
                  </span>
                  <span className="text-xs font-mono text-slate-500">Port 8000 • Python 3.11 FastAPI</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">MultiAgentDebateGraph & Domain-Specialized Routing</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Asynchronously coordinates parallel analyst prompts, manages iterative Bull vs. Bear debate rounds, enforces internal secret headers, and automatically triggers fallback routing via OpenRouter if provider quotas are reached.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
                    <p className="font-bold text-slate-800">Inference Providers</p>
                    <p className="text-slate-500 mt-1">Groq, Gemini, Mistral, NVIDIA</p>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
                    <p className="font-bold text-slate-800">Orchestrator</p>
                    <p className="text-slate-500 mt-1">MultiAgentDebateGraph</p>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
                    <p className="font-bold text-slate-800">Failover Engine</p>
                    <p className="text-slate-500 mt-1">Circuit Breakers + OpenRouter</p>
                  </div>
                </div>
              </div>
            )}

            {architectureLayer === 'quant' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/60 px-2.5 py-1 rounded-md">
                    Quantitative & Execution Engine
                  </span>
                  <span className="text-xs font-mono text-slate-500">Qlib • GluonTS • Broker Rails</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">Mathematical Robustness & Deflated Sharpe Ratio Gates</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Evaluates 5-factor normalized momentum and volatility, generates probabilistic P10-P90 forecast quantile distributions, enforces the hard backtest overfitting gate, and dispatches fractional Kelly sized orders to broker rails.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
                    <p className="font-bold text-slate-800">Quant Factors</p>
                    <p className="text-slate-500 mt-1">Momentum, Vol, RSI, 200d SMA</p>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
                    <p className="font-bold text-slate-800">Forecasting</p>
                    <p className="text-slate-500 mt-1">GluonTS Quantiles (P10 - P90)</p>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
                    <p className="font-bold text-slate-800">Broker Execution</p>
                    <p className="text-slate-500 mt-1">Paper & Live Trading Rails</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          5. BENTO GRID FEATURES (Material Design 3 Cards)
      ───────────────────────────────────────────────────────────── */}
      <section id="quant-factors" className="py-24 bg-slate-50/70 border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-3">
              Institutional Capabilities
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Why Multi-Agent Intelligence Outperforms Single LLMs
            </h2>
            <p className="mt-3 text-slate-600 text-base leading-relaxed">
              Standard chatbots hallucinate and agree with user bias. TradeVault combines formal debate protocols with quantitative statistical validation.
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* Card 1 - Multi-Model Routing */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200/90 m3-elevation-1 hover:m3-elevation-2 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-6">
                <Brain className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Specialized LLM Routing</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Groq for high-speed mathematical analysis, Gemini for 10-K document digestion, Mistral for news filtering, and Claude for risk veto reasoning.
              </p>
            </div>

            {/* Card 2 - Quant Factor Mining */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200/90 m3-elevation-1 hover:m3-elevation-2 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-6">
                <BarChart3 className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">5-Factor Normalized Mining</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Calculates momentum (5d/20d/60d), realized volatility/ATR, RSI mean-reversion, and distance to 200d SMA, producing a composite [-1.0, 1.0] score.
              </p>
            </div>

            {/* Card 3 - Probabilistic Quantiles */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200/90 m3-elevation-1 hover:m3-elevation-2 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-6">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Probabilistic Forecasting</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Replaces unreliable single price predictions with full quantile cones: P10, P25, Median, P75, and P90 distributions across 1d, 5d, and 20d horizons.
              </p>
            </div>

            {/* Card 4 - Overfitting Gate */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200/90 m3-elevation-1 hover:m3-elevation-2 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 mb-6">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Overfitting Gate (DSR / PBO)</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Combinatorially Symmetric Cross-Validation tests if a strategy was lucky or robust. If paper eligibility fails, execution is strictly locked to HOLD.
              </p>
            </div>

            {/* Card 5 - Fractional Kelly Sizing */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200/90 m3-elevation-1 hover:m3-elevation-2 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 mb-6">
                <Sliders className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Fractional Kelly RL Sizing</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Lot sizes are calculated dynamically using fractional Kelly criterion penalized by forecast volatility, strictly respecting user max drawdown limits.
              </p>
            </div>

            {/* Card 6 - Emergency Kill Switch */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200/90 m3-elevation-1 hover:m3-elevation-2 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mb-6">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Instant Kill Switch</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                One-click global halt that immediately blocks all order dispatches and halts agent analysis at the API middleware layer.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          6. COMPARISON MATRIX (Material 3 Surface)
      ───────────────────────────────────────────────────────────── */}
      <section className="py-24 bg-white border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Compare the Difference
            </h2>
            <p className="mt-3 text-slate-600 text-base leading-relaxed">
              Why institutional quants do not trust simple ChatGPT prompts or naive algorithmic grid bots.
            </p>
          </div>

          <div className="max-w-5xl mx-auto overflow-hidden rounded-3xl border border-slate-200 m3-elevation-1 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200">
                    <th className="p-5 font-bold text-slate-700">Capability</th>
                    <th className="p-5 font-black text-indigo-700 bg-indigo-50/50">TradeVault Multi-Agent</th>
                    <th className="p-5 font-semibold text-slate-500">Naive ChatGPT / Claude</th>
                    <th className="p-5 font-semibold text-slate-500">Traditional Grid / DCA Bot</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-5 font-medium text-slate-800">Adversarial Thesis Debate</td>
                    <td className="p-5 font-bold text-indigo-600 bg-indigo-50/30 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Bull vs. Bear 1-3 rounds
                    </td>
                    <td className="p-5 text-slate-500">None (Sycophantic bias)</td>
                    <td className="p-5 text-slate-500">None</td>
                  </tr>
                  <tr>
                    <td className="p-5 font-medium text-slate-800">Mathematical Overfitting Gate</td>
                    <td className="p-5 font-bold text-indigo-600 bg-indigo-50/30 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Deflated Sharpe + PBO check
                    </td>
                    <td className="p-5 text-slate-500">None</td>
                    <td className="p-5 text-slate-500">High Curve-Fitting</td>
                  </tr>
                  <tr>
                    <td className="p-5 font-medium text-slate-800">Hardware-Grade Security</td>
                    <td className="p-5 font-bold text-indigo-600 bg-indigo-50/30 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      AES-256-GCM Credential Vault
                    </td>
                    <td className="p-5 text-slate-500">Plaintext prompt injection risk</td>
                    <td className="p-5 text-slate-500">Variable / Unencrypted</td>
                  </tr>
                  <tr>
                    <td className="p-5 font-medium text-slate-800">Forecast Uncertainty Bounds</td>
                    <td className="p-5 font-bold text-indigo-600 bg-indigo-50/30 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      P10 - P90 Quantile Distribution
                    </td>
                    <td className="p-5 text-slate-500">Single hallucinated price target</td>
                    <td className="p-5 text-slate-500">Deterministic grid levels</td>
                  </tr>
                  <tr>
                    <td className="p-5 font-medium text-slate-800">Emergency Protocol</td>
                    <td className="p-5 font-bold text-indigo-600 bg-indigo-50/30 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Single-click Global Kill Switch
                    </td>
                    <td className="p-5 text-slate-500">None</td>
                    <td className="p-5 text-slate-500">Manual broker login</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          7. SAFETY RAILS & ENTERPRISE SECURITY
      ───────────────────────────────────────────────────────────── */}
      <section id="safety-rails" className="py-24 bg-slate-50/60 border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 rounded-3xl p-8 sm:p-12 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-indigo-200 mb-6 border border-white/10">
                <Lock className="h-3.5 w-3.5 text-indigo-400" />
                <span>Zero-Trust Enterprise Guardrails</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Capital Protection Built into Every Single Line of Code
              </h2>

              <p className="mt-4 text-indigo-200 text-base max-w-2xl leading-relaxed">
                We believe algorithmic trading platforms must be defensive by default. TradeVault prevents unauthorized live execution through multiple cryptographic and procedural layers.
              </p>

              <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                  <p className="font-bold text-white text-base">Paper-First Isolation</p>
                  <p className="text-xs text-indigo-200 mt-2 leading-relaxed">
                    Defaults strictly to Virtual Paper sandbox. Live trading requires typed confirmation phrases and expires in 24 hours.
                  </p>
                </div>

                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                  <p className="font-bold text-white text-base">AES-256-GCM Vault</p>
                  <p className="text-xs text-indigo-200 mt-2 leading-relaxed">
                    All broker secrets and LLM tokens are encrypted with unique 12-byte IVs. Plaintext keys never touch logs or databases.
                  </p>
                </div>

                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                  <p className="font-bold text-white text-base">Immutable Audit Trail</p>
                  <p className="text-xs text-indigo-200 mt-2 leading-relaxed">
                    Pre-hook protected MongoDB collection preventing any edit or deletion of trade, kill-switch, or key access events.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          8. FAQ SECTION (Material Design Accordion)
      ───────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-24 bg-white border-b border-slate-200/70">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="mt-3 text-slate-600 text-base">
              Everything you need to know about the architecture, security, and setup.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: 'How does TradeVault differ from asking ChatGPT for trading ideas?',
                a: 'Standard LLMs give single-shot, sycophantic advice without testing their own counter-theses or calculating statistical overfitting. TradeVault conducts multi-agent adversarial debates between dedicated Bull and Bear researchers, computes 5 quantitative factors, checks Deflated Sharpe Ratios, and strictly halts trades if the strategy fails paper trading eligibility.',
              },
              {
                q: 'Is my real money at risk when running TradeVault?',
                a: 'No. The platform defaults 100% to Virtual Paper Trading. Live execution is disabled by default (ALLOW_LIVE_TRADING=false) and requires an explicit timed confirmation in the UI to unlock for a 24-hour window.',
              },
              {
                q: 'Which LLM API keys do I need to get started?',
                a: 'The system can run with your own keys for Groq (DeepSeek-R1), Google Gemini (2.0 Flash), Mistral, and NVIDIA NIM. If any provider experiences downtime or rate limits, the built-in LLM router automatically fails over to OpenRouter.',
              },
              {
                q: 'What is the Overfitting Gate and why is it mandatory?',
                a: 'Backtest overfitting occurs when a trading strategy looks profitable simply due to random noise in historical data. TradeVault uses Combinatorially Symmetric Cross-Validation (CSCV) and Deflated Sharpe Ratios (DSR) to calculate the Probability of Backtest Overfitting (PBO). If PBO is high, the system forcibly vetoes the trade and locks the action to "HOLD".',
              },
              {
                q: 'How do I run the full platform on my local machine?',
                a: 'The entire stack can be orchestrated in seconds with Docker Compose (`docker-compose up -d --build` inside the `server/` directory) to launch MongoDB, Redis, API Gateway, and the Python microservice, followed by `npm run dev` in `frontend/`.',
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50 transition-colors"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-slate-900 text-base hover:text-indigo-600 transition-colors"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 text-slate-400 shrink-0 transition-transform ${openFaq === idx ? 'rotate-180 text-indigo-600' : ''
                      }`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-5 text-sm text-slate-600 leading-relaxed border-t border-slate-200/60 pt-4 bg-white">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          9. BOTTOM CALL TO ACTION
      ───────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-slate-50/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-10 sm:p-14 m3-elevation-2">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Ready to Upgrade to Committee-Driven AI Trading?
            </h2>
            <p className="mt-4 text-slate-600 text-base max-w-xl mx-auto leading-relaxed">
              Launch the TradeVault terminal now in Paper Sandbox mode. No financial commitment required.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-base px-8 py-3.5 rounded-xl shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/40 transition-all"
              >
                <span>Create Free Account</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/dashboard"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-base px-7 py-3.5 rounded-xl transition-all"
              >
                <span>Explore Terminal Demo</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          10. FOOTER
      ───────────────────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-slate-200/80 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <img src={logoImg} alt="TradeVault" className="h-7 w-auto object-contain rounded-md" />
            <span className="font-bold text-slate-900 text-base">TradeVault</span>
            <span className="text-xs text-slate-400">© 2026. All rights reserved.</span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs font-semibold text-slate-600">
            <a href="#debate-demo" className="hover:text-indigo-600 transition-colors">Debate Engine</a>
            <a href="#architecture" className="hover:text-indigo-600 transition-colors">Architecture</a>
            <a href="#quant-factors" className="hover:text-indigo-600 transition-colors">Quant Mining</a>
            <Link to="/terms" className="hover:text-indigo-600 transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-indigo-600 transition-colors">Privacy</Link>
            <Link to="/login" className="hover:text-indigo-600 transition-colors">Terminal Login</Link>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Systems Operational</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
