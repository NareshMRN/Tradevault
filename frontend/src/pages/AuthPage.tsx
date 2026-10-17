import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, TrendingUp, ShieldCheck, Brain } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import logoImg from '@/assets/logo.png';
import { authService } from '@/services/authService';

const FEATURES = [
  { icon: Brain, title: 'Multi-Agent Debate', desc: 'Bull and Bear researchers challenge each other before any trade.' },
  { icon: ShieldCheck, title: 'Risk-First Design', desc: 'Every proposal passes a risk manager veto before reaching you.' },
  { icon: TrendingUp, title: 'Paper Trading Safe', desc: 'All trades are simulated. No real money at risk.' },
];

export function AuthPage({ type }: { type: 'login' | 'register' }) {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (type === 'register' && !name.trim()) {
      setError('Please enter your display name.');
      return;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (type === 'register') {
        const res = await authService.register(name.trim(), email.trim().toLowerCase(), password);
        setUser(res.user);
        navigate('/onboarding');
      } else {
        const res = await authService.login(email.trim().toLowerCase(), password);
        setUser(res.user);
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-indigo-600 flex-col justify-between p-12 relative overflow-hidden">
        {/* Subtle background circles */}
        <div className="absolute top-[-80px] right-[-80px] w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute bottom-[-100px] left-[-60px] w-80 h-80 rounded-full bg-white/5 pointer-events-none" />

        <div className="flex items-center gap-2.5 relative z-10">
          <img src={logoImg} alt="TradeVault Logo" className="h-9 w-auto object-contain rounded-lg" />
          <span className="text-white text-xl font-bold tracking-tight">TradeVault</span>
        </div>

        <div className="space-y-8 relative z-10">
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight mb-3">
              Agentic AI<br />Trading Intelligence
            </h1>
            <p className="text-indigo-200 text-base leading-relaxed">
              A multi-agent committee that debates, analyzes risk, and generates explainable insights — before a single order is placed.
            </p>
          </div>

          <div className="space-y-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{title}</p>
                  <p className="text-indigo-200 text-xs leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-indigo-300 text-xs relative z-10">
          Paper trading only. Your capital is always protected.
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <img src={logoImg} alt="TradeVault Logo" className="h-8 w-auto object-contain rounded-md" />
            <span className="text-lg font-bold text-foreground">TradeVault</span>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-1">
            {type === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="text-sm text-muted-foreground mb-8">
            {type === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <Link
              to={type === 'login' ? '/register' : '/login'}
              className="text-indigo-600 font-semibold hover:text-indigo-700"
            >
              {type === 'login' ? 'Sign up free' : 'Sign in'}
            </Link>
          </p>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {type === 'register' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Display Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Nikhil"
                  className="w-full bg-white border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-white border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-foreground">Password</label>
                {type === 'login' && (
                  <Link to="/forgot-password" className="text-xs text-indigo-600 hover:underline">Forgot password?</Link>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  required
                  className="w-full bg-white border border-border rounded-lg pl-4 pr-10 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {type === 'login' ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                type === 'login' ? 'Sign in' : 'Create account'
              )}
            </button>
          </form>

          <p className="mt-6 text-xs text-center text-muted-foreground">
            By continuing you agree to our{' '}
            <Link to="/terms" className="text-indigo-600 hover:underline">Terms of Service</Link>{' '}
            and{' '}
            <Link to="/privacy" className="text-indigo-600 hover:underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
