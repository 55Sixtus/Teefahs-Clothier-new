import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  refreshAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export async function verifyServerAdminAccess(user: User | null): Promise<boolean> {
  if (!user) return false;

  const isEmailConfirmed = Boolean(user.email_confirmed_at || (user as any).confirmed_at);
  if (!isEmailConfirmed) {
    return false;
  }

  try {
    const { data, error } = await supabase.rpc('is_admin');
    if (!error && typeof data === 'boolean') {
      return data;
    }
  } catch {
    // fallback only to server-controlled app_metadata (never user_metadata)
  }

  return String(user.app_metadata?.role || '').toLowerCase() === 'admin';
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const verifyCurrentSession = useCallback(async (candidateSession: Session | null): Promise<boolean> => {
    if (!candidateSession?.access_token) {
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      return false;
    }

    try {
      // Server-side JWT validation (detects revoked, expired, or deleted users immediately)
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        await supabase.auth.signOut().catch(() => {});
        setSession(null);
        setUser(null);
        setIsAdmin(false);
        return false;
      }

      const verifiedUser = data.user;
      const adminOk = await verifyServerAdminAccess(verifiedUser);
      setSession(candidateSession);
      setUser(verifiedUser);
      setIsAdmin(adminOk);
      return adminOk;
    } catch {
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      return false;
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    const { data: { session: activeSession } } = await supabase.auth.getSession();
    return verifyCurrentSession(activeSession);
  }, [verifyCurrentSession]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!mounted) return;
      await verifyCurrentSession(initialSession);
      if (mounted) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!mounted) return;
      if (event === 'SIGNED_OUT' || !nextSession) {
        setSession(null);
        setUser(null);
        setIsAdmin(false);
        return;
      }
      await verifyCurrentSession(nextSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [verifyCurrentSession]);

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, loading, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
