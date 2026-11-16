import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://mxovvqjyfgyrzjauzodh.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14b3Z2cWp5Zmd5cnpqYXV6b2RoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyNDU3NzMsImV4cCI6MjEwODgyMTc3M30.GeIqJNntQjs-NQ-1vXCADR1FnoHsmCIbyCVbQTY-mqk';

const env = (import.meta as any).env || {};

const normalizeSupabaseUrl = (raw?: string): string => {
  const candidate = (raw || '').trim();
  if (!candidate) return DEFAULT_SUPABASE_URL;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.origin;
    }
  } catch {
    // Fallback to default project origin if env var is malformed
  }
  return DEFAULT_SUPABASE_URL;
};

const supabaseUrl = normalizeSupabaseUrl(env.VITE_SUPABASE_URL);
const supabaseAnonKey =
  (typeof env.VITE_SUPABASE_ANON_KEY === 'string' && env.VITE_SUPABASE_ANON_KEY.trim()) ||
  DEFAULT_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
