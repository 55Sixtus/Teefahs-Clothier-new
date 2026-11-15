import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, ArrowLeft, AlertCircle, CheckCircle, Eye, EyeOff, KeyRound } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ASSETS } from '../data/assets';

export const AUTHORIZED_ADMIN_EMAILS = ['queenlateefalive@yahoo.com', 'greatezirim8@gmail.com'];

export function isAuthorizedAdminUser(user: any): boolean {
  if (!user) return false;
  const email = (user.email || '').trim().toLowerCase();
  const appRole = String(user.app_metadata?.role || '').toLowerCase();
  const userRole = String(user.user_metadata?.role || '').toLowerCase();
  return (
    AUTHORIZED_ADMIN_EMAILS.includes(email) ||
    appRole === 'admin' ||
    userRole === 'admin'
  );
}

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Detect password-recovery redirect from Supabase Auth email link
    if (typeof window !== 'undefined' && window.location.hash.includes('type=recovery')) {
      setRecoveryMode(true);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && isAuthorizedAdminUser(session.user) && !window.location.hash.includes('type=recovery')) {
        navigate('/admin', { replace: true });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true);
      } else if (event === 'SIGNED_IN' && session?.user && isAuthorizedAdminUser(session.user) && !recoveryMode) {
        navigate('/admin', { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, recoveryMode]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMsg('Please enter your administrator email address.');
      return;
    }

    if (!password) {
      setErrorMsg('Password is required.');
      return;
    }

    if (!AUTHORIZED_ADMIN_EMAILS.includes(cleanEmail)) {
      setErrorMsg('Access denied. This email is not authorized for administrative access.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        setErrorMsg(error.message || 'Invalid email or password.');
        return;
      }

      if (!data.session?.user || !isAuthorizedAdminUser(data.session.user)) {
        await supabase.auth.signOut();
        setErrorMsg('Your account is not verified for store administration.');
        return;
      }

      setSuccessMsg('Authenticated with Supabase. Opening dashboard...');
      navigate('/admin', { replace: true });
    } catch (err: any) {
      setErrorMsg(err?.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !AUTHORIZED_ADMIN_EMAILS.includes(cleanEmail)) {
      setErrorMsg('Please enter your authorized administrator email address.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/admin/login`,
      });
      if (error) {
        setErrorMsg(error.message);
      } else {
        setSuccessMsg(`Password reset link sent to ${cleanEmail}. Check your inbox and open the link to set a new password.`);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not request password reset.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRecoveredPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (newPassword.length < 8) {
      setErrorMsg('New password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setErrorMsg(error.message);
        return;
      }
      setSuccessMsg('Password updated! Redirecting to dashboard...');
      setRecoveryMode(false);
      setTimeout(() => navigate('/admin', { replace: true }), 800);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col justify-center py-12 px-6 sm:px-8 relative overflow-hidden">
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
            ? 'Enter your new administrator password below.'
            : resetMode
              ? 'We will send a secure Supabase reset link to your authorized admin email.'
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
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
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
                disabled={loading}
                className="w-full py-3 bg-stone-900 text-white text-xs font-semibold uppercase tracking-widest hover:bg-emerald-950 hover:border-emerald-700 transition-all rounded-sm flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
              >
                <KeyRound size={15} className="text-amber-400" />
                <span>{loading ? 'Signing In...' : 'Sign In & Access Dashboard'}</span>
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
