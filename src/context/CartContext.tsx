import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Category, Product } from '../types/product';
import { useRealtimeProducts } from '../hooks/useRealtimeProducts';

export interface CartItem {
  product: Product;
  selectedSize: string;
  selectedColour: string;
  quantity: number;
}

export interface ProductStockInfo {
  hasVariations: boolean;
  maxStock: number;
  isOutOfStock: boolean;
}

interface CartContextType {
  cart: CartItem[];
  categories: Category[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (index: number) => void;
  updateQuantity: (index: number, quantity: number) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);
const CART_STORAGE_KEY = 'teefahs_cart_session_v2';

export function getProductStockInfo(
  product: Product,
  selectedSize?: string,
  selectedColour?: string
): ProductStockInfo {
  const variations = product.variations || [];
  if (variations.length === 0) {
    // Attributes & stock not yet specified by owner — allow customer cart & WhatsApp order
    return { hasVariations: false, maxStock: 20, isOutOfStock: false };
  }

  const totalStock = variations.reduce(
    (sum, v) => sum + Math.max(0, Number(v.stock_quantity) || 0),
    0
  );

  const matchingVar = variations.find(
    v =>
      (!v.size || !selectedSize || v.size === selectedSize) &&
      (!v.colour || !selectedColour || v.colour === selectedColour)
  );

  const maxStock = matchingVar
    ? Math.max(0, Number(matchingVar.stock_quantity) || 0)
    : totalStock;

  return {
    hasVariations: true,
    maxStock,
    isOutOfStock: maxStock <= 0,
  };
}

export function getVariationMaxStock(
  product: Product,
  selectedSize?: string,
  selectedColour?: string
): number {
  return getProductStockInfo(product, selectedSize, selectedColour).maxStock;
}

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { products: liveProducts, categories, loading: liveLoading } = useRealtimeProducts({
    includeUnpublished: false,
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed
            .filter(
              (item: any): item is CartItem =>
                item &&
                item.product &&
                typeof item.product.id === 'string' &&
                item.product.id.length <= 80 &&
                typeof item.product.name === 'string' &&
                typeof item.quantity === 'number' &&
                Number.isFinite(item.quantity) &&
                item.quantity > 0 &&
                Number.isFinite(Number(item.product.base_price ?? 0))
            )
            .map((item) => ({
              ...item,
              selectedSize: String(item.selectedSize || 'Standard').slice(0, 60),
              selectedColour: String(item.selectedColour || 'Original').slice(0, 60),
              quantity: Math.min(50, Math.max(1, Math.round(item.quantity))),
            }));
        }
      }
    } catch {
      // ignore corrupted stored cart
    }
    return [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Persist cart changes
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.error('Failed to save cart:', e);
    }
  }, [cart]);

  // Synchronize stored cart items with authoritative live Supabase prices, stock, and availability
  useEffect(() => {
    if (liveLoading) return;

    setCart(prev => {
      if (prev.length === 0) return prev;

      let changed = false;
      const synced: CartItem[] = [];

      for (const item of prev) {
        const freshProduct = liveProducts.find(p => p.id === item.product.id);
        if (!freshProduct || !freshProduct.is_published || freshProduct.is_archived || freshProduct.deleted_at) {
          changed = true;
          continue;
        }

        const stockInfo = getProductStockInfo(
          freshProduct,
          item.selectedSize,
          item.selectedColour
        );
        if (stockInfo.hasVariations && stockInfo.isOutOfStock) {
          changed = true;
          continue;
        }

        const clampedQty = Math.min(stockInfo.maxStock, Math.max(1, item.quantity));
        const priceChanged =
          Number(freshProduct.base_price) !== Number(item.product.base_price) ||
          Number(freshProduct.sale_price ?? 0) !== Number(item.product.sale_price ?? 0);
        const metaChanged =
          freshProduct.name !== item.product.name ||
          freshProduct.main_image_url !== item.product.main_image_url ||
          freshProduct.updated_at !== item.product.updated_at ||
          clampedQty !== item.quantity;

        if (priceChanged || metaChanged) {
          changed = true;
        }

        synced.push({
          ...item,
          product: freshProduct,
          quantity: clampedQty,
        });
      }

      return changed ? synced : prev;
    });
  }, [liveProducts, liveLoading]);

  const addToCart = (newItem: CartItem) => {
    const freshProduct = liveProducts.find(p => p.id === newItem.product.id) || newItem.product;
    const stockInfo = getProductStockInfo(
      freshProduct,
      newItem.selectedSize,
      newItem.selectedColour
    );

    if (stockInfo.hasVariations && stockInfo.isOutOfStock) {
      return;
    }

    setCart(prev => {
      const existingIndex = prev.findIndex(
        item =>
          item.product.id === freshProduct.id &&
          item.selectedSize === newItem.selectedSize &&
          item.selectedColour === newItem.selectedColour
      );

      if (existingIndex > -1) {
        return prev.map((item, i) => {
          if (i === existingIndex) {
            const merged = Math.min(stockInfo.maxStock, item.quantity + Math.max(1, newItem.quantity));
            return { ...item, product: freshProduct, quantity: merged };
          }
          return item;
        });
      }

      return [
        ...prev,
        {
          ...newItem,
          product: freshProduct,
          quantity: Math.min(stockInfo.maxStock, Math.max(1, newItem.quantity)),
        },
      ];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const updateQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(index);
      return;
    }

    setCart(prev => {
      const next: CartItem[] = [];
      prev.forEach((item, i) => {
        if (i !== index) {
          next.push(item);
          return;
        }
        const stockInfo = getProductStockInfo(
          item.product,
          item.selectedSize,
          item.selectedColour
        );
        if (stockInfo.hasVariations && stockInfo.isOutOfStock) {
          return;
        }
        next.push({ ...item, quantity: Math.min(stockInfo.maxStock, quantity) });
      });
      return next;
    });
  };

  const clearCart = () => setCart([]);
  const toggleCart = () => setIsCartOpen(prev => !prev);
  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  return (
    <CartContext.Provider
      value={{
        cart,
        categories,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        isCartOpen,
        toggleCart,
        openCart,
        closeCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
