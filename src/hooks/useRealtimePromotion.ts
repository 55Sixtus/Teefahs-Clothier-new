import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Promotion } from '../types/product';
import { getActivePromotion } from '../lib/api';

export function useRealtimePromotion() {
  const [promotion, setPromotion] = useState<Promotion>({
    title: 'Special Season Offer',
    message: 'Enjoy 10% OFF automatically applied on all luxury abayas & modest dresses!',
    badge_text: 'Special Season Offer',
    subtext: 'Luxurious Modest Couture • Express Delivery Across Nigeria',
    link_url: '/shop',
    is_active: true,
  });
  const [loading, setLoading] = useState(true);

  const fetchPromo = useCallback(async () => {
    try {
      const data = await getActivePromotion();
      if (data) {
        setPromotion(data);
      }
    } catch (e) {
      console.warn('Using default promo:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPromo();

    // Listen to local window event
    const handleLocal = () => fetchPromo();
    window.addEventListener('teefahs_promo_updated', handleLocal);

    // Setup Supabase Realtime Subscription for promotions table
    const channelName = `realtime-promotions-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'promotions',
        },
        () => {
          fetchPromo();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('teefahs_promo_updated', handleLocal);
      supabase.removeChannel(channel);
    };
  }, [fetchPromo]);

  return { promotion, loading, refreshPromotion: fetchPromo };
}
