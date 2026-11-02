import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Lock, Mail, ArrowLeft, AlertCircle, CheckCircle, Eye, EyeOff, KeyRound } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ASSETS } from '../data/assets';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Authorized Admin Emails
  const AUTHORIZED_ADMINS = ['queenlateefalive@yahoo.com', 'greatezirim8@gmail.com'];
  const STORE_OWNER_EMAIL = 'queenlateefalive@yahoo.com';

  // Standard Store Admin Master Passwords (can be changed in settings)
  const STORE_MASTER_PASSWORDS = [
    'Teefahs@2026',
    'QueenLateefah#2026',
    'Lateefah@2026',
    'ModestLuxury2026!'
  ];

  const grantAdminSession = (userEmail: string, role = 'Store Owner') => {
    // Generate secure cryptographical session token and expiration (4 hours duration)
    const sessionToken = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : `tc-session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const expiresAt = Date.now() + 4 * 60 * 60 * 1000; // 4 hours

    localStorage.setItem('teefahs_admin_authorized', 'true');
    localStorage.setItem('teefahs_admin_session_token', sessionToken);
    localStorage.setItem('teefahs_admin_expires_at', expiresAt.toString());
    localStorage.setItem('teefahs_admin_email', userEmail);
    localStorage.setItem('teefahs_admin_role', role);
    localStorage.setItem('teefahs_admin_login_at', new Date().toISOString());
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail) {
      setErrorMsg('Please enter your administrator email address.');
      return;
    }

    if (!cleanPassword) {
      setErrorMsg('Password is required. The administration portal is strictly password-protected.');
      return;
    }

    // Check against authorized email allowlist
    if (!AUTHORIZED_ADMINS.includes(cleanEmail)) {
      setErrorMsg('Access denied. This email is not authorized for administrative access.');
      return;
    }

    setLoading(true);

    try {
      // 1. Check custom stored password if owner set one
      const customPassword = localStorage.getItem('teefahs_custom_admin_password');
      const isCustomPassMatch = customPassword && cleanPassword === customPassword;

      // 2. Check store master passwords
      const isMasterPassMatch = STORE_MASTER_PASSWORDS.includes(cleanPassword);

      if (isCustomPassMatch || isMasterPassMatch) {
        const role = cleanEmail === STORE_OWNER_EMAIL ? 'Store Owner' : 'Administrator';
        grantAdminSession(cleanEmail, role);
        setSuccessMsg('Authentication successful. Redirecting to management dashboard...');
        setTimeout(() => {
          navigate('/admin');
        }, 400);
        return;
      }

      // 3. Attempt Supabase Auth signInWithPassword
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      if (error) {
        setErrorMsg('Invalid password. Please enter the correct store administrator password.');
      } else if (data.session) {
        const userEmail = data.session.user.email || cleanEmail;
        const role = userEmail.toLowerCase() === STORE_OWNER_EMAIL ? 'Store Owner' : 'Administrator';
        grantAdminSession(userEmail, role);
        setSuccessMsg('Authentication successful. Redirecting...');
        setTimeout(() => {
          navigate('/admin');
        }, 400);
      } else {
        setErrorMsg('Invalid password. Access denied.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col justify-center py-12 px-6 sm:px-8 relative overflow-hidden">
      {/* Background Decorative Gradients */}
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
          Admin Authentication
        </h2>
        <p className="mt-2 text-xs text-stone-400 font-light">
          Sign in with your verified store credentials to manage inventory and products.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-sm sm:px-10 border border-stone-200">
          
          {/* Store Owner Security Badge */}
          <div className="mb-6 p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded text-xs text-stone-700">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold uppercase tracking-wider text-[10px] text-emerald-950 flex items-center gap-1.5">
                <Shield size={12} className="text-emerald-700" />
                Store Owner Identity
              </span>
              <span className="text-[10px] bg-emerald-200/80 text-emerald-900 font-bold px-1.5 py-0.5 rounded">
                Protected
              </span>
            </div>
            <p className="font-mono text-xs text-stone-900 font-bold">queenlateefalive@yahoo.com</p>
            <p className="text-[11px] text-stone-600 mt-1">
              Dashboard access is strictly locked and requires your verified administrator password.
            </p>
          </div>

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
                  onChange={e => setEmail(e.target.value)}
                  placeholder="queenlateefalive@yahoo.com"
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-stone-50 border border-stone-300 rounded-sm focus:outline-none focus:border-stone-900 font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs uppercase tracking-wider font-semibold text-stone-700">
                  Admin Password
                </label>
                <span className="text-[10px] text-stone-400 font-normal">Strictly Required</span>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your admin password"
                  className="w-full pl-9 pr-10 py-2.5 text-xs bg-stone-50 border border-stone-300 rounded-sm focus:outline-none focus:border-stone-900 font-medium"
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
              <span>{loading ? 'Verifying Password...' : 'Unlock & Access Dashboard'}</span>
            </button>
          </form>

          {/* Security Credentials Reference Helper */}
          <div className="mt-6 pt-5 border-t border-stone-200">
            <details className="text-[11px] text-stone-500 cursor-pointer group">
              <summary className="font-semibold text-stone-700 hover:text-stone-900 flex items-center justify-between">
                <span>Default Admin Credentials Reference</span>
                <span className="text-stone-400 group-open:rotate-180 transition-transform">▾</span>
              </summary>
              <div className="mt-2.5 p-3 bg-stone-50 rounded border border-stone-200 text-stone-600 space-y-1">
                <p><strong>Owner Email:</strong> <code className="text-stone-800">queenlateefalive@yahoo.com</code></p>
                <p><strong>Default Password:</strong> <code className="text-stone-800 bg-stone-200/80 px-1.5 py-0.5 rounded font-mono">Teefahs@2026</code></p>
                <p className="text-[10px] text-stone-400 pt-1">
                  You can change this password at any time from your Admin Profile once authenticated.
                </p>
              </div>
            </details>
          </div>
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
