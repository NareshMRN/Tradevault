import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { InteractiveDotGrid } from '../components/common/InteractiveDotGrid';
import { HeroCandlestickVisual } from '../components/landing/HeroCandlestickVisual';
import { useThemeStore } from '../store/themeStore';
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
  Sun,
  Moon,
  Activity,
  CheckSquare,
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

  // Global theme store
  const { theme, toggleTheme } = useThemeStore();

  const activeStock = SAMPLE_TICKERS[selectedTicker];

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  return (
    <div className="min-h-screen bg-[#fafbfc] dark:bg-[#060b17] text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-500/20 selection:text-indigo-600 transition-colors duration-300">
      {/* ─────────────────────────────────────────────────────────────
          1. TOP APP BAR
      ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-[#060b17]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-20 h-16 flex items-center justify-between">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2.5 group shrink-0">
            <img
              src={logoImg}
              alt="TradeVault Logo"
              className="h-9 w-9 object-contain rounded-xl shadow-sm border border-slate-200/80 dark:border-slate-800 group-hover:scale-105 transition-transform"
            />
            <div className="flex flex-col">
              <span className="text-base font-black tracking-tight text-slate-900 dark:text-white leading-none">TradeVault</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold tracking-wide uppercase mt-0.5">AI Trading Agent</span>
            </div>
          </Link>

          {/* Nav links */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <a href="#" className="hover:text-indigo-600 dark:hover:text-emerald-400 transition-colors">Home</a>
            <a href="#debate-demo" className="hover:text-indigo-600 dark:hover:text-emerald-400 transition-colors">Analysis</a>
            <Link to="/backtests" className="hover:text-indigo-600 dark:hover:text-emerald-400 transition-colors">Backtesting</Link>
            <Link to="/watchlist" className="hover:text-indigo-600 dark:hover:text-emerald-400 transition-colors">Watchlist</Link>
            <Link to="/orders" className="hover:text-indigo-600 dark:hover:text-emerald-400 transition-colors">Portfolio</Link>
          </nav>

          {/* Action CTAs: Theme Toggle & Sign In */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle Button (Sun / Moon) */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-200/80 dark:border-slate-800"
              title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5 text-amber-400 fill-amber-400/20" />
              ) : (
                <Moon className="h-5 w-5 text-indigo-600 fill-indigo-600/20" />
              )}
            </button>

            {/* Sign In Button */}
            <Link
              to="/login"
              className="inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm px-5 py-2 rounded-xl shadow-md shadow-indigo-600/25 hover:shadow-indigo-600/35 transition-all"
            >
              Sign In
            </Link>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white dark:bg-[#070e1e] border-b border-slate-200 dark:border-slate-800 px-4 py-6 space-y-4 shadow-xl">
            <nav className="flex flex-col space-y-3 text-base font-semibold text-slate-700 dark:text-slate-200">
              <a
                href="#"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Home
              </a>
              <a
                href="#debate-demo"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Analysis
              </a>
              <Link
                to="/backtests"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Backtesting
              </Link>
              <Link
                to="/watchlist"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Watchlist
              </Link>
              <Link
                to="/orders"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Portfolio
              </Link>
              <a
                href="#architecture"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Architecture
              </a>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                FAQ
              </a>
            </nav>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Sign In
              </Link>
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-500 shadow-md shadow-indigo-500/20"
              >
                Start Analyzing
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. HERO SECTION
      ───────────────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden bg-gradient-to-b from-white via-slate-50/60 to-white dark:from-[#060b17] dark:via-[#091126] dark:to-[#060b17] border-b border-slate-200/70 dark:border-slate-800/70 transition-colors"
      >
        {/* Antigravity Interactive Dotted Canvas Grid */}
        <InteractiveDotGrid
          containerRef={heroRef}
          dotSpacing={28}
          baseRadius={1.3}
          hoverRadius={3.2}
          spotlightRadius={170}
        />

        {/* Ambient Dark Mode Wave SVG background decoration */}
        <div className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-60 overflow-hidden">
          <svg
            className="w-full h-full text-cyan-500/10 dark:text-cyan-400/10"
            viewBox="0 0 1200 800"
            fill="none"
          >
            <path
              d="M-100 500 C 300 300, 600 700, 1300 400"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M-100 560 C 350 360, 650 750, 1300 460"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          </svg>
        </div>

        {/* Ambient background glow blur discs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 dark:bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-blue-500/10 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 xl:gap-14 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-6 xl:col-span-6 flex flex-col justify-center text-left">
              {/* Title */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.12]">
                Smarter Trades <br />
                with <span className="text-emerald-500 dark:text-emerald-400 drop-shadow-[0_0_25px_rgba(16,185,129,0.45)]">AI.</span>
              </h1>

              {/* Subtitle */}
              <p className="mt-5 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
                Our AI trading agent analyses market trends, predicts price movements and gives data-driven insights to help you make better trading decisions.
              </p>

              {/* 4 Feature Badges (2x2 Grid) */}
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 max-w-lg">
                {/* 1. Real-time Analysis */}
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Real-time Analysis
                  </span>
                </div>

                {/* 2. AI Powered Predictions */}
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                    AI Powered Predictions
                  </span>
                </div>

                {/* 3. Backtesting Strategies */}
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <CheckSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Backtesting Strategies
                  </span>
                </div>

                {/* 4. Track & Grow Your Portfolio */}
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Track & Grow Your Portfolio
                  </span>
                </div>
              </div>

              {/* Start Analyzing CTA Button */}
              <div className="mt-8 flex items-center gap-4">
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm sm:text-base px-7 py-3.5 rounded-xl shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 group"
                >
                  <span>Start Analyzing</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>

                <a
                  href="#debate-demo"
                  className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-emerald-400 font-semibold text-sm px-4 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all"
                >
                  <Play className="h-3.5 w-3.5 text-indigo-600 dark:text-emerald-400 fill-current" />
                  <span>View Simulation</span>
                </a>
              </div>
            </div>

            {/* Right Graphic Column */}
            <div className="lg:col-span-6 xl:col-span-6 flex justify-center lg:justify-end w-full">
              <HeroCandlestickVisual />
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. INTERACTIVE AGENT DEBATE SIMULATION
      ───────────────────────────────────────────────────────────── */}
      <section id="debate-demo" className="py-20 bg-slate-50/60 dark:bg-[#070d19]/80 border-b border-slate-200/70 dark:border-slate-800/70 transition-colors">
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-20">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/60 text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider mb-3">
              Interactive Live Simulation
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Watch the AI Committee Debate in Real-Time
            </h2>
            <p className="mt-3 text-slate-600 dark:text-slate-300 text-base leading-relaxed">
              Before any trade proposal is generated, four domain-specialist models analyze the stock simultaneously, followed by an adversarial Bull vs. Bear debate and automated risk manager veto.
            </p>

            {/* Stock selector tabs */}
            <div className="mt-8 flex justify-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 bg-white dark:bg-[#0c1427] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm w-full max-w-md mx-auto">
              {(Object.keys(SAMPLE_TICKERS) as TickerKey[]).map((ticker) => (
                <button
                  key={ticker}
                  onClick={() => setSelectedTicker(ticker)}
                  className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-1.5 sm:py-2 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all min-w-0 ${
                    selectedTicker === ticker
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <span className="font-extrabold">{ticker}</span>
                  <span className={`text-[11px] sm:text-xs font-semibold ${selectedTicker === ticker ? 'text-indigo-200' : 'text-slate-400 dark:text-slate-500'}`}>
                    {SAMPLE_TICKERS[ticker].change}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Debate Card Surface */}
          <div className="bg-white dark:bg-[#0c1427] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden w-full max-w-[1600px] mx-auto">
            {/* Header with ticker metadata */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-[#090f20] flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white font-black flex items-center justify-center text-sm shadow-sm shrink-0">
                  {activeStock.symbol.slice(0, 2)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white text-base">{activeStock.symbol}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{activeStock.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-slate-900 dark:text-white">{activeStock.price}</span>
                    <span className={`font-bold ${activeStock.change.startsWith('+') ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {activeStock.change}
                    </span>
                  </div>
                </div>
              </div>

              {/* View mode toggle */}
              <div className="w-full sm:w-auto flex items-center gap-1 bg-white dark:bg-[#070d1a] border border-slate-200 dark:border-slate-800 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setActiveTab('debate')}
                  className={`flex-1 sm:flex-none text-center px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap text-[11px] sm:text-xs ${
                    activeTab === 'debate' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span className="sm:hidden">Debate</span>
                  <span className="hidden sm:inline">Multi-Agent Debate</span>
                </button>
                <button
                  onClick={() => setActiveTab('quant')}
                  className={`flex-1 sm:flex-none text-center px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap text-[11px] sm:text-xs ${
                    activeTab === 'quant' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span className="sm:hidden">Signals</span>
                  <span className="hidden sm:inline">Specialist Signals</span>
                </button>
                <button
                  onClick={() => setActiveTab('risk')}
                  className={`flex-1 sm:flex-none text-center px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap text-[11px] sm:text-xs ${
                    activeTab === 'risk' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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

                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#090f20]/60 hover:bg-white dark:hover:bg-[#090f20] hover:border-indigo-200 dark:hover:border-indigo-800 transition-all">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-slate-800 dark:text-slate-200">Technical Analyst</span>
                        <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md">
                          Groq DeepSeek-R1
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{activeStock.technical.summary}</p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#090f20]/60 hover:bg-white dark:hover:bg-[#090f20] hover:border-indigo-200 dark:hover:border-indigo-800 transition-all">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-slate-800 dark:text-slate-200">Fundamentals Analyst</span>
                        <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md">
                          Gemini 2.0 Flash
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{activeStock.fundamental.summary}</p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#090f20]/60 hover:bg-white dark:hover:bg-[#090f20] hover:border-indigo-200 dark:hover:border-indigo-800 transition-all">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-slate-800 dark:text-slate-200">Macro Analyst</span>
                        <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md">
                          NVIDIA NIM Llama-3.3
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{activeStock.macro.summary}</p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#090f20]/60 hover:bg-white dark:hover:bg-[#090f20] hover:border-indigo-200 dark:hover:border-indigo-800 transition-all">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-slate-800 dark:text-slate-200">News & Catalysts</span>
                        <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md">
                          Mistral Large
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{activeStock.news.summary}</p>
                    </div>
                  </div>

                  {/* Right: The Adversarial Debate Arena */}
                  <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Step 2 • Adversarial Counter-Argument Arena
                        </h3>
                        <span className="inline-flex items-center self-start sm:self-auto text-[11px] sm:text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-full border border-indigo-200/50 dark:border-indigo-800/50 whitespace-nowrap">
                          {activeStock.debate.rounds} Debate Rounds Conducted
                        </span>
                      </div>

                      {/* Bull Argument */}
                      <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 mb-3.5">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wide">Bull Thesis</span>
                        </div>
                        <p className="text-sm text-emerald-950 dark:text-emerald-100 leading-relaxed font-normal">
                          "{activeStock.debate.bull}"
                        </p>
                      </div>

                      {/* Bear Counter-Argument */}
                      <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-800/40">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="h-2 w-2 rounded-full bg-rose-500" />
                          <span className="text-xs font-bold text-rose-900 dark:text-rose-300 uppercase tracking-wide">Bear Counter-Thesis</span>
                        </div>
                        <p className="text-sm text-rose-950 dark:text-rose-100 leading-relaxed font-normal">
                          "{activeStock.debate.bear}"
                        </p>
                      </div>
                    </div>

                    {/* Consensus banner */}
                    <div className="p-4 rounded-2xl bg-slate-900 dark:bg-[#070e1e] text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md border border-slate-800">
                      <div>
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          Portfolio Manager Synthesis
                        </p>
                        <p className="text-base font-bold text-white mt-0.5">{activeStock.debate.consensus}</p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`inline-block px-3 py-1 rounded-lg text-xs font-bold ${
                            activeStock.quant.status.includes('APPROVED')
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {activeStock.quant.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'quant' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-50 dark:bg-[#090f20] p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Technical Indicator Score</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                      {activeStock.technical.score > 0 ? `+${activeStock.technical.score}` : activeStock.technical.score}
                    </p>
                    <div className="mt-3 w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full"
                        style={{ width: `${Math.max(10, (activeStock.technical.score + 1) * 50)}%` }}
                      />
                    </div>
                    <p className="text-xs font-bold text-indigo-700 dark:text-indigo-400 mt-3">{activeStock.technical.signal}</p>
                  </div>

                  <div className="bg-slate-50 dark:bg-[#090f20] p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Fundamental Health</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                      {activeStock.fundamental.score > 0 ? `+${activeStock.fundamental.score}` : activeStock.fundamental.score}
                    </p>
                    <div className="mt-3 w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full"
                        style={{ width: `${Math.max(10, (activeStock.fundamental.score + 1) * 50)}%` }}
                      />
                    </div>
                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mt-3">{activeStock.fundamental.signal}</p>
                  </div>

                  <div className="bg-slate-50 dark:bg-[#090f20] p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Macro Environment</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                      {activeStock.macro.score > 0 ? `+${activeStock.macro.score}` : activeStock.macro.score}
                    </p>
                    <div className="mt-3 w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full"
                        style={{ width: `${Math.max(10, (activeStock.macro.score + 1) * 50)}%` }}
                      />
                    </div>
                    <p className="text-xs font-bold text-blue-700 dark:text-blue-400 mt-3">{activeStock.macro.signal}</p>
                  </div>

                  <div className="bg-slate-50 dark:bg-[#090f20] p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">News Catalyst Sentiment</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                      {activeStock.news.score > 0 ? `+${activeStock.news.score}` : activeStock.news.score}
                    </p>
                    <div className="mt-3 w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-purple-600 h-full rounded-full"
                        style={{ width: `${Math.max(10, (activeStock.news.score + 1) * 50)}%` }}
                      />
                    </div>
                    <p className="text-xs font-bold text-purple-700 dark:text-purple-400 mt-3">{activeStock.news.signal}</p>
                  </div>
                </div>
              )}

              {activeTab === 'risk' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-slate-50 dark:bg-[#090f20] p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Backtest Gate</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white mt-2">Deflated Sharpe (DSR)</p>
                    <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-2">{activeStock.quant.dsr.split(' ')[0]}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      Adjusts for non-normal skewness & multiple testing sample sizes.
                    </p>
                  </div>

                  <div className="bg-slate-50 dark:bg-[#090f20] p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Overfitting Risk</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white mt-2">Probability Overfitting (PBO)</p>
                    <p className={`text-3xl font-black mt-2 ${activeStock.quant.pbo.includes('Pass') ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {activeStock.quant.pbo.split(' ')[0]}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      Calculated via Combinatorially Symmetric Cross-Validation (CSCV).
                    </p>
                  </div>

                  <div className="bg-slate-50 dark:bg-[#090f20] p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Execution Limit</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white mt-2">Fractional Kelly Lot Size</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white mt-2">{activeStock.quant.sizingKelly}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      Volatility-penalized position cap determined by Risk Manager.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer with terminal launch trigger */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-[#090f20] border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Live backtesting verification executed via TradeVault Python microservice
              </span>
              <Link
                to="/proposals"
                className="font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1"
              >
                <span>View Full Proposal Inspector</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. INTERACTIVE 4-TIER ARCHITECTURE VISUALIZER
      ───────────────────────────────────────────────────────────── */}
      <section id="architecture" className="py-24 bg-white dark:bg-[#060b17] border-b border-slate-200/70 dark:border-slate-800/70 transition-colors">
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-20">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
              Full-Stack Architecture
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Engineered for Speed, Precision & Zero Data Leakage
            </h2>
            <p className="mt-3 text-slate-600 dark:text-slate-300 text-base leading-relaxed">
              TradeVault decouples high-speed UI streaming, secure API credential vaults, and Python quantitative computing into a high-performance modular monorepo.
            </p>
          </div>

          {/* Interactive Tier Switcher */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto mb-8">
            <button
              onClick={() => setArchitectureLayer('frontend')}
              className={`p-4 rounded-2xl border text-left transition-all ${
                architectureLayer === 'frontend'
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-600 ring-2 ring-indigo-500/20'
                  : 'bg-white dark:bg-[#0c1427] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 flex items-center justify-center mb-2">
                <Terminal className="h-4 w-4" />
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">1. Client SPA</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">React 19 + Charts</p>
            </button>

            <button
              onClick={() => setArchitectureLayer('gateway')}
              className={`p-4 rounded-2xl border text-left transition-all ${
                architectureLayer === 'gateway'
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-600 ring-2 ring-indigo-500/20'
                  : 'bg-white dark:bg-[#0c1427] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-400 flex items-center justify-center mb-2">
                <Server className="h-4 w-4" />
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">2. API Gateway</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Express + Vault</p>
            </button>

            <button
              onClick={() => setArchitectureLayer('runtime')}
              className={`p-4 rounded-2xl border text-left transition-all ${
                architectureLayer === 'runtime'
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-600 ring-2 ring-indigo-500/20'
                  : 'bg-white dark:bg-[#0c1427] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 flex items-center justify-center mb-2">
                <Cpu className="h-4 w-4" />
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">3. Agent Runtime</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Python 3.11 + FastAPI</p>
            </button>

            <button
              onClick={() => setArchitectureLayer('quant')}
              className={`p-4 rounded-2xl border text-left transition-all ${
                architectureLayer === 'quant'
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-600 ring-2 ring-indigo-500/20'
                  : 'bg-white dark:bg-[#0c1427] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mb-2">
                <BarChart3 className="h-4 w-4" />
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">4. Quant & Broker</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Qlib + Alpaca API</p>
            </button>
          </div>

          {/* Tier Detailed Inspection Card */}
          <div className="bg-slate-50 dark:bg-[#0c1427] rounded-3xl border border-slate-200/90 dark:border-slate-800 p-8 max-w-4xl mx-auto shadow-md">
            {architectureLayer === 'frontend' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 bg-indigo-100/60 dark:bg-indigo-950/50 px-2.5 py-1 rounded-md">
                    Frontend Layer (SPA)
                  </span>
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400">Port 5173 • Vite 8</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">React 19, Lightweight Charts & Real-Time Socket.IO</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  The client delivers an ultra-fast trading interface featuring TradingView-grade financial candlestick charts, live multi-agent debate stream viewers, and optimistic UI mutations backed by Zustand and TanStack React Query v5.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                  <div className="bg-white dark:bg-[#090f20] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                    <p className="font-bold text-slate-800 dark:text-slate-200">State Layer</p>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Zustand + React Query</p>
                  </div>
                  <div className="bg-white dark:bg-[#090f20] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                    <p className="font-bold text-slate-800 dark:text-slate-200">Charts Engine</p>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Lightweight Charts + Recharts</p>
                  </div>
                  <div className="bg-white dark:bg-[#090f20] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                    <p className="font-bold text-slate-800 dark:text-slate-200">Shared Contracts</p>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">@tradevault/shared-schemas</p>
                  </div>
                </div>
              </div>
            )}

            {architectureLayer === 'gateway' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 bg-purple-100/60 dark:bg-purple-950/50 px-2.5 py-1 rounded-md">
                    API Gateway Layer
                  </span>
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400">Port 4000 • Node.js / Express</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Zero-Trust Credential Vault & Guardrail Middleware</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Enforces JWT authentication via HTTP-only cookies, AES-256-GCM hardware-grade encryption for broker and LLM keys, emergency kill-switch interception, and rate-limited asynchronous queues via BullMQ and Redis.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                  <div className="bg-white dark:bg-[#090f20] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                    <p className="font-bold text-slate-800 dark:text-slate-200">Key Security</p>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">AES-256-GCM + 12-byte IV</p>
                  </div>
                  <div className="bg-white dark:bg-[#090f20] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                    <p className="font-bold text-slate-800 dark:text-slate-200">Job Queues</p>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">BullMQ + Redis 7</p>
                  </div>
                  <div className="bg-white dark:bg-[#090f20] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                    <p className="font-bold text-slate-800 dark:text-slate-200">Audit Trail</p>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Immutable MongoDB Logs</p>
                  </div>
                </div>
              </div>
            )}

            {architectureLayer === 'runtime' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 bg-blue-100/60 dark:bg-blue-950/50 px-2.5 py-1 rounded-md">
                    Agent Runtime Microservice
                  </span>
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400">Port 8000 • Python 3.11 FastAPI</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">MultiAgentDebateGraph & Domain-Specialized Routing</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Asynchronously coordinates parallel analyst prompts, manages iterative Bull vs. Bear debate rounds, enforces internal secret headers, and automatically triggers fallback routing via OpenRouter if provider quotas are reached.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                  <div className="bg-white dark:bg-[#090f20] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                    <p className="font-bold text-slate-800 dark:text-slate-200">Inference Providers</p>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Groq, Gemini, Mistral, NVIDIA</p>
                  </div>
                  <div className="bg-white dark:bg-[#090f20] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                    <p className="font-bold text-slate-800 dark:text-slate-200">Orchestrator</p>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">MultiAgentDebateGraph</p>
                  </div>
                  <div className="bg-white dark:bg-[#090f20] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                    <p className="font-bold text-slate-800 dark:text-slate-200">Failover Engine</p>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Circuit Breakers + OpenRouter</p>
                  </div>
                </div>
              </div>
            )}

            {architectureLayer === 'quant' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-950/50 px-2.5 py-1 rounded-md">
                    Quantitative & Execution Engine
                  </span>
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400">Qlib • GluonTS • Alpaca API</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Mathematical Robustness & Deflated Sharpe Ratio Gates</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Evaluates 5-factor normalized momentum and volatility, generates probabilistic P10-P90 forecast quantile distributions, enforces the hard backtest overfitting gate, and dispatches fractional Kelly sized orders to Alpaca.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                  <div className="bg-white dark:bg-[#090f20] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                    <p className="font-bold text-slate-800 dark:text-slate-200">Quant Factors</p>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Momentum, Vol, RSI, 200d SMA</p>
                  </div>
                  <div className="bg-white dark:bg-[#090f20] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                    <p className="font-bold text-slate-800 dark:text-slate-200">Forecasting</p>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">GluonTS Quantiles (P10 - P90)</p>
                  </div>
                  <div className="bg-white dark:bg-[#090f20] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                    <p className="font-bold text-slate-800 dark:text-slate-200">Broker Execution</p>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Alpaca Paper & Live API</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          5. BENTO GRID FEATURES
      ───────────────────────────────────────────────────────────── */}
      <section id="quant-factors" className="py-24 bg-slate-50/70 dark:bg-[#070d19]/80 border-b border-slate-200/70 dark:border-slate-800/70 transition-colors">
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-20">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-3">
              Institutional Capabilities
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Why Multi-Agent Intelligence Outperforms Single LLMs
            </h2>
            <p className="mt-3 text-slate-600 dark:text-slate-300 text-base leading-relaxed">
              Standard chatbots hallucinate and agree with user bias. TradeVault combines formal debate protocols with quantitative statistical validation.
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-[1600px] mx-auto">
            {/* Card 1 - Multi-Model Routing */}
            <div className="bg-white dark:bg-[#0c1427] p-8 rounded-3xl border border-slate-200/90 dark:border-slate-800/90 shadow-sm hover:shadow-md transition-all">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-6">
                <Brain className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Specialized LLM Routing</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Groq for high-speed mathematical analysis, Gemini for 10-K document digestion, Mistral for news filtering, and Claude for risk veto reasoning.
              </p>
            </div>

            {/* Card 2 - Quant Factor Mining */}
            <div className="bg-white dark:bg-[#0c1427] p-8 rounded-3xl border border-slate-200/90 dark:border-slate-800/90 shadow-sm hover:shadow-md transition-all">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6">
                <BarChart3 className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">5-Factor Normalized Mining</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Calculates momentum (5d/20d/60d), realized volatility/ATR, RSI mean-reversion, and distance to 200d SMA, producing a composite [-1.0, 1.0] score.
              </p>
            </div>

            {/* Card 3 - Probabilistic Quantiles */}
            <div className="bg-white dark:bg-[#0c1427] p-8 rounded-3xl border border-slate-200/90 dark:border-slate-800/90 shadow-sm hover:shadow-md transition-all">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Probabilistic Forecasting</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Replaces unreliable single price predictions with full quantile cones: P10, P25, Median, P75, and P90 distributions across 1d, 5d, and 20d horizons.
              </p>
            </div>

            {/* Card 4 - Overfitting Gate */}
            <div className="bg-white dark:bg-[#0c1427] p-8 rounded-3xl border border-slate-200/90 dark:border-slate-800/90 shadow-sm hover:shadow-md transition-all">
              <div className="h-12 w-12 rounded-2xl bg-purple-50 dark:bg-purple-950/50 border border-purple-100 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-6">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Overfitting Gate (DSR / PBO)</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Combinatorially Symmetric Cross-Validation tests if a strategy was lucky or robust. If paper eligibility fails, execution is strictly locked to HOLD.
              </p>
            </div>

            {/* Card 5 - Fractional Kelly Sizing */}
            <div className="bg-white dark:bg-[#0c1427] p-8 rounded-3xl border border-slate-200/90 dark:border-slate-800/90 shadow-sm hover:shadow-md transition-all">
              <div className="h-12 w-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-6">
                <Sliders className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Fractional Kelly RL Sizing</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Lot sizes are calculated dynamically using fractional Kelly criterion penalized by forecast volatility, strictly respecting user max drawdown limits.
              </p>
            </div>

            {/* Card 6 - Emergency Kill Switch */}
            <div className="bg-white dark:bg-[#0c1427] p-8 rounded-3xl border border-slate-200/90 dark:border-slate-800/90 shadow-sm hover:shadow-md transition-all">
              <div className="h-12 w-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-100 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-6">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Instant Kill Switch</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                One-click global halt that immediately blocks all order dispatches and halts agent analysis at the API middleware layer.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          6. COMPARISON MATRIX
      ───────────────────────────────────────────────────────────── */}
      <section className="py-24 bg-white dark:bg-[#060b17] border-b border-slate-200/70 dark:border-slate-800/70 transition-colors">
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-20">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Compare the Difference
            </h2>
            <p className="mt-3 text-slate-600 dark:text-slate-300 text-base leading-relaxed">
              Why institutional quants do not trust simple ChatGPT prompts or naive algorithmic grid bots.
            </p>
          </div>

          <div className="w-full max-w-[1600px] mx-auto overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-[#0c1427]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-[#090f20] border-b border-slate-200 dark:border-slate-800">
                    <th className="p-5 font-bold text-slate-700 dark:text-slate-300">Capability</th>
                    <th className="p-5 font-black text-indigo-700 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40">TradeVault Multi-Agent</th>
                    <th className="p-5 font-semibold text-slate-500 dark:text-slate-400">Naive ChatGPT / Claude</th>
                    <th className="p-5 font-semibold text-slate-500 dark:text-slate-400">Traditional Grid / DCA Bot</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  <tr>
                    <td className="p-5 font-medium text-slate-800 dark:text-slate-200">Adversarial Thesis Debate</td>
                    <td className="p-5 font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/20 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      Bull vs. Bear 1-3 rounds
                    </td>
                    <td className="p-5 text-slate-500 dark:text-slate-400">None (Sycophantic bias)</td>
                    <td className="p-5 text-slate-500 dark:text-slate-400">None</td>
                  </tr>
                  <tr>
                    <td className="p-5 font-medium text-slate-800 dark:text-slate-200">Mathematical Overfitting Gate</td>
                    <td className="p-5 font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/20 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      Deflated Sharpe + PBO check
                    </td>
                    <td className="p-5 text-slate-500 dark:text-slate-400">None</td>
                    <td className="p-5 text-slate-500 dark:text-slate-400">High Curve-Fitting</td>
                  </tr>
                  <tr>
                    <td className="p-5 font-medium text-slate-800 dark:text-slate-200">Hardware-Grade Security</td>
                    <td className="p-5 font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/20 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      AES-256-GCM Credential Vault
                    </td>
                    <td className="p-5 text-slate-500 dark:text-slate-400">Plaintext prompt injection risk</td>
                    <td className="p-5 text-slate-500 dark:text-slate-400">Variable / Unencrypted</td>
                  </tr>
                  <tr>
                    <td className="p-5 font-medium text-slate-800 dark:text-slate-200">Forecast Uncertainty Bounds</td>
                    <td className="p-5 font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/20 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      P10 - P90 Quantile Distribution
                    </td>
                    <td className="p-5 text-slate-500 dark:text-slate-400">Single hallucinated price target</td>
                    <td className="p-5 text-slate-500 dark:text-slate-400">Deterministic grid levels</td>
                  </tr>
                  <tr>
                    <td className="p-5 font-medium text-slate-800 dark:text-slate-200">Emergency Protocol</td>
                    <td className="p-5 font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/20 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      Single-click Global Kill Switch
                    </td>
                    <td className="p-5 text-slate-500 dark:text-slate-400">None</td>
                    <td className="p-5 text-slate-500 dark:text-slate-400">Manual broker login</td>
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
      <section id="safety-rails" className="py-24 bg-slate-50/60 dark:bg-[#070d19]/80 border-b border-slate-200/70 dark:border-slate-800/70 transition-colors">
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-20">
          <div className="w-full max-w-[1600px] mx-auto bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 dark:from-[#0b142c] dark:via-[#080d1e] dark:to-[#0b142c] rounded-3xl p-8 sm:p-12 text-white shadow-xl relative overflow-hidden border border-slate-800">
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
                    Defaults strictly to Alpaca Paper sandbox. Live trading requires typed confirmation phrases and expires in 24 hours.
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
          8. FAQ SECTION
      ───────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-24 bg-white dark:bg-[#060b17] border-b border-slate-200/70 dark:border-slate-800/70 transition-colors">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="mt-3 text-slate-600 dark:text-slate-300 text-base">
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
                a: 'No. The platform defaults 100% to Alpaca Paper Trading. Live execution is disabled by default (ALLOW_LIVE_TRADING=false) and requires an explicit timed confirmation in the UI to unlock for a 24-hour window.',
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
                className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-[#0c1427]/60 transition-colors"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-slate-900 dark:text-white text-base hover:text-indigo-600 dark:hover:text-emerald-400 transition-colors"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 text-slate-400 shrink-0 transition-transform ${
                      openFaq === idx ? 'rotate-180 text-indigo-600 dark:text-emerald-400' : ''
                    }`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-200/60 dark:border-slate-800 pt-4 bg-white dark:bg-[#0c1427]">
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
      <section className="py-20 bg-slate-50/80 dark:bg-[#070d19]/80 transition-colors">
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-20 text-center">
          <div className="w-full max-w-[1600px] mx-auto bg-white dark:bg-[#0c1427] rounded-3xl border border-slate-200/90 dark:border-slate-800 p-10 sm:p-14 shadow-md">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Ready to Upgrade to Committee-Driven AI Trading?
            </h2>
            <p className="mt-4 text-slate-600 dark:text-slate-300 text-base max-w-xl mx-auto leading-relaxed">
              Launch the TradeVault terminal now in Paper Sandbox mode. No financial commitment required.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-base px-8 py-3.5 rounded-xl shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/40 transition-all"
              >
                <span>Create Free Account</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/dashboard"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-base px-7 py-3.5 rounded-xl transition-all"
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
      <footer className="bg-white dark:bg-[#060b17] border-t border-slate-200/80 dark:border-slate-800/80 py-12 transition-colors">
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-20 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <img src={logoImg} alt="TradeVault" className="h-7 w-auto object-contain rounded-md" />
            <span className="font-bold text-slate-900 dark:text-white text-base">TradeVault</span>
            <span className="text-xs text-slate-400 dark:text-slate-500">© 2026. All rights reserved.</span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <a href="#debate-demo" className="hover:text-indigo-600 dark:hover:text-emerald-400 transition-colors">Debate Engine</a>
            <a href="#architecture" className="hover:text-indigo-600 dark:hover:text-emerald-400 transition-colors">Architecture</a>
            <a href="#quant-factors" className="hover:text-indigo-600 dark:hover:text-emerald-400 transition-colors">Quant Mining</a>
            <Link to="/terms" className="hover:text-indigo-600 dark:hover:text-emerald-400 transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-indigo-600 dark:hover:text-emerald-400 transition-colors">Privacy</Link>
            <Link to="/login" className="hover:text-indigo-600 dark:hover:text-emerald-400 transition-colors">Terminal Login</Link>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Systems Operational</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
