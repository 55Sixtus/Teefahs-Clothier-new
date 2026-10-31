import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product } from '../types/product';

export interface CartItem {
  product: Product;
  selectedSize: string;
  selectedColour: string;
  quantity: number;
}

interface CartContextType {
  cart: CartItem[];
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

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (item: any): item is CartItem =>
              item &&
              item.product &&
              typeof item.product.id === 'string' &&
              typeof item.quantity === 'number' &&
              item.quantity > 0 &&
              !isNaN(item.product.base_price || 0)
          );
        }
      }
    } catch (e) {
      console.error('Failed to parse stored cart:', e);
    }
    return [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.error('Failed to save cart:', e);
    }
  }, [cart]);

  const addToCart = (newItem: CartItem) => {
    setCart(prev => {
      const existingIndex = prev.findIndex(
        item =>
          item.product.id === newItem.product.id &&
          item.selectedSize === newItem.selectedSize &&
          item.selectedColour === newItem.selectedColour
      );

      // Determine stock limit
      const matchingVar = newItem.product.variations?.find(
        v =>
          (!v.size || v.size === newItem.selectedSize) &&
          (!v.colour || v.colour === newItem.selectedColour)
      );
      const maxStock = matchingVar?.stock_quantity ?? 50;

      if (existingIndex > -1) {
        return prev.map((item, i) => {
          if (i === existingIndex) {
            const merged = Math.min(maxStock, item.quantity + newItem.quantity);
            return { ...item, quantity: merged };
          }
          return item;
        });
      }

      return [...prev, { ...newItem, quantity: Math.min(maxStock, newItem.quantity) }];
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

    setCart(prev =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const matchingVar = item.product.variations?.find(
          v =>
            (!v.size || v.size === item.selectedSize) &&
            (!v.colour || v.colour === item.selectedColour)
        );
        const maxStock = matchingVar?.stock_quantity ?? 50;
        return { ...item, quantity: Math.min(maxStock, quantity) };
      })
    );
  };

  const clearCart = () => setCart([]);
  const toggleCart = () => setIsCartOpen(prev => !prev);
  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  return (
    <CartContext.Provider
      value={{
        cart,
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
