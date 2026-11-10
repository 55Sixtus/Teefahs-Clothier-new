import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Product } from '../types/product';
import { getPublishedProducts, getAllProducts } from '../lib/api';

interface UseRealtimeProductsOptions {
  includeUnpublished?: boolean;
}

export function useRealtimeProducts(options: UseRealtimeProductsOptions = {}) {
  const { includeUnpublished = false } = options;
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      setError(null);
      const data = includeUnpublished ? await getAllProducts() : await getPublishedProducts();
      setProducts(data);
    } catch (err: any) {
      console.error('Failed to fetch realtime products:', err);
      setError(err?.message || 'Could not load products');
    } finally {
      setLoading(false);
    }
  }, [includeUnpublished]);

  useEffect(() => {
    fetchProducts();

    // 1. Listen for local window broadcast events (same-tab immediate updates)
    const handleLocalUpdate = () => {
      fetchProducts();
    };
    window.addEventListener('teefahs_catalogue_updated', handleLocalUpdate);

    // 2. Setup Supabase Realtime Subscription for cross-device instant sync
    const channelName = `realtime-products-${includeUnpublished ? 'admin' : 'store'}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
        },
        (payload) => {
          console.log('[Supabase Realtime] Product change received:', payload.eventType, payload.new);
          // Always re-fetch authoritative data from Supabase to guarantee relations & calculations
          fetchProducts();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Supabase Realtime] Connected to products channel (${channelName})`);
        }
      });

    return () => {
      window.removeEventListener('teefahs_catalogue_updated', handleLocalUpdate);
      supabase.removeChannel(channel);
    };
  }, [fetchProducts, includeUnpublished]);

  return {
    products,
    loading,
    error,
    refreshProducts: fetchProducts,
  };
}
