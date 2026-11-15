import { createClient } from '@supabase/supabase-js';

const env = (import.meta as any).env || {};
const supabaseUrl = env.VITE_SUPABASE_URL || 'https://mxovvqjyfgyrzjauzodh.supabase.co';
const supabaseAnonKey =
  env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14b3Z2cWp5Zmd5cnpqYXV6b2RoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyNDU3NzMsImV4cCI6MjEwODgyMTc3M30.GeIqJNntQjs-NQ-1vXCADR1FnoHsmCIbyCVbQTY-mqk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
