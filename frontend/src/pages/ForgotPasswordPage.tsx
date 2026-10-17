import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, CheckCircle2, Lock, KeyRound, ArrowRight } from 'lucide-react';
import logoImg from '@/assets/logo.png';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'request' | 'sent' | 'reset'>('request');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSendReset = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep('sent');
    }, 800);
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (code.length < 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="max-w-md w-full bg-white border border-border rounded-3xl m3-elevation-2 overflow-hidden">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-6 text-white flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logoImg} alt="TradeVault Logo" className="h-8 w-auto object-contain rounded-lg" />
            <span className="font-bold text-base text-white tracking-tight">TradeVault</span>
          </Link>
          <Link
            to="/login"
            className="text-xs font-semibold text-indigo-100 hover:text-white flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to sign in</span>
          </Link>
        </div>

        <div className="p-6 sm:p-8">
          {/* STEP 1: Enter Email */}
          {step === 'request' && (
            <div>
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-5">
                <KeyRound className="h-6 w-6" />
              </div>

              <h1 className="text-2xl font-bold text-slate-900">Forgot password?</h1>
              <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                No worries. Enter the email address linked to your TradeVault account and we’ll send you password recovery instructions.
              </p>

              <form onSubmit={handleSendReset} className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email address</label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm"
                    />
                    <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {error && (
                  <div className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-2.5">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Sending instructions...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Reset Instructions</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-6 text-xs text-center text-slate-500">
                Remembered your password?{' '}
                <Link to="/login" className="text-indigo-600 font-semibold hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          )}

          {/* STEP 2: Email Sent Confirmation */}
          {step === 'sent' && (
            <div className="text-center">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mx-auto mb-5">
                <CheckCircle2 className="h-6 w-6" />
              </div>

              <h2 className="text-2xl font-bold text-slate-900">Check your inbox</h2>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                We've sent a 6-digit recovery code and reset link to:
              </p>
              <p className="text-sm font-semibold text-slate-900 bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-lg inline-block mt-2 font-mono">
                {email}
              </p>

              <div className="mt-6 space-y-3">
                <button
                  onClick={() => setStep('reset')}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-all shadow-md shadow-indigo-500/20"
                >
                  Enter 6-Digit Code & Reset Password
                </button>

                <button
                  onClick={() => setStep('request')}
                  className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold py-2.5 rounded-xl text-sm transition-colors border border-slate-200"
                >
                  Try another email
                </button>
              </div>

              <p className="mt-6 text-xs text-slate-400">
                Didn't receive the email? Check spam or resend in 60s.
              </p>
            </div>
          )}

          {/* STEP 3: Enter Code & New Password */}
          {step === 'reset' && (
            <div>
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-5">
                <Lock className="h-6 w-6" />
              </div>

              <h2 className="text-2xl font-bold text-slate-900">Set new password</h2>
              <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                Enter the 6-digit verification code sent to your email and choose your new password.
              </p>

              {success ? (
                <div className="mt-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                  <p className="text-sm font-bold text-emerald-950">Password successfully updated!</p>
                  <p className="text-xs text-emerald-700 mt-1">Redirecting to sign in screen...</p>
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Verification Code</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-center text-lg font-mono tracking-widest text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm"
                    />
                  </div>

                  {error && (
                    <div className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-2.5">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 mt-2"
                  >
                    {loading ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Updating password...</span>
                      </>
                    ) : (
                      <span>Reset Password & Sign In</span>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
