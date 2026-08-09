import { useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@workspace/d8-core/auth';
import { AuthLayout } from '@workspace/d8-core/ui/auth-layout';

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function PasswordResetRequest() {
  const [, setLocation] = useLocation();
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      setError('Enter the email address on your account.');
      return;
    }

    setLoading(true);
    setError(null);
    const { error } = await sendPasswordReset(normalizedEmail);
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSent(true);
  };

  return (
    <AuthLayout>
      <div className="w-full bg-card rounded-3xl p-8 shadow-sm border border-border mt-4">
        <div className="flex items-center mb-6">
          <button
            type="button"
            onClick={() => setLocation('/signin')}
            className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center text-foreground mr-4"
            aria-label="Back to sign in"
          >
            <ArrowLeft size={19} />
          </button>
          <h1 className="text-2xl font-bold text-foreground">Reset password</h1>
        </div>
        <p className="text-sm text-muted-foreground text-center mb-8">
          Enter your email and we will send a secure reset link.
        </p>

        {sent ? (
          <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            If an account exists for this email, we will send a password reset link.
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-5 p-3.5 rounded-xl bg-[#FFF0F1] border border-primary/20 text-primary text-sm font-medium">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-2 mb-6">
              <label className="text-sm font-medium text-muted-foreground">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="name@example.com"
                className="w-full px-4 py-3.5 rounded-xl border border-border bg-background focus:bg-card focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-foreground placeholder:text-gray-400"
              />
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-primary text-white py-4 rounded-xl font-semibold text-[17px] shadow-[0_8px_20px_-6px_rgba(255,90,95,0.5)] active:scale-[0.98] transition-all hover:bg-primary/90 disabled:opacity-60 disabled:scale-100 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? 'Sending link...' : 'Send reset link'}
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => setLocation('/signin')}
          className="w-full mt-5 text-sm font-semibold text-primary hover:underline"
        >
          Back to sign in
        </button>
      </div>
    </AuthLayout>
  );
}
