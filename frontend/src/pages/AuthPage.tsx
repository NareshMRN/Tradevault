import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, TrendingUp, ShieldCheck, Brain } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import logoImg from '@/assets/logo.png';
import { authService } from '@/services/authService';
import { signInWithGoogle } from '@/lib/firebase';

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
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleAuth = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const googleRes = await signInWithGoogle();
      const res = await authService.googleLogin(googleRes.idToken, googleRes.displayName);
      setUser(res.user);
      navigate(type === 'register' ? '/onboarding' : '/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Google authentication failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

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
                disabled={loading || googleLoading}
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

            {/* Divider */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-50 px-3 text-muted-foreground font-semibold">Or continue with</span>
              </div>
            </div>

            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={googleLoading || loading}
              className="w-full bg-white hover:bg-slate-50 border border-border text-foreground font-semibold py-2.5 rounded-lg text-sm transition-all shadow-xs flex items-center justify-center gap-3 disabled:opacity-60 hover:border-slate-300"
            >
              {googleLoading ? (
                <div className="h-4 w-4 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
              ) : (
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>{type === 'login' ? 'Sign in with Google' : 'Sign up with Google'}</span>
            </button>

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
