import { createClient } from '@supabase/supabase-js';

// Hardcoded Supabase credentials to bypass environment limitations
const supabaseUrl = 'https://mxovvqjyfgyrzjauzodh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14b3Z2cWp5Zmd5cnpqYXV6b2RoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyNDU3NzMsImV4cCI6MjEwODgyMTc3M30.GeIqJNntQjs-NQ-1vXCADR1FnoHsmCIbyCVbQTY-mqk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
