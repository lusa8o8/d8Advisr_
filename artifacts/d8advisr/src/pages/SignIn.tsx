import { useEffect, useState, type FormEvent } from 'react';
import { useLocation } from "wouter";
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { authPathWithNext, consumeOAuthError, getPostAuthRedirectPath, getSafeNextPath } from '@/lib/authRedirect';
import { LegalLinks } from '@workspace/d8-core/legal';
import { AuthLayout } from '@workspace/d8-core/ui/auth-layout';

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function SignIn() {
  const [, setLocation] = useLocation();
  const { clearPasswordRecovery, signIn, signInWithGoogle } = useAuth();
  const nextPath = getSafeNextPath();
  const isAdminSignIn = nextPath === '/admin' || nextPath?.startsWith('/admin?') === true;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateAccountPrompt, setShowCreateAccountPrompt] = useState(false);

  useEffect(() => {
    clearPasswordRecovery();
    const oauthError = consumeOAuthError();
    if (oauthError) {
      setError(`Google sign-in could not be completed. ${oauthError}`);
    }
  }, [clearPasswordRecovery]);

  const handleSignIn = async (formEvent?: FormEvent) => {
    formEvent?.preventDefault();
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || !password) { setError('Please enter your email and password.'); return; }
    setLoading(true);
    setError(null);
    setShowCreateAccountPrompt(false);
    const { error } = await signIn(normalizedEmail, password);
    setLoading(false);
    if (error) {
      if (error.message === 'Invalid login credentials') {
        setError(isAdminSignIn
          ? 'We could not sign you in with those admin credentials. Check your password or reset it.'
          : 'We could not sign you in with those details. Check your password, continue with Google, or reset your password.');
        setShowCreateAccountPrompt(true);
      } else {
        setError(error.message);
      }
    } else {
      setLocation(getPostAuthRedirectPath());
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError(null);
    setShowCreateAccountPrompt(false);
    const { error } = await signInWithGoogle(nextPath);
    if (error) { setError(error.message); setGoogleLoading(false); }
  };

  return (
    <AuthLayout>
      <form onSubmit={handleSignIn} className="w-full bg-card rounded-3xl p-8 shadow-sm border border-border mt-4">
        <h1 className="text-2xl font-bold text-foreground mb-2 text-center">Welcome back</h1>
        <p className="text-sm text-muted-foreground text-center mb-8">Sign in to your account</p>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-[#FFF0F1] border border-primary/20 text-primary text-sm font-medium">
            <p>{error}</p>
            {showCreateAccountPrompt && (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {!isAdminSignIn && <>
                  <button
                    type="button"
                    onClick={handleGoogle}
                    disabled={googleLoading}
                    className="text-sm font-semibold underline underline-offset-4 disabled:opacity-60"
                  >
                    Continue with Google
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocation(authPathWithNext('/signup', nextPath))}
                    className="text-sm font-semibold underline underline-offset-4"
                  >
                    Create an account
                  </button>
                </>}
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
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-4 py-3.5 rounded-xl border border-border bg-background focus:bg-card focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-foreground placeholder:text-gray-400"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-muted-foreground">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
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
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-white py-4 rounded-xl font-semibold text-[17px] shadow-[0_8px_20px_-6px_rgba(255,90,95,0.5)] active:scale-[0.98] transition-all mb-6 hover:bg-primary/90 disabled:opacity-60 disabled:scale-100 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 size={18} className="animate-spin" />}
          {loading ? 'Signing in…' : 'Sign In'}
        </button>

        {!isAdminSignIn && <><div className="flex items-center gap-4 mb-6">
          <div className="h-[1px] flex-1 bg-border" />
          <span className="text-sm text-gray-400 font-medium">OR</span>
          <div className="h-[1px] flex-1 bg-border" />
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading}
          className="w-full bg-card text-foreground border-2 border-border py-3.5 rounded-xl font-semibold text-[16px] flex items-center justify-center gap-3 active:scale-[0.98] transition-all hover:bg-gray-50 disabled:opacity-60"
        >
          {googleLoading
            ? <Loader2 size={18} className="animate-spin" />
            : (
              <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )
          }
          {googleLoading ? 'Redirecting…' : 'Continue with Google'}
        </button></>}
      </form>

      {!isAdminSignIn && <div className="mt-8 pb-5">
        <p className="text-muted-foreground font-medium text-[15px]">
          Don't have an account?{' '}
          <button onClick={() => setLocation(authPathWithNext('/signup', nextPath))} className="text-primary font-semibold hover:underline">
            Sign Up
          </button>
        </p>
      </div>}
      <LegalLinks className="pb-4" />
    </AuthLayout>
  );
}
