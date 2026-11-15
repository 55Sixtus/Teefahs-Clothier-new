import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, ArrowLeft, AlertCircle, CheckCircle, Eye, EyeOff, KeyRound } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ASSETS } from '../data/assets';
import { useAuth, verifyServerAdminAccess } from '../context/AuthContext';
import { logAdminAuditEvent } from '../lib/api';
import SEO from '../components/SEO';

const THROTTLE_STORAGE_KEY = 'teefahs_admin_auth_throttle';
const MAX_FREE_ATTEMPTS = 5;
const BASE_LOCK_SECONDS = 30;
const MAX_LOCK_SECONDS = 300;

interface ThrottleState {
  failures: number;
  lockedUntil: number;
}

function readThrottleState(): ThrottleState {
  try {
    const raw = sessionStorage.getItem(THROTTLE_STORAGE_KEY);
    if (!raw) return { failures: 0, lockedUntil: 0 };
    const parsed = JSON.parse(raw);
    return {
      failures: Number.isFinite(parsed?.failures) ? Math.max(0, parsed.failures) : 0,
      lockedUntil: Number.isFinite(parsed?.lockedUntil) ? Math.max(0, parsed.lockedUntil) : 0,
    };
  } catch {
    return { failures: 0, lockedUntil: 0 };
  }
}

function writeThrottleState(state: ThrottleState): void {
  try {
    sessionStorage.setItem(THROTTLE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage quota errors
  }
}

function clearThrottleState(): void {
  try {
    sessionStorage.removeItem(THROTTLE_STORAGE_KEY);
  } catch {
    // ignore
  }
}

function isStrongPassword(pw: string): boolean {
  if (pw.length < 10) return false;
  const hasUpper = /[A-Z]/.test(pw);
  const hasLower = /[a-z]/.test(pw);
  const hasDigitOrSymbol = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pw);
  return hasUpper && hasLower && hasDigitOrSymbol;
}

export default function AdminLogin() {
  const { user, session, isAdmin, loading: authLoading, refreshAuth } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const recoveryModeRef = useRef(false);
  const [newPassword, setNewPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockSecondsRemaining, setLockSecondsRemaining] = useState(0);
  const navigate = useNavigate();

  const updateRecoveryMode = (val: boolean) => {
    recoveryModeRef.current = val;
    setRecoveryMode(val);
  };

  // Sync throttle lock countdown timer
  useEffect(() => {
    const syncTimer = () => {
      const state = readThrottleState();
      const remaining = Math.max(0, Math.ceil((state.lockedUntil - Date.now()) / 1000));
      setLockSecondsRemaining(remaining);
    };

    syncTimer();
    const interval = setInterval(syncTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  // Detect password-recovery redirect from Supabase Auth email link
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash.includes('type=recovery')) {
      updateRecoveryMode(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        updateRecoveryMode(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Redirect already verified admins straight to dashboard (unless resetting password)
  useEffect(() => {
    if (authLoading) return;
    const isRecoveryHash = typeof window !== 'undefined' && window.location.hash.includes('type=recovery');
    if (session?.access_token && user && isAdmin && !recoveryModeRef.current && !isRecoveryHash) {
      navigate('/admin', { replace: true });
    }
  }, [authLoading, session, user, isAdmin, navigate]);

  const recordAuthFailure = () => {
    const current = readThrottleState();
    const nextFailures = current.failures + 1;
    let lockedUntil = 0;
    if (nextFailures >= MAX_FREE_ATTEMPTS) {
      const exponent = nextFailures - MAX_FREE_ATTEMPTS;
      const lockSeconds = Math.min(MAX_LOCK_SECONDS, BASE_LOCK_SECONDS * Math.pow(2, exponent));
      lockedUntil = Date.now() + lockSeconds * 1000;
      setLockSecondsRemaining(lockSeconds);
    }
    writeThrottleState({ failures: nextFailures, lockedUntil });
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const throttle = readThrottleState();
    if (throttle.lockedUntil > Date.now()) {
      const secs = Math.ceil((throttle.lockedUntil - Date.now()) / 1000);
      setLockSecondsRemaining(secs);
      setErrorMsg(`Too many failed sign-in attempts. Please wait ${secs} seconds before trying again.`);
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg('Please enter a valid administrator email address.');
      return;
    }

    if (!password) {
      setErrorMsg('Password is required.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error || !data.session?.user) {
        recordAuthFailure();
        setErrorMsg('Invalid email or password, or account not authorized.');
        return;
      }

      const { data: verifiedData, error: userErr } = await supabase.auth.getUser();
      const verifiedUser = verifiedData?.user;
      if (userErr || !verifiedUser) {
        await supabase.auth.signOut().catch(() => {});
        recordAuthFailure();
        setErrorMsg('Unable to verify administrator session. Please try again.');
        return;
      }

      const adminOk = await verifyServerAdminAccess(verifiedUser);
      if (!adminOk) {
        await supabase.auth.signOut().catch(() => {});
        recordAuthFailure();
        setErrorMsg('Access denied. This account does not have verified administrator privileges.');
        return;
      }

      clearThrottleState();
      setLockSecondsRemaining(0);
      await refreshAuth();
      await logAdminAuditEvent('admin_login', 'auth', verifiedUser.id, { email: cleanEmail });

      setSuccessMsg('Authenticated with Supabase. Opening dashboard...');
      navigate('/admin', { replace: true });
    } catch {
      recordAuthFailure();
      setErrorMsg('An error occurred during authentication. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/admin/login`,
      });
      // Always show a generic response to prevent account/email enumeration
      setSuccessMsg(
        'If that email corresponds to an authorized administrator account, a password reset link has been dispatched.'
      );
    } catch {
      setErrorMsg('Could not submit password reset request. Please try again shortly.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRecoveredPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!isStrongPassword(newPassword)) {
      setErrorMsg(
        'Password must be at least 10 characters and include uppercase, lowercase, and a number or symbol.'
      );
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setErrorMsg(error.message || 'Failed to update password.');
        return;
      }
      const adminOk = await refreshAuth();
      if (!adminOk) {
        await supabase.auth.signOut().catch(() => {});
        updateRecoveryMode(false);
        setErrorMsg('Password updated, but this account lacks verified admin privileges.');
        return;
      }
      setSuccessMsg('Password updated! Redirecting to dashboard...');
      updateRecoveryMode(false);
      setTimeout(() => navigate('/admin', { replace: true }), 800);
    } catch {
      setErrorMsg('Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col justify-center py-12 px-6 sm:px-8 relative overflow-hidden">
      <SEO title="Admin Sign In" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-gradient-to-b from-emerald-950/40 via-amber-950/20 to-transparent blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <Link to="/" className="inline-block mb-6 group">
          <img
            src={ASSETS.logo}
            alt="Teefahs Clothier"
            className="h-10 w-auto mx-auto invert brightness-200 object-contain group-hover:scale-105 transition-transform"
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.src.endsWith('/logo.png')) {
                target.src = '/logo.png';
              }
            }}
          />
        </Link>
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-emerald-950 via-stone-900 to-emerald-950 text-emerald-400 border border-emerald-700/60 rounded-full text-[11px] font-semibold uppercase tracking-widest mb-3 shadow-lg">
          <Lock size={13} className="text-amber-400" />
          <span>Restricted Admin Portal</span>
        </div>
        <h2 className="text-3xl font-serif text-white tracking-tight">
          {recoveryMode ? 'Set New Password' : resetMode ? 'Reset Admin Password' : 'Admin Sign In'}
        </h2>
        <p className="mt-2 text-xs text-stone-400 font-light">
          {recoveryMode
            ? 'Enter a strong new administrator password (10+ characters, upper/lower, number or symbol).'
            : resetMode
              ? 'We will send a secure Supabase reset link to your registered administrator email.'
              : 'Sign in with your Supabase administrator account to manage inventory, pricing, and products.'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-sm sm:px-10 border border-stone-200">
          {errorMsg && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-800 text-xs rounded flex items-start gap-2.5">
              <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded flex items-start gap-2.5">
              <CheckCircle size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
              <span className="font-medium">{successMsg}</span>
            </div>
          )}

          {recoveryMode ? (
            <form onSubmit={handleUpdateRecoveredPassword} className="space-y-5">
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-stone-700 mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={10}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 10 chars (A-z, 0-9 or symbol)"
                  className="w-full px-3.5 py-3 text-sm bg-white border border-stone-400 rounded-sm focus:outline-none focus:border-stone-900 font-semibold text-stone-900"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-stone-900 text-white text-xs font-semibold uppercase tracking-widest hover:bg-emerald-950 transition-all rounded-sm cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Updating Password...' : 'Save New Password'}
              </button>
            </form>
          ) : resetMode ? (
            <form onSubmit={handlePasswordResetRequest} className="space-y-5">
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-stone-700 mb-1.5">
                  Authorized Admin Email
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your administrator email"
                    className="w-full pl-9 pr-3 py-3 text-sm bg-white border border-stone-400 rounded-sm focus:outline-none focus:border-stone-900 font-semibold text-stone-900"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-stone-900 text-white text-xs font-semibold uppercase tracking-widest hover:bg-emerald-950 transition-all rounded-sm cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Sending Reset Link...' : 'Send Password Reset Email'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setResetMode(false);
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="w-full text-xs text-stone-600 hover:text-stone-900 font-medium text-center cursor-pointer"
              >
                &larr; Back to Sign In
              </button>
            </form>
          ) : (
            <form onSubmit={handleAuth} className="space-y-5">
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-stone-700 mb-1.5">
                  Admin Email Address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your administrator email"
                    className="w-full pl-9 pr-3 py-3 text-sm bg-white border border-stone-400 rounded-sm focus:outline-none focus:border-stone-900 font-semibold text-stone-900 shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs uppercase tracking-wider font-semibold text-stone-700">
                    Admin Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetMode(true);
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 hover:underline cursor-pointer"
                  >
                    Forgot / Reset Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your Supabase password"
                    className="w-full pl-9 pr-10 py-3 text-sm bg-white border border-stone-400 rounded-sm focus:outline-none focus:border-stone-900 font-semibold text-stone-900 shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || lockSecondsRemaining > 0}
                className="w-full py-3 bg-stone-900 text-white text-xs font-semibold uppercase tracking-widest hover:bg-emerald-950 hover:border-emerald-700 transition-all rounded-sm flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
              >
                <KeyRound size={15} className="text-amber-400" />
                <span>
                  {lockSecondsRemaining > 0
                    ? `Sign-In Locked (${lockSecondsRemaining}s)`
                    : loading
                      ? 'Verifying Credentials...'
                      : 'Sign In & Access Dashboard'}
                </span>
              </button>
            </form>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={14} /> Back to Storefront
          </Link>
        </div>
      </div>
    </div>
  );
}
