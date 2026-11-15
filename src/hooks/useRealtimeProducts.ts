import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Category, Product } from '../types/product';
import { getPublishedProducts, getAllProducts, getActiveCategories, getAllCategories } from '../lib/api';

interface UseRealtimeProductsOptions {
  includeUnpublished?: boolean;
}

export function useRealtimeProducts(options: UseRealtimeProductsOptions = {}) {
  const { includeUnpublished = false } = options;
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCatalogue = useCallback(async () => {
    try {
      setError(null);
      const [prodsData, catsData] = await Promise.all([
        includeUnpublished ? getAllProducts() : getPublishedProducts(),
        includeUnpublished ? getAllCategories() : getActiveCategories(),
      ]);
      setProducts(prodsData);
      setCategories(catsData);
    } catch (err: any) {
      console.error('Failed to fetch realtime catalogue:', err);
      setError(err?.message || 'Could not load products');
    } finally {
      setLoading(false);
    }
  }, [includeUnpublished]);

  useEffect(() => {
    fetchCatalogue();

    const handleLocalUpdate = () => {
      fetchCatalogue();
    };
    window.addEventListener('teefahs_catalogue_updated', handleLocalUpdate);

    const channelName = `realtime-catalogue-${includeUnpublished ? 'admin' : 'store'}-${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchCatalogue();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_variations' }, () => {
        fetchCatalogue();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_images' }, () => {
        fetchCatalogue();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        fetchCatalogue();
      })
      .subscribe();

    return () => {
      window.removeEventListener('teefahs_catalogue_updated', handleLocalUpdate);
      supabase.removeChannel(channel);
    };
  }, [fetchCatalogue, includeUnpublished]);

  return {
    products,
    categories,
    loading,
    error,
    refreshProducts: fetchCatalogue,
  };
}
