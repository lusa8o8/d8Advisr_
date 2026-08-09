import { useEffect, useState } from 'react';
import { useLocation } from "wouter";
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { authPathWithNext, consumeOAuthError, getPostAuthRedirectPath, getSafeNextPath } from '@/lib/authRedirect';
import { AccountLegalNotice, LegalLinks } from '@workspace/d8-core/legal';
import { AuthLayout } from '@workspace/d8-core/ui/auth-layout';

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isExistingUserError(message: string) {
  return /already registered|already exists|user already/i.test(message);
}

export function SignUp() {
  const [, setLocation] = useLocation();
  const { signUp, signInWithGoogle } = useAuth();
  const nextPath = getSafeNextPath();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExistingAccountPrompt, setShowExistingAccountPrompt] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  useEffect(() => {
    const oauthError = consumeOAuthError();
    if (oauthError) {
      setError(`Google sign-in could not be completed. ${oauthError}`);
    }
  }, []);

  const handleSignUp = async () => {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || !password) { setError('Please fill in all fields.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    setError(null);
    setShowExistingAccountPrompt(false);
    const { error, session } = await signUp(normalizedEmail, password, nextPath);
    setLoading(false);
    if (error) {
      if (isExistingUserError(error.message)) {
        setError('An account already exists for this email. Sign in, or continue with Google if that is how the account was created.');
        setShowExistingAccountPrompt(true);
      } else {
        setError(error.message);
      }
    } else if (session) {
      setLocation(getPostAuthRedirectPath());
    } else {
      setEmail(normalizedEmail);
      setConfirmSent(true);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError(null);
    setShowExistingAccountPrompt(false);
    const { error } = await signInWithGoogle(nextPath);
    if (error) { setError(error.message); setGoogleLoading(false); }
  };

  if (confirmSent) {
    return (
      <AuthLayout>
        <div className="w-full max-w-sm flex flex-col items-center justify-center p-6 mt-12">
          <div className="w-20 h-20 rounded-full bg-[#E8FFF0] flex items-center justify-center mb-6">
            <span className="text-4xl">📬</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3 text-center">Check your email</h1>
          <p className="text-muted-foreground text-center text-[15px] leading-relaxed mb-8 px-4">
            We sent a confirmation link to <span className="font-semibold text-foreground">{email}</span>. Click it to activate your account.
          </p>
          <button
            onClick={() => setLocation(authPathWithNext('/signin', nextPath))}
            className="text-primary font-semibold text-[15px] hover:underline"
          >
            Back to Sign In
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="w-full bg-card rounded-3xl p-8 shadow-sm border border-border mt-4">
        <h1 className="text-2xl font-bold text-foreground mb-8 text-center">Create your account</h1>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-[#FFF0F1] border border-primary/20 text-primary text-sm font-medium">
            <p>{error}</p>
            {showExistingAccountPrompt && (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setLocation(authPathWithNext('/signin', nextPath))}
                  className="text-sm font-semibold underline underline-offset-4"
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={googleLoading}
                  className="text-sm font-semibold underline underline-offset-4 disabled:opacity-60"
                >
                  Continue with Google
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-5 mb-8">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-muted-foreground">Email Address</label>
            <input
              type="email"
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
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Create a password"
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
            <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters</p>
          </div>
        </div>

        <button
          onClick={handleSignUp}
          disabled={loading}
          className="w-full bg-primary text-white py-4 rounded-xl font-semibold text-[17px] shadow-[0_8px_20px_-6px_rgba(255,90,95,0.5)] active:scale-[0.98] transition-all mb-6 hover:bg-primary/90 disabled:opacity-60 disabled:scale-100 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 size={18} className="animate-spin" />}
          {loading ? 'Creating account…' : 'Sign Up'}
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="h-[1px] flex-1 bg-border" />
          <span className="text-sm text-gray-400 font-medium">OR</span>
          <div className="h-[1px] flex-1 bg-border" />
        </div>

        <button
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
        </button>
        <div className="mt-6">
          <AccountLegalNotice />
        </div>
      </div>

      <div className="mt-8 pb-5">
        <p className="text-muted-foreground font-medium text-[15px]">
          Already have an account?{' '}
          <button onClick={() => setLocation(authPathWithNext('/signin', nextPath))} className="text-primary font-semibold hover:underline">
            Sign In
          </button>
        </p>
      </div>
      <LegalLinks className="pb-4" />
    </AuthLayout>
  );
}
