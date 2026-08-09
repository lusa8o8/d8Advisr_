import { useEffect, useState } from 'react';
import { useLocation } from "wouter";
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@workspace/d8-core/auth';
import { authPathWithNext, consumeOAuthError, getSafeNextPath } from '@workspace/d8-core/auth-redirect';
import { LegalLinks } from '@workspace/d8-core/legal';

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function SignIn() {
  const [, setLocation] = useLocation();
  const { clearPasswordRecovery, signIn } = useAuth();
  const nextPath = getSafeNextPath() ?? '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateAccountPrompt, setShowCreateAccountPrompt] = useState(false);

  useEffect(() => {
    clearPasswordRecovery();
  }, [clearPasswordRecovery]);

  const handleSignIn = async () => {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || !password) { setError('Please enter your email and password.'); return; }
    setLoading(true);
    setError(null);
    setShowCreateAccountPrompt(false);
    const { error } = await signIn(normalizedEmail, password);
    setLoading(false);
    if (error) {
      if (error.message === 'Invalid login credentials') {
        setError('We could not sign you in with those details. Check your password or reset your password.');
        setShowCreateAccountPrompt(true);
      } else {
        setError(error.message);
      }
    } else {
      setLocation(nextPath);
    }
  };

  return (
    <div className="flex-1 min-h-0 bg-background flex flex-col items-center p-6 relative overflow-y-auto no-scrollbar">
      <div className="w-full flex justify-center mt-12 mb-8 cursor-pointer" onClick={() => setLocation('/')}>
        <div className="flex items-baseline">
          <span className="font-bold text-3xl text-primary tracking-tight">D8</span>
          <span className="font-bold text-3xl text-foreground tracking-tight">Advisr</span>
        </div>
      </div>

      <div className="w-full bg-card rounded-3xl p-8 shadow-sm border border-border">
        <h1 className="text-2xl font-bold text-foreground mb-2 text-center">Welcome back</h1>
        <p className="text-sm text-muted-foreground text-center mb-8">Sign in to your account</p>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-[#FFF0F1] border border-primary/20 text-primary text-sm font-medium">
            <p>{error}</p>
            {showCreateAccountPrompt && (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setLocation(authPathWithNext('/signup', nextPath))}
                  className="text-sm font-semibold underline underline-offset-4"
                >
                  Create an account
                </button>
                <button
                  type="button"
                  onClick={() => setLocation('/password/reset')}
                  className="text-sm font-semibold underline underline-offset-4"
                >
                  Reset password
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-5 mb-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-muted-foreground">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSignIn()}
              placeholder="name@example.com"
              className="w-full px-4 py-3.5 rounded-xl border border-border bg-background focus:bg-card focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-foreground placeholder:text-gray-400"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-muted-foreground">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSignIn()}
                placeholder="Your password"
                className="w-full pl-4 pr-12 py-3.5 rounded-xl border border-border bg-background focus:bg-card focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-foreground placeholder:text-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-muted-foreground"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setLocation('/password/reset')}
              className="self-end text-xs font-semibold text-primary hover:underline"
            >
              Forgot password?
            </button>
          </div>
        </div>

        <button
          onClick={handleSignIn}
          disabled={loading}
          className="w-full bg-primary text-white py-4 rounded-xl font-semibold text-[17px] shadow-[0_8px_20px_-6px_rgba(255,90,95,0.5)] active:scale-[0.98] transition-all mb-6 hover:bg-primary/90 disabled:opacity-60 disabled:scale-100 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 size={18} className="animate-spin" />}
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </div>

      <div className="mt-8 pb-5">
        <p className="text-muted-foreground font-medium text-[15px]">
          Don't have an account?{' '}
          <button onClick={() => setLocation(authPathWithNext('/signup', nextPath))} className="text-primary font-semibold hover:underline">
            Sign Up
          </button>
        </p>
      </div>
      <LegalLinks className="pb-10" />
    </div>
  );
}
