import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  ShoppingBag, 
  Plus, 
  Minus, 
  Trash2, 
  ArrowRight, 
  ShieldCheck, 
  MessageCircle,
  MapPin,
  User,
  Phone,
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { getActiveWhatsAppChatNumber } from '../config/shopConfig';

export default function CartDrawer() {
  const { cart, isCartOpen, closeCart, removeFromCart, updateQuantity, clearCart } = useCart();
  const navigate = useNavigate();

  const [customerName, setCustomerName] = useState(() => {
    try {
      return localStorage.getItem('teefahs_customer_name') || '';
    } catch {
      return '';
    }
  });

  const [customerPhone, setCustomerPhone] = useState(() => {
    try {
      return localStorage.getItem('teefahs_customer_phone') || '';
    } catch {
      return '';
    }
  });

  const [deliveryAddress, setDeliveryAddress] = useState(() => {
    try {
      return localStorage.getItem('teefahs_customer_address') || '';
    } catch {
      return '';
    }
  });

  const [showDetailsSection, setShowDetailsSection] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Sync customer details to localStorage for convenience
  useEffect(() => {
    try {
      localStorage.setItem('teefahs_customer_name', customerName);
    } catch {
      // ignore
    }
  }, [customerName]);

  useEffect(() => {
    try {
      localStorage.setItem('teefahs_customer_phone', customerPhone);
    } catch {
      // ignore
    }
  }, [customerPhone]);

  useEffect(() => {
    try {
      localStorage.setItem('teefahs_customer_address', deliveryAddress);
    } catch {
      // ignore
    }
  }, [deliveryAddress]);

  // Lock background scroll when drawer is open & handle Escape key
  useEffect(() => {
    if (!isCartOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeCart();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCartOpen, closeCart]);

  const subtotal = cart.reduce((sum, item) => sum + (item.product.base_price || 0) * item.quantity, 0);
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Generate structured, polite WhatsApp checkout order text
  const generateWhatsAppMessage = () => {
    const lines = [
      'Assalamu Alaikum! I would like to place an order from Teefahs Clothier:',
      '',
      '*ORDER SUMMARY*',
      '----------------------------------------',
      ...cart.map((item, idx) => {
        const unit = item.product.base_price || 0;
        const lineTotal = unit * item.quantity;
        return `${idx + 1}. *${item.product.name}*\n   - Size: ${item.selectedSize || 'Standard'}\n   - Colour: ${item.selectedColour || 'Original'}\n   - Qty: ${item.quantity} × ₦${unit.toLocaleString()} = ₦${lineTotal.toLocaleString()}`;
      }),
      '----------------------------------------',
      `*ORDER SUBTOTAL (${totalItemCount} ${totalItemCount === 1 ? 'item' : 'items'}): ₦${subtotal.toLocaleString()}*`,
      '',
      '*CUSTOMER & DELIVERY DETAILS:*',
      `- Full Name: ${customerName.trim() || 'Awaiting customer entry'}`,
      `- Phone / WhatsApp: ${customerPhone.trim() || 'Awaiting customer entry'}`,
      `- Delivery Address: ${deliveryAddress.trim() || 'Lagos / Nigeria Delivery (Please confirm destination)'}`,
      '',
      'Please confirm garment availability, dispatch timeframe, and payment/bank transfer details. Thank you!'
    ];

    return encodeURIComponent(lines.join('\n'));
  };

  const handleContinueShopping = () => {
    closeCart();
  };

  const handleEmptyCartExplore = () => {
    closeCart();
    navigate('/shop');
  };

  if (!isCartOpen) return null;

  const chatNumber = getActiveWhatsAppChatNumber();
  const whatsappCheckoutUrl = `https://wa.me/${chatNumber}?text=${generateWhatsAppMessage()}`;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end animate-fade-in" role="dialog" aria-modal="true" aria-label="Shopping Bag">
      {/* Semi-transparent Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 cursor-pointer"
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div className="relative w-full max-w-md sm:max-w-lg bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xl flex flex-col h-full z-10 border-l border-stone-200 dark:border-stone-800 transition-colors duration-300">
        
        {/* 1. DRAWER HEADER */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-850 flex items-center justify-between bg-stone-50/90 dark:bg-stone-950/90 backdrop-blur-xs sticky top-0 z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-950 text-emerald-400 flex items-center justify-center border border-emerald-800/50">
              <ShoppingBag size={16} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-serif text-stone-900 dark:text-white tracking-wide font-medium flex items-center gap-2">
                Shopping Bag
                <span className="text-xs font-sans font-semibold px-2 py-0.5 bg-stone-200/80 dark:bg-stone-800 text-stone-800 dark:text-stone-200 rounded-full">
                  {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
                </span>
              </h2>
            </div>
          </div>
          <button 
            type="button"
            onClick={closeCart} 
            className="p-2 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-stone-800 rounded-full transition-colors cursor-pointer"
            aria-label="Close shopping bag"
            title="Close shopping bag"
          >
            <X size={20} />
          </button>
        </div>

        {/* 2. DRAWER CONTENT AREA (Scrollable) */}
        <div className="flex-1 overflow-y-auto divide-y divide-stone-100 p-4 sm:p-6 overscroll-contain">
          
          {/* EMPTY STATE */}
          {cart.length === 0 ? (
            <div className="text-center py-16 sm:py-24 px-4 flex flex-col items-center justify-center h-full">
              <div className="w-20 h-20 mb-5 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400">
                <ShoppingBag size={34} className="stroke-[1.5]" />
              </div>
              <h3 className="font-serif text-xl text-stone-900 mb-2 font-medium">Your shopping bag is empty</h3>
              <p className="text-xs text-stone-500 mb-8 max-w-xs mx-auto leading-relaxed font-light">
                Explore our curated collection of modest luxury abayas, coordinating khimars, prayer dresses, and lightweight chiffon veils.
              </p>
              <button 
                type="button"
                onClick={handleEmptyCartExplore} 
                className="w-full max-w-xs py-3.5 bg-stone-900 text-white text-xs uppercase tracking-widest font-semibold hover:bg-emerald-900 transition-colors shadow-sm rounded-xs cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Continue Shopping</span>
                <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <>
              {/* PRODUCT LIST */}
              <div className="space-y-4 pb-4">
                {cart.map((item, index) => {
                  const matchingVar = item.product.variations?.find(
                    v => (!v.size || v.size === item.selectedSize) && (!v.colour || v.colour === item.selectedColour)
                  );
                  const maxStock = matchingVar?.stock_quantity ?? 50;
                  const isMax = item.quantity >= maxStock;
                  const unitPrice = item.product.base_price || 0;
                  const lineTotal = unitPrice * item.quantity;
                  const itemImg = item.product.main_image_url || item.product.images?.[0]?.image_url || 'https://placehold.co/400x500?text=Garment';

                  return (
                    <div 
                      key={`${item.product.id}-${item.selectedSize}-${item.selectedColour}-${index}`} 
                      className="p-3.5 bg-stone-50/70 dark:bg-stone-850/80 border border-stone-200/80 dark:border-stone-800 rounded-sm flex gap-3.5 hover:border-stone-300 dark:hover:border-stone-700 transition-colors"
                    >
                      {/* Product Thumbnail */}
                      <div className="w-20 h-24 sm:w-22 sm:h-28 bg-stone-200 dark:bg-stone-800 flex-shrink-0 overflow-hidden rounded-xs border border-stone-200 dark:border-stone-750">
                        <img 
                          src={itemImg} 
                          alt={item.product.name} 
                          className="w-full h-full object-cover object-top" 
                          loading="lazy"
                        />
                      </div>

                      {/* Item Details */}
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="text-xs sm:text-sm font-semibold text-stone-900 dark:text-stone-100 truncate" title={item.product.name}>
                              {item.product.name}
                            </h4>
                            <button 
                              type="button"
                              onClick={() => removeFromCart(index)} 
                              className="text-stone-400 hover:text-red-500 transition-colors p-1 -mt-1 -mr-1 cursor-pointer"
                              title="Remove item"
                              aria-label={`Remove ${item.product.name} from bag`}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-stone-600 dark:text-stone-400 mt-1">
                            <span>Size: <strong className="text-stone-800 dark:text-stone-200">{item.selectedSize || 'Standard'}</strong></span>
                            <span>&bull;</span>
                            <span>Colour: <strong className="text-stone-800 dark:text-stone-200">{item.selectedColour || 'Original'}</strong></span>
                          </div>

                          <div className="text-xs font-semibold text-emerald-950 dark:text-amber-300 mt-1">
                            ₦{unitPrice.toLocaleString()} <span className="text-[10px] text-stone-400 font-normal">each</span>
                          </div>
                        </div>

                        {/* Quantity Controls & Line Total */}
                        <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-stone-200/60 dark:border-stone-800">
                          {/* Plus/Minus Quantity Button Group */}
                          <div className="flex items-center border border-stone-300 dark:border-stone-700 rounded-xs bg-white dark:bg-stone-800 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => updateQuantity(index, item.quantity - 1)}
                              className="p-1.5 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 hover:text-stone-900 active:bg-stone-200 transition-colors cursor-pointer"
                              title="Decrease quantity"
                              aria-label="Decrease quantity"
                            >
                              <Minus size={13} />
                            </button>
                            <span className="px-3 text-xs font-semibold text-stone-900 dark:text-stone-100 select-none min-w-[28px] text-center">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              disabled={isMax}
                              onClick={() => updateQuantity(index, item.quantity + 1)}
                              className={`p-1.5 transition-colors ${
                                isMax 
                                  ? 'text-stone-300 cursor-not-allowed bg-stone-50' 
                                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900 active:bg-stone-200 cursor-pointer'
                              }`}
                              title={isMax ? `Maximum stock of ${maxStock} reached` : 'Increase quantity'}
                              aria-label="Increase quantity"
                            >
                              <Plus size={13} />
                            </button>
                          </div>

                          {/* Line Total */}
                          <div className="text-right">
                            <span className="text-xs sm:text-sm font-bold text-stone-900 block">
                              ₦{lineTotal.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {isMax && (
                          <p className="text-[10px] text-amber-700 mt-1 font-medium">
                            Max available inventory selected ({maxStock} units).
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* OPTIONAL CUSTOMER & DELIVERY INFO FOR PRE-FILLED WHATSAPP ORDER */}
              <div className="py-4">
                <button
                  type="button"
                  onClick={() => setShowDetailsSection(!showDetailsSection)}
                  className="w-full flex items-center justify-between text-xs font-semibold text-stone-700 hover:text-stone-900 p-2.5 bg-stone-100/70 hover:bg-stone-100 rounded-sm border border-stone-200 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <MapPin size={14} className="text-emerald-800" />
                    <span>{showDetailsSection ? 'Hide Delivery Details' : 'Add Delivery Details for Fast Dispatch (Optional)'}</span>
                  </span>
                  <span className="text-[11px] font-mono text-stone-500">{showDetailsSection ? '▲' : '▼'}</span>
                </button>

                {showDetailsSection && (
                  <div className="mt-3 p-4 bg-stone-50 border border-stone-200 rounded-sm space-y-3 animate-fade-in">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-stone-600 mb-1 flex items-center gap-1">
                        <User size={12} />
                        Your Full Name
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="e.g. Fatima Al-Hassan"
                        className="w-full text-xs p-2.5 border border-stone-300 rounded-xs bg-white text-stone-900 focus:outline-none focus:border-stone-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-stone-600 mb-1 flex items-center gap-1">
                        <Phone size={12} />
                        WhatsApp / Contact Phone
                      </label>
                      <input
                        type="text"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="e.g. +234 801 234 5678"
                        className="w-full text-xs p-2.5 border border-stone-300 rounded-xs bg-white text-stone-900 focus:outline-none focus:border-stone-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-stone-600 mb-1 flex items-center gap-1">
                        <MapPin size={12} />
                        Delivery Destination / City
                      </label>
                      <textarea
                        rows={2}
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="Street, Area, City, State (e.g. Lekki Phase 1, Lagos)"
                        className="w-full text-xs p-2.5 border border-stone-300 rounded-xs bg-white text-stone-900 focus:outline-none focus:border-stone-900"
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* 3. DRAWER FOOTER: SUMMARY & ACTION BUTTONS */}
        {cart.length > 0 && (
          <div className="p-4 sm:p-6 border-t border-stone-200 dark:border-stone-800 bg-stone-50/95 dark:bg-stone-950/95 sticky bottom-0 z-20 space-y-3.5 shadow-lg">
            
            {/* Order Summary Line */}
            <div className="flex justify-between items-baseline">
              <div>
                <span className="text-xs uppercase tracking-wider text-stone-600 dark:text-stone-400 font-semibold block">
                  Order Subtotal
                </span>
                <span className="text-[11px] text-stone-500 dark:text-stone-400 font-light">
                  {totalItemCount} {totalItemCount === 1 ? 'garment' : 'garments'} selected
                </span>
              </div>
              <div className="text-right">
                <span className="text-xl sm:text-2xl font-serif font-bold text-stone-900 dark:text-amber-300 tracking-tight">
                  ₦{subtotal.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Assistance note */}
            <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-tight flex items-center gap-1.5 font-light">
              <ShieldCheck size={14} className="text-emerald-700 dark:text-emerald-400 flex-shrink-0" />
              <span>Direct WhatsApp confirmation with our stylist desk for bank transfer &amp; delivery.</span>
            </p>

            {/* Primary Action Button: PROCEED TO CHECKOUT (WHATSAPP) */}
            <a
              href={whatsappCheckoutUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full py-3.5 px-4 bg-[#25D366] hover:bg-[#1fa855] text-white font-semibold text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2.5 rounded-xs shadow-sm hover:shadow-md active:scale-[0.99] cursor-pointer"
              title="Proceed to WhatsApp Checkout"
            >
              <MessageCircle size={18} />
              <span>Proceed to Checkout</span>
              <ArrowRight size={16} />
            </a>

            {/* Confirmation Dialog for Empty Bag / Start Over */}
            {showResetConfirm ? (
              <div className="p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 rounded-sm text-center space-y-3 animate-fade-in">
                <div className="flex items-start justify-center gap-2 text-red-900 dark:text-red-200 font-medium text-xs leading-relaxed">
                  <AlertCircle size={16} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <span>Are you sure you want to remove all items from your shopping bag?</span>
                </div>
                <div className="flex items-center justify-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 py-2 px-3 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-semibold uppercase tracking-wider rounded-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      clearCart();
                      setShowResetConfirm(false);
                    }}
                    className="flex-1 py-2 px-3 bg-red-700 hover:bg-red-800 text-white text-xs font-semibold uppercase tracking-wider rounded-xs transition-colors shadow-xs cursor-pointer"
                  >
                    Yes, Empty My Bag
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                {/* Secondary Action: CONTINUE SHOPPING */}
                <button
                  type="button"
                  onClick={handleContinueShopping}
                  className="w-full py-3 px-4 bg-white dark:bg-stone-850 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 hover:border-stone-400 font-semibold text-xs uppercase tracking-wider transition-colors rounded-xs shadow-2xs text-center cursor-pointer"
                >
                  Continue Shopping
                </button>

                {/* Reset Action: EMPTY BAG / START OVER */}
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(true)}
                  className="w-full py-2 px-3 text-stone-500 hover:text-red-600 dark:hover:text-red-400 text-[11px] font-medium uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer hover:bg-red-50/60 dark:hover:bg-red-950/30 rounded-xs"
                >
                  <RotateCcw size={13} />
                  <span>Empty Bag / Start Over</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
