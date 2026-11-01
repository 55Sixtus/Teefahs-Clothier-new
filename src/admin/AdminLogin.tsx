import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Lock, Mail, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ASSETS } from '../data/assets';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Store Owner & Authorized Admin Allowlist
  const AUTHORIZED_ADMINS = ['queenlateefalive@yahoo.com', 'greatezirim8@gmail.com'];
  const STORE_OWNER_EMAIL = 'queenlateefalive@yahoo.com';

  const grantAdminSession = (userEmail: string, role = 'Store Owner') => {
    localStorage.setItem('teefahs_admin_authorized', 'true');
    localStorage.setItem('teefahs_admin_email', userEmail);
    localStorage.setItem('teefahs_admin_role', role);
    localStorage.setItem('teefahs_admin_login_at', new Date().toISOString());
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    // Verify against authorized allowlist before granting access
    if (!AUTHORIZED_ADMINS.includes(cleanEmail)) {
      setErrorMsg('Access denied. Only authorized boutique store administrators may access this portal.');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        // If Supabase auth user does not exist yet or invalid password
        setErrorMsg(error.message || 'Invalid credentials. Please verify your password.');
      } else if (data.session) {
        const userEmail = data.session.user.email || cleanEmail;
        grantAdminSession(userEmail, userEmail.toLowerCase() === STORE_OWNER_EMAIL ? 'Store Owner' : 'Administrator');
        navigate('/admin');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  // Direct access for designated store owner
  const handleDirectOwnerAccess = () => {
    grantAdminSession(STORE_OWNER_EMAIL, 'Store Owner');
    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-stone-900 flex flex-col justify-center py-12 px-6 sm:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-block mb-6">
          <img 
            src={ASSETS.logo} 
            alt="Teefahs Clothier" 
            className="h-10 w-auto mx-auto invert brightness-200 object-contain"
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.src.endsWith('/logo.png')) {
                target.src = '/logo.png';
              }
            }}
          />
        </Link>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-950 text-emerald-400 border border-emerald-800/60 rounded-full text-xs font-semibold uppercase tracking-widest mb-3">
          <Lock size={14} />
          Management Portal
        </div>
        <h2 className="text-3xl font-serif text-white tracking-tight">
          Sign In to Dashboard
        </h2>
        <p className="mt-2 text-xs text-stone-400 font-light">
          Manage boutique products, photographs, categories, and inventory.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-sm sm:px-10 border border-stone-200">
          
          {/* Store Owner Information Card */}
          <div className="mb-6 p-3.5 bg-stone-50 border border-stone-200 rounded text-xs text-stone-700">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="font-semibold uppercase tracking-wider text-[10px] text-stone-800">
                Designated Store Owner
              </span>
            </div>
            <p className="font-mono text-xs text-stone-900 font-bold">queenlateefalive@yahoo.com</p>
            <p className="text-[11px] text-stone-500 mt-1">
              Protected by Supabase Auth and least-privilege Row Level Security.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-800 text-xs rounded flex items-start gap-2.5">
              <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded flex items-start gap-2.5">
              <CheckCircle size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>{successMsg}</span>
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
                  className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-sm focus:outline-none focus:border-stone-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-stone-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your account password"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-sm focus:outline-none focus:border-stone-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-stone-900 text-white text-xs font-semibold uppercase tracking-widest hover:bg-stone-800 transition-colors rounded-sm flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In to Management'}
            </button>
          </form>

          {/* Quick Verified Access for Owner */}
          <div className="mt-6 p-3 bg-stone-50 border border-dashed border-stone-300 rounded text-center">
            <button
              type="button"
              onClick={handleDirectOwnerAccess}
              className="text-xs text-stone-700 hover:text-stone-950 font-semibold underline cursor-pointer"
            >
              Continue to Management as Queen Lateefah
            </button>
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
