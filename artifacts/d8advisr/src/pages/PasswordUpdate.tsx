import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

const PASSWORD_RECOVERY_REQUESTED_KEY = 'd8advisr_password_recovery_requested';

export function PasswordUpdate() {
  const [, setLocation] = useLocation();
  const {
    session,
    loading: authLoading,
    isPasswordRecovery,
    markPasswordRecovery,
    clearPasswordRecovery,
    updatePassword,
  } = useAuth();
  const exchangedCodeRef = useRef<string | null>(null);
  const [isRecoveryFlow, setIsRecoveryFlow] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return Boolean(
      params.get('code')
      || sessionStorage.getItem(PASSWORD_RECOVERY_REQUESTED_KEY)
      || isPasswordRecovery,
    );
  });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (session?.user) {
      setLinkLoading(false);
      return;
    }
    if (!code || exchangedCodeRef.current === code) return;

    let active = true;
    exchangedCodeRef.current = code;
    setIsRecoveryFlow(true);
    markPasswordRecovery();
    setLinkLoading(true);
    setError(null);

    void supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (!active) return;
      setLinkLoading(false);

      if (error) {
        clearPasswordRecovery();
        setError('This reset link is no longer active. Request a new password reset link and use the latest email from D8Advisr.');
        return;
      }

      window.history.replaceState(null, '', `${import.meta.env.BASE_URL.replace(/\/$/, '')}/password/update`);
    });

    return () => { active = false; };
  }, [session?.user]);

  useEffect(() => {
    if (isRecoveryFlow && session?.user && !isPasswordRecovery && !saved) {
      markPasswordRecovery();
    }
  }, [isPasswordRecovery, isRecoveryFlow, markPasswordRecovery, saved, session?.user]);

  const handleSubmit = async () => {
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);
    const { error } = await updatePassword(password);
    if (!error && isRecoveryFlow) {
      clearPasswordRecovery();
      await supabase.auth.signOut();
    }
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSaved(true);
    setPassword('');
    setConfirmPassword('');
  };

  const hasSession = Boolean(session?.user);
  const checkingResetLink = (authLoading || linkLoading) && !hasSession && !saved;

  return (
    <div className="flex-1 min-h-0 bg-background flex flex-col items-center p-6 relative overflow-y-auto no-scrollbar">
      <div className="w-full flex items-center justify-between mt-8 mb-8">
        <button
          type="button"
          onClick={() => setLocation(isRecoveryFlow ? '/signin' : '/settings')}
          className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-foreground"
          aria-label={isRecoveryFlow ? 'Back to sign in' : 'Back to settings'}
        >
          <ArrowLeft size={19} />
        </button>
        <button
          type="button"
          onClick={() => setLocation(isRecoveryFlow ? '/signin' : '/home')}
          className="flex items-baseline"
        >
          <span className="font-bold text-2xl text-primary tracking-tight">D8</span>
          <span className="font-bold text-2xl text-foreground tracking-tight">Advisr</span>
        </button>
        <div className="w-10" />
      </div>

      <div className="w-full bg-card rounded-3xl p-8 shadow-sm border border-border">
        <h1 className="text-2xl font-bold text-foreground mb-2 text-center">Change password</h1>
        <p className="text-sm text-muted-foreground text-center mb-8">
          {isRecoveryFlow ? 'Set a new password, then sign in again.' : 'Use this password to sign in with email next time.'}
        </p>

        {checkingResetLink && (
          <div className="mb-5 rounded-2xl border border-border bg-background p-4 text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 size={17} className="animate-spin" />
            Checking reset link...
          </div>
        )}

        {!authLoading && !linkLoading && !hasSession && !saved && (
          <div className="mb-5 rounded-2xl border border-primary/20 bg-[#FFF0F1] p-4 text-sm text-primary">
            <p className="font-semibold mb-1">This reset link is no longer active.</p>
            <p className="mb-4 text-primary/80">Request a new password reset link and use the latest email from D8Advisr.</p>
            <button
              type="button"
              onClick={() => setLocation('/password/reset')}
              className="font-bold underline underline-offset-4"
            >
              Request a new link
            </button>
          </div>
        )}

        {saved && (
          <div className="mb-5 rounded-2xl border border-emerald-500/20 bg-emerald-50 p-4 text-sm text-emerald-700">
            Password updated. You can now sign in with email and password.
          </div>
        )}

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-[#FFF0F1] border border-primary/20 text-primary text-sm font-medium">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-5 mb-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-muted-foreground">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full pl-4 pr-12 py-3.5 rounded-xl border border-border bg-background focus:bg-card focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-foreground placeholder:text-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-muted-foreground"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-muted-foreground">Confirm Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="Repeat your new password"
              className="w-full px-4 py-3.5 rounded-xl border border-border bg-background focus:bg-card focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-foreground placeholder:text-gray-400"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || authLoading || linkLoading || !hasSession || saved}
          className="w-full bg-primary text-white py-4 rounded-xl font-semibold text-[17px] shadow-[0_8px_20px_-6px_rgba(255,90,95,0.5)] active:scale-[0.98] transition-all hover:bg-primary/90 disabled:opacity-60 disabled:scale-100 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 size={18} className="animate-spin" />}
          {loading ? 'Updating password...' : 'Update password'}
        </button>

        {saved && isRecoveryFlow && (
          <button
            type="button"
            onClick={() => setLocation('/signin')}
            className="mt-4 w-full border border-border bg-background text-foreground py-4 rounded-xl font-semibold text-[17px] active:scale-[0.98] transition-all hover:bg-card"
          >
            Sign in
          </button>
        )}
      </div>
    </div>
  );
}
