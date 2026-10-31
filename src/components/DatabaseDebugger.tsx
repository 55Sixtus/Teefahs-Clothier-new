import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function DatabaseDebugger() {
  useEffect(() => {
    const check = async () => {
      console.log('Testing Supabase connection...');
      console.log('Using URL:', import.meta.env.VITE_SUPABASE_URL);
      try {
        const { count, error } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.error('Supabase Query Error:', error);
        } else {
          console.log('Supabase Connection Successful! Product count:', count);
        }
      } catch (err) {
        console.error('Supabase Connection Exception:', err);
      }
    };
    check();
  }, []);

  return null;
}
