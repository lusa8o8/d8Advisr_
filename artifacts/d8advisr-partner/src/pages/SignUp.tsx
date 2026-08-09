import { useEffect, useState } from 'react';
import { useLocation } from "wouter";
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@workspace/d8-core/auth';
import { authPathWithNext, consumeOAuthError, getSafeNextPath } from '@workspace/d8-core/auth-redirect';
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
  const { signUp } = useAuth();
  const nextPath = getSafeNextPath() ?? '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
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
      setLocation(nextPath);
    } else {
      setEmail(normalizedEmail);
      setConfirmSent(true);
    }
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
