import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  PlusCircle, 
  FolderTree, 
  Boxes, 
  Image as ImageIcon,
  ExternalLink, 
  LogOut, 
  Menu, 
  X,
  Shield,
  Home,
  ArrowLeft,
  Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { ASSETS } from '../data/assets';

export default function AdminLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Validate session token and active expiration
  const isAuthorizedFlag = localStorage.getItem('teefahs_admin_authorized') === 'true';
  const sessionToken = localStorage.getItem('teefahs_admin_session_token');
  const expiresAtStr = localStorage.getItem('teefahs_admin_expires_at');
  const expiresAt = expiresAtStr ? parseInt(expiresAtStr, 10) : 0;
  const isSessionValid = isAuthorizedFlag && !!sessionToken && Date.now() < expiresAt;

  const rawStoredEmail = localStorage.getItem('teefahs_admin_email');
  const adminEmail = (rawStoredEmail && !rawStoredEmail.toLowerCase().includes('greatezirim'))
    ? rawStoredEmail 
    : (user?.email || 'queenlateefalive@yahoo.com');
  const rawRole = localStorage.getItem('teefahs_admin_role') || 'Store Owner';
  const adminRole = rawRole.toLowerCase().includes('temporal') ? 'Store Owner' : rawRole;
  
  // Dashboard is strictly locked: requires a valid, unexpired authenticated session
  const isAuthenticated = isSessionValid;

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      // Clear expired or invalid credentials
      localStorage.removeItem('teefahs_admin_authorized');
      localStorage.removeItem('teefahs_admin_session_token');
      localStorage.removeItem('teefahs_admin_expires_at');
      localStorage.removeItem('teefahs_admin_email');
      localStorage.removeItem('teefahs_admin_role');
      navigate('/admin/login');
    }
  }, [loading, isAuthenticated, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs uppercase tracking-widest text-stone-400">Verifying Admin Access...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect to /admin/login
  }

  const handleLogout = async () => {
    localStorage.removeItem('teefahs_admin_authorized');
    localStorage.removeItem('teefahs_admin_session_token');
    localStorage.removeItem('teefahs_admin_expires_at');
    localStorage.removeItem('teefahs_admin_email');
    localStorage.removeItem('teefahs_admin_role');
    localStorage.removeItem('teefahs_admin_login_at');
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // ignore
    }
    navigate('/admin/login');
  };

  const navItems = [
    { label: 'Overview', to: '/admin', icon: LayoutDashboard, exact: true },
    { label: 'All Products', to: '/admin/products', icon: ShoppingBag },
    { label: 'Add Product', to: '/admin/products/add', icon: PlusCircle },
    { label: 'Categories', to: '/admin/categories', icon: FolderTree },
    { label: 'Inventory', to: '/admin/inventory', icon: Boxes },
    { label: 'Media & Storage', to: '/admin/media', icon: ImageIcon },
  ];

  const isActive = (item: typeof navItems[0]) => {
    if (item.exact) return location.pathname === '/admin';
    return location.pathname.startsWith(item.to);
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col md:flex-row">
      {/* Mobile Top Navigation */}
      <div className="md:hidden bg-stone-900 text-white p-4 flex items-center justify-between border-b border-stone-800 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-emerald-400" />
          <span className="font-serif text-base tracking-wide">Teefahs Admin</span>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            to="/"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-emerald-400 hover:text-emerald-300 text-xs font-semibold rounded-sm border border-stone-700 transition-colors shadow-2xs"
            title="Return to Storefront Home"
          >
            <Home size={14} />
            <span>Home</span>
          </Link>
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="p-1.5 text-stone-300 hover:text-white"
            aria-label="Toggle admin navigation"
          >
            {mobileSidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-stone-950 text-stone-300 p-6 flex flex-col justify-between border-r border-stone-800 transition-transform duration-300 md:translate-x-0 md:static md:h-screen md:sticky md:top-0
        ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div>
          {/* Brand header */}
          <div className="pb-5 mb-5 border-b border-stone-800">
            <Link to="/" className="inline-block mb-3" title="Return to Storefront Home">
              <img 
                src={ASSETS.logo} 
                alt="Teefahs Clothier" 
                className="h-7 w-auto invert brightness-200 object-contain" 
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.src.endsWith('/logo.png')) {
                    target.src = '/logo.png';
                  }
                }}
              />
            </Link>
            <div className="flex items-center gap-2 text-[11px] text-emerald-400 uppercase tracking-widest font-semibold">
              <Shield size={13} />
              <span>Administration</span>
            </div>
          </div>

          {/* Quick Return to Storefront Home Button */}
          <div className="mb-4">
            <Link
              to="/"
              className="flex items-center justify-between w-full px-3.5 py-2.5 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-800/80 text-emerald-300 hover:text-white rounded-sm text-xs font-semibold uppercase tracking-wider transition-all group shadow-2xs"
              title="Return to Storefront Home"
            >
              <span className="flex items-center gap-2.5">
                <Home size={16} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                <span>Return to Store</span>
              </span>
              <ArrowLeft size={14} className="text-emerald-400 group-hover:-translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Nav links */}
          <nav className="space-y-1.5">
            {navItems.map(item => {
              const Icon = item.icon;
              const active = isActive(item);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-sm text-xs font-medium uppercase tracking-wider transition-colors ${
                    active
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-semibold'
                      : 'text-stone-400 hover:bg-stone-900 hover:text-stone-200'
                  }`}
                >
                  <Icon size={16} className={active ? 'text-emerald-400' : 'text-stone-500'} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer actions */}
        <div className="pt-6 border-t border-stone-800 space-y-2.5">
          {/* Active Admin Profile badge */}
          <div className="px-3 py-2 bg-stone-900/90 rounded border border-stone-800 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-400 font-bold text-[10px] uppercase flex-shrink-0">
              {adminEmail.slice(0, 2)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">{adminRole}</span>
              </div>
              <p className="text-[11px] text-stone-300 truncate font-mono" title={adminEmail}>
                {adminEmail}
              </p>
            </div>
          </div>

          <Link
            to="/"
            target="_blank"
            className="flex items-center justify-between px-3.5 py-2 text-xs text-stone-400 hover:text-stone-200 hover:bg-stone-900 rounded-sm transition-colors"
          >
            <span className="flex items-center gap-2">
              <ExternalLink size={14} />
              View Live Storefront
            </span>
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-red-400 hover:bg-red-950/40 hover:text-red-300 rounded-sm transition-colors text-left"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 overflow-x-hidden">
        <div className="max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
