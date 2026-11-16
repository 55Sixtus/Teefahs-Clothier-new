import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  Mail,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Globe,
  ExternalLink,
} from 'lucide-react';
import { useCart, getProductStockInfo, CartItem } from '../context/CartContext';
import { useLocale, SUPPORTED_COUNTRIES, SupportedCountryCode } from '../context/LocaleContext';
import { getActiveWhatsAppChatNumber } from '../config/shopConfig';
import { trackBeginCheckout, trackWhatsAppConversion } from '../utils/analytics';
import { calculateProductPricing, findMatchingVariation } from '../utils/pricing';
import { getPublishedProducts, getActiveCategories } from '../lib/api';
import { submitStoreOrder, SubmitOrderResult } from '../lib/ordersApi';
import { Category } from '../types/product';

export default function CartDrawer() {
  const { cart, categories, isCartOpen, closeCart, removeFromCart, updateQuantity, replaceCart, clearCart } = useCart();
  const {
    country,
    setCountry,
    countryInfo,
    displayCurrency,
    fxRates,
    fxUpdatedAt,
    activeDeliveryZone,
    formatDisplayPrice,
  } = useLocale();
  const navigate = useNavigate();

  const [customerName, setCustomerName] = useState(() => {
    try {
      return localStorage.getItem('teefahs_customer_name') || '';
    } catch {
      return '';
    }
  });
  const [customerEmail, setCustomerEmail] = useState(() => {
    try {
      return localStorage.getItem('teefahs_customer_email') || '';
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
  const [deliveryCity, setDeliveryCity] = useState(() => {
    try {
      return localStorage.getItem('teefahs_customer_city') || '';
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
  const [deliveryNotes, setDeliveryNotes] = useState('');

  const [checkoutStep, setCheckoutStep] = useState<'bag' | 'details' | 'ready'>('bag');
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [loggedOrder, setLoggedOrder] = useState<SubmitOrderResult | null>(null);
  const [verifiedSnapshot, setVerifiedSnapshot] = useState<{
    items: CartItem[];
    categories: Category[];
    subtotal: number;
    originalSubtotal: number;
    totalSavings: number;
  } | null>(null);
  const [failedItemImages, setFailedItemImages] = useState<Record<string, boolean>>({});
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('teefahs_customer_name', customerName);
      localStorage.setItem('teefahs_customer_email', customerEmail);
      localStorage.setItem('teefahs_customer_phone', customerPhone);
      localStorage.setItem('teefahs_customer_city', deliveryCity);
      localStorage.setItem('teefahs_customer_address', deliveryAddress);
    } catch {
      // ignore storage write errors
    }
  }, [customerName, customerEmail, customerPhone, deliveryCity, deliveryAddress]);

  useEffect(() => {
    if (!isCartOpen) {
      setCheckoutError(null);
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCart();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCartOpen, closeCart]);

  // Reset confirmation screen cleanly when cart becomes empty
  useEffect(() => {
    if (cart.length === 0 && checkoutStep !== 'ready') {
      setCheckoutStep('bag');
    }
  }, [cart.length, checkoutStep]);

  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const originalSubtotal = cart.reduce((sum, item) => {
    const matchedVar = findMatchingVariation(item.product, item.selectedSize, item.selectedColour);
    const pricing = calculateProductPricing(item.product, categories, { variation: matchedVar });
    return sum + pricing.originalPrice * item.quantity;
  }, 0);

  const subtotal = cart.reduce((sum, item) => {
    const matchedVar = findMatchingVariation(item.product, item.selectedSize, item.selectedColour);
    const pricing = calculateProductPricing(item.product, categories, { variation: matchedVar });
    return sum + pricing.sellingPrice * item.quantity;
  }, 0);

  const totalSavings = Math.max(0, originalSubtotal - subtotal);
  const subtotalDisplay = formatDisplayPrice(subtotal);

  const buildWhatsAppMessage = (orderRef?: string) => {
    const activeItems = verifiedSnapshot?.items || cart;
    const activeCats = verifiedSnapshot?.categories || categories;
    const activeOriginalSubtotal = verifiedSnapshot?.originalSubtotal ?? originalSubtotal;
    const activeSubtotal = verifiedSnapshot?.subtotal ?? subtotal;
    const activeSavings = verifiedSnapshot?.totalSavings ?? totalSavings;
    const activeSubtotalDisplay = formatDisplayPrice(activeSubtotal);
    const selectedCountryObj =
      SUPPORTED_COUNTRIES.find((c) => c.code === country) || countryInfo;
    const confirmedFee = activeDeliveryZone?.delivery_fee_ngn;

    const lines = [
      'Assalamu Alaikum! I would like to confirm an order from Teefahs Clothier:',
      ...(orderRef ? [`*ORDER REFERENCE: ${orderRef}*`] : []),
      '',
      '*GARMENTS ORDERED*',
      '----------------------------------------',
      ...activeItems.map((item, idx) => {
        const matchedVar = findMatchingVariation(item.product, item.selectedSize, item.selectedColour);
        const pricing = calculateProductPricing(item.product, activeCats, { variation: matchedVar });
        const unit = pricing.sellingPrice;
        const lineTotal = unit * item.quantity;
        const skuText = matchedVar?.sku || item.product.sku;
        const discountNote = pricing.hasDiscount
          ? ` (${pricing.discountPercentage}% OFF from ₦${pricing.originalPrice.toLocaleString()})`
          : '';
        return `${idx + 1}. *${item.product.name}*${skuText ? ` [${skuText}]` : ''}\n   - Colour: ${item.selectedColour || 'Original'}\n   - Size: ${item.selectedSize || 'Standard'}\n   - Qty: ${item.quantity} × ₦${unit.toLocaleString()}${discountNote} = ₦${lineTotal.toLocaleString()}`;
      }),
      '----------------------------------------',
      ...(activeSavings > 0
        ? [
            `Original Subtotal: ₦${activeOriginalSubtotal.toLocaleString()}`,
            `Promotional Savings: -₦${activeSavings.toLocaleString()}`,
          ]
        : []),
      `*AUTHORITATIVE BASE SUBTOTAL: ₦${activeSubtotal.toLocaleString()} (NGN)*`,
      ...(activeSubtotalDisplay.indicativeForeign
        ? [
            `Indicative ${displayCurrency} Equivalent: ${activeSubtotalDisplay.indicativeForeign} (subject to confirmation)`,
          ]
        : []),
      ...(confirmedFee !== null && confirmedFee !== undefined
        ? [`Delivery Zone Fee (${selectedCountryObj.name}): ₦${Number(confirmedFee).toLocaleString()}`]
        : [`Delivery Fee (${selectedCountryObj.name}): Awaiting boutique courier quote prior to payment`]),
      '',
      '*CUSTOMER & DELIVERY DESTINATION*',
      `- Full Name: ${customerName.trim() || 'Not entered'}`,
      `- WhatsApp / Phone: ${customerPhone.trim() || 'Not entered'}`,
      ...(customerEmail.trim() ? [`- Email: ${customerEmail.trim()}`] : []),
      `- Destination Country: ${selectedCountryObj.name}`,
      ...(deliveryCity.trim() ? [`- City / State: ${deliveryCity.trim()}`] : []),
      `- Address: ${deliveryAddress.trim() || 'Not entered'}`,
      ...(deliveryNotes.trim() ? [`- Notes: ${deliveryNotes.trim()}`] : []),
      '',
      'Please confirm garment availability, courier delivery fee, and bank transfer details before payment. Thank you!',
    ];

    return encodeURIComponent(lines.join('\n'));
  };

  const handleLogOrderAndPrepareWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError(null);

    if (!customerName.trim() || !customerPhone.trim() || !deliveryAddress.trim()) {
      setCheckoutError('Please enter your Full Name, WhatsApp Phone Number, and Delivery Address.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Live pre-checkout validation directly against Supabase
      const [freshProducts, freshCategories] = await Promise.all([
        getPublishedProducts(),
        getActiveCategories(),
      ]);

      const syncedItems: CartItem[] = [];
      const issues: string[] = [];

      for (const item of cart) {
        const liveProd = freshProducts.find((p) => p.id === item.product.id);
        if (!liveProd || !liveProd.is_published || liveProd.is_archived || liveProd.deleted_at) {
          issues.push(`${item.product.name} is no longer available and was removed from your bag.`);
          continue;
        }

        const stockInfo = getProductStockInfo(liveProd, item.selectedSize, item.selectedColour);
        if (stockInfo.hasVariations && (stockInfo.isOutOfStock || stockInfo.maxStock <= 0)) {
          issues.push(`${liveProd.name} (${item.selectedColour} / ${item.selectedSize}) is currently out of stock and was removed.`);
          continue;
        }

        let nextQty = item.quantity;
        if (stockInfo.hasVariations && item.quantity > stockInfo.maxStock) {
          nextQty = stockInfo.maxStock;
          issues.push(`${liveProd.name} quantity was adjusted to available stock (${stockInfo.maxStock}).`);
        }

        const oldVar = findMatchingVariation(item.product, item.selectedSize, item.selectedColour);
        const newVar = findMatchingVariation(liveProd, item.selectedSize, item.selectedColour);
        const oldPrice = calculateProductPricing(item.product, categories, { variation: oldVar }).sellingPrice;
        const newPrice = calculateProductPricing(liveProd, freshCategories, { variation: newVar }).sellingPrice;
        if (oldPrice !== newPrice) {
          issues.push(`${liveProd.name} price updated to ₦${newPrice.toLocaleString()}.`);
        }

        syncedItems.push({
          ...item,
          product: liveProd,
          quantity: nextQty,
        });
      }

      replaceCart(syncedItems);

      if (syncedItems.length === 0) {
        setCheckoutError(issues[0] || 'Your bag has no currently available garments.');
        return;
      }

      if (issues.length > 0) {
        setCheckoutError(
          `Your bag was synced with live boutique inventory: ${issues.join(' ')} Please review the updated total and click again to confirm.`
        );
        return;
      }

      const freshOriginalSubtotal = syncedItems.reduce((sum, item) => {
        const matchedVar = findMatchingVariation(item.product, item.selectedSize, item.selectedColour);
        const pricing = calculateProductPricing(item.product, freshCategories, { variation: matchedVar });
        return sum + pricing.originalPrice * item.quantity;
      }, 0);

      const freshSubtotal = syncedItems.reduce((sum, item) => {
        const matchedVar = findMatchingVariation(item.product, item.selectedSize, item.selectedColour);
        const pricing = calculateProductPricing(item.product, freshCategories, { variation: matchedVar });
        return sum + pricing.sellingPrice * item.quantity;
      }, 0);

      const freshSavings = Math.max(0, freshOriginalSubtotal - freshSubtotal);

      // 2. Submit order using freshly validated items & live NGN records
      const result = await submitStoreOrder({
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim() || undefined,
        customer_phone: customerPhone.trim(),
        delivery_country: country,
        delivery_address: deliveryAddress.trim(),
        delivery_city: deliveryCity.trim() || undefined,
        delivery_notes: deliveryNotes.trim() || undefined,
        display_currency: displayCurrency,
        exchange_rate_used:
          displayCurrency !== 'NGN' && fxRates?.[displayCurrency] ? fxRates[displayCurrency] : null,
        exchange_rate_timestamp: fxUpdatedAt || null,
        items: syncedItems.map((item) => ({
          product_id: item.product.id,
          selected_colour: item.selectedColour || 'Original',
          selected_size: item.selectedSize || 'Standard',
          quantity: item.quantity,
        })),
      });

      setVerifiedSnapshot({
        items: syncedItems,
        categories: freshCategories,
        subtotal: freshSubtotal,
        originalSubtotal: freshOriginalSubtotal,
        totalSavings: freshSavings,
      });
      setLoggedOrder(result);
      setCheckoutStep('ready');

      trackBeginCheckout(
        syncedItems.map((item) => {
          const matchedVar = findMatchingVariation(item.product, item.selectedSize, item.selectedColour);
          return {
            id: item.product.id,
            name: item.product.name,
            price: calculateProductPricing(item.product, freshCategories, { variation: matchedVar }).sellingPrice,
            quantity: item.quantity,
          };
        }),
        freshSubtotal
      );
    } catch (err: any) {
      setCheckoutError(err?.message || 'Could not log order. Please verify stock and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isCartOpen) return null;

  const chatNumber = getActiveWhatsAppChatNumber();
  const whatsappCheckoutUrl = `https://wa.me/${chatNumber}?text=${buildWhatsAppMessage(
    loggedOrder?.order_reference
  )}`;

  return (
    <div
      className="fixed inset-0 z-[100] flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Bag"
    >
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 cursor-pointer"
        onClick={closeCart}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md sm:max-w-lg bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xl flex flex-col h-full z-10 border-l border-stone-200 dark:border-stone-800 transition-colors duration-300">
        {/* DRAWER HEADER */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/90 dark:bg-stone-950/90 sticky top-0 z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-950 text-emerald-300 flex items-center justify-center border border-emerald-800/50">
              <ShoppingBag size={16} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-serif text-stone-900 dark:text-white tracking-wide font-medium flex items-center gap-2">
                Shopping Bag
                <span className="text-xs font-sans font-semibold text-stone-500 dark:text-stone-400">
                  · {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
                </span>
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={closeCart}
            className="p-2 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white transition-colors cursor-pointer"
            aria-label="Close shopping bag"
          >
            <X size={20} />
          </button>
        </div>

        {/* DRAWER CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 overscroll-contain">
          {cart.length === 0 && checkoutStep !== 'ready' ? (
            <div className="text-center py-16 px-4 flex flex-col items-center justify-center h-full">
              <div className="w-16 h-16 mb-5 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-center text-stone-400">
                <ShoppingBag size={28} className="stroke-[1.5]" />
              </div>
              <h3 className="font-serif text-xl text-stone-900 dark:text-white mb-2">
                Your shopping bag is empty
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mb-8 max-w-xs leading-relaxed">
                Explore our modest abayas, coordinating French khimars, workwear, prayer dresses, and signature hijabs.
              </p>
              <button
                type="button"
                onClick={() => {
                  closeCart();
                  navigate('/shop');
                }}
                className="w-full max-w-xs py-3.5 bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 text-xs uppercase tracking-widest font-semibold hover:bg-emerald-900 transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Explore Catalogue</span>
                <ArrowRight size={14} />
              </button>
            </div>
          ) : checkoutStep === 'ready' && loggedOrder ? (
            <div className="space-y-5 py-2">
              <div className="p-5 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-3">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 size={20} className="text-emerald-800 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] uppercase tracking-widest font-semibold text-emerald-800 dark:text-emerald-300 block">
                      {loggedOrder.persisted ? 'Order Logged · Awaiting Confirmation' : 'Prepared for WhatsApp'}
                    </span>
                    <h3 className="font-serif text-xl text-stone-900 dark:text-white mt-0.5">
                      Reference: {loggedOrder.order_reference}
                    </h3>
                  </div>
                </div>
                <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                  {loggedOrder.persisted
                    ? 'Your order has been logged with a unique tracking reference. Complete confirmation on WhatsApp below so our Lagos boutique desk can verify stock, dispatch timeline, and bank transfer details before any payment.'
                    : 'Your structured order message is ready. Send it on WhatsApp below so our boutique desk can confirm stock, delivery fee, and payment details.'}
                </p>
                {loggedOrder.persisted && (
                  <div className="pt-1 text-xs">
                    <Link
                      to={`/track-order?ref=${encodeURIComponent(loggedOrder.order_reference)}`}
                      onClick={closeCart}
                      className="inline-flex items-center gap-1.5 font-semibold text-emerald-900 dark:text-emerald-300 hover:underline"
                    >
                      <span>Open Order Tracking Page</span>
                      <ExternalLink size={12} />
                    </Link>
                  </div>
                )}
              </div>

              <a
                href={whatsappCheckoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  trackWhatsAppConversion('cart_checkout', {
                    value: subtotal,
                    items_count: totalItemCount,
                  });
                }}
                className="w-full py-4 px-5 bg-[#25D366] hover:bg-[#1fa855] text-white font-semibold text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2.5 shadow-sm"
              >
                <MessageCircle size={18} />
                <span>Send Order {loggedOrder.order_reference} on WhatsApp</span>
                <ArrowRight size={16} />
              </a>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    clearCart();
                    setLoggedOrder(null);
                    setCheckoutStep('bag');
                    closeCart();
                  }}
                  className="flex-1 py-2.5 border border-stone-300 dark:border-stone-700 text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                >
                  Done &amp; Clear Bag
                </button>
                <button
                  type="button"
                  onClick={() => setCheckoutStep('details')}
                  className="py-2.5 px-4 border border-stone-300 dark:border-stone-700 text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                >
                  Edit Details
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* BAG ITEMS LIST */}
              <div className="space-y-3.5">
                {cart.map((item, index) => {
                  const matchedVar = findMatchingVariation(
                    item.product,
                    item.selectedSize,
                    item.selectedColour
                  );
                  const stockInfo = getProductStockInfo(
                    item.product,
                    item.selectedSize,
                    item.selectedColour
                  );
                  const maxStock = stockInfo.maxStock;
                  const isMax = maxStock <= 0 || item.quantity >= maxStock;
                  const pricing = calculateProductPricing(item.product, categories, {
                    variation: matchedVar,
                  });
                  const unitPrice = pricing.sellingPrice;
                  const lineTotal = unitPrice * item.quantity;
                  const lineDisplay = formatDisplayPrice(lineTotal);
                  const itemImg =
                    matchedVar?.image_url ||
                    item.product.main_image_url ||
                    item.product.images?.[0]?.image_url ||
                    '';
                  const imgKey = `${item.product.id}-${index}`;
                  const showPlaceholder = !itemImg || failedItemImages[imgKey];

                  return (
                    <div
                      key={`${item.product.id}-${item.selectedSize}-${item.selectedColour}-${index}`}
                      className="p-3.5 bg-stone-50/70 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 flex gap-3.5"
                    >
                      <div className="w-20 h-24 bg-stone-100 dark:bg-stone-900 flex-shrink-0 overflow-hidden border border-stone-200 dark:border-stone-800 flex items-center justify-center p-1">
                        {showPlaceholder ? (
                          <ShoppingBag size={20} className="text-stone-400" />
                        ) : (
                          <img
                            src={itemImg}
                            alt={item.product.name}
                            referrerPolicy="no-referrer"
                            onError={() => setFailedItemImages((prev) => ({ ...prev, [imgKey]: true }))}
                            className="w-full h-full object-contain"
                            loading="lazy"
                          />
                        )}
                      </div>

                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <Link
                              to={`/product/${item.product.slug || item.product.id}`}
                              onClick={closeCart}
                              className="text-xs sm:text-sm font-semibold text-stone-900 dark:text-stone-100 truncate hover:underline"
                              title={item.product.name}
                            >
                              {item.product.name}
                            </Link>
                            <button
                              type="button"
                              onClick={() => removeFromCart(index)}
                              className="text-stone-400 hover:text-red-500 transition-colors p-1 -mt-1 -mr-1 cursor-pointer"
                              aria-label={`Remove ${item.product.name}`}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-stone-600 dark:text-stone-400 mt-1">
                            <span>
                              Size: <strong className="text-stone-800 dark:text-stone-200">{item.selectedSize || 'Standard'}</strong>
                            </span>
                            <span>·</span>
                            <span>
                              Colour: <strong className="text-stone-800 dark:text-stone-200">{item.selectedColour || 'Original'}</strong>
                            </span>
                          </div>

                          <div className="flex items-baseline flex-wrap gap-x-2 mt-1.5 tabular-nums">
                            <span className="text-xs font-bold text-stone-900 dark:text-amber-300">
                              {pricing.formattedSellingPrice}{' '}
                              <span className="text-[10px] text-stone-400 font-normal">each</span>
                            </span>
                            {pricing.hasDiscount && (
                              <span className="text-[11px] text-stone-400 line-through">
                                {pricing.formattedOriginalPrice}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-stone-200/70 dark:border-stone-800">
                          <div className="flex items-center border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900">
                            <button
                              type="button"
                              onClick={() => updateQuantity(index, item.quantity - 1)}
                              className="p-1.5 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                              aria-label="Decrease quantity"
                            >
                              <Minus size={13} />
                            </button>
                            <span className="px-3 text-xs font-semibold tabular-nums min-w-[28px] text-center">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              disabled={isMax}
                              onClick={() => updateQuantity(index, item.quantity + 1)}
                              className={`p-1.5 ${
                                isMax
                                  ? 'text-stone-300 dark:text-stone-600 cursor-not-allowed'
                                  : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer'
                              }`}
                              aria-label="Increase quantity"
                            >
                              <Plus size={13} />
                            </button>
                          </div>

                          <div className="text-right tabular-nums">
                            <span className="text-xs sm:text-sm font-bold text-stone-900 dark:text-white block">
                              ₦{lineTotal.toLocaleString()}
                            </span>
                            {lineDisplay.indicativeForeign && (
                              <span className="text-[10px] text-stone-500 block">
                                {lineDisplay.indicativeForeign}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* STRUCTURED PRE-WHATSAPP CHECKOUT DETAILS */}
              <form
                id="teefahs-checkout-form"
                onSubmit={handleLogOrderAndPrepareWhatsApp}
                className="border-t border-stone-200 dark:border-stone-800 pt-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-widest font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                    <Globe size={13} className="text-emerald-800 dark:text-emerald-400" />
                    <span>Delivery &amp; Order Details</span>
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setCheckoutStep(checkoutStep === 'details' ? 'bag' : 'details')
                    }
                    className="text-[11px] text-emerald-800 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    {checkoutStep === 'details' ? 'Collapse' : 'Edit'}
                  </button>
                </div>

                {checkoutError && (
                  <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-800 dark:text-red-200 flex items-start gap-2">
                    <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                    <span>{checkoutError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-stone-500 mb-1">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Fatima Al-Hassan"
                        className="w-full text-xs pl-7 pr-2.5 py-2 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-white focus:outline-none focus:border-stone-900"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-stone-500 mb-1">
                      WhatsApp Phone *
                    </label>
                    <div className="relative">
                      <Phone size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="+234 801 234 5678"
                        className="w-full text-xs pl-7 pr-2.5 py-2 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-white focus:outline-none focus:border-stone-900"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-stone-500 mb-1">
                      Email (For Order Tracking)
                    </label>
                    <div className="relative">
                      <Mail size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full text-xs pl-7 pr-2.5 py-2 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-white focus:outline-none focus:border-stone-900"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-stone-500 mb-1">
                      Destination Country *
                    </label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value as SupportedCountryCode)}
                      className="w-full text-xs px-2.5 py-2 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-white focus:outline-none focus:border-stone-900"
                    >
                      {SUPPORTED_COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-stone-500 mb-1">
                      City / State
                    </label>
                    <input
                      type="text"
                      value={deliveryCity}
                      onChange={(e) => setDeliveryCity(e.target.value)}
                      placeholder="e.g. Ikeja, Lagos / London"
                      className="w-full text-xs px-2.5 py-2 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-white focus:outline-none focus:border-stone-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-stone-500 mb-1">
                      Optional Fitting Note
                    </label>
                    <input
                      type="text"
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                      placeholder="Height or gift note"
                      className="w-full text-xs px-2.5 py-2 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-white focus:outline-none focus:border-stone-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-stone-500 mb-1 flex items-center gap-1">
                    <MapPin size={11} />
                    <span>Delivery Street Address *</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="House number, street, landmark, postal code"
                    className="w-full text-xs p-2.5 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-white focus:outline-none focus:border-stone-900"
                  />
                </div>

                <div className="p-2.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-[11px] text-stone-600 dark:text-stone-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Destination ({countryInfo.name})</span>
                    <strong className="text-stone-900 dark:text-stone-200">
                      {activeDeliveryZone?.delivery_fee_ngn !== null &&
                      activeDeliveryZone?.delivery_fee_ngn !== undefined
                        ? `₦${Number(activeDeliveryZone.delivery_fee_ngn).toLocaleString()}`
                        : 'Confirmed via WhatsApp'}
                    </strong>
                  </div>
                  <p className="text-[10px] text-stone-500">
                    {activeDeliveryZone?.estimated_timeline || countryInfo.fallbackTimeline}.{' '}
                    {activeDeliveryZone?.customs_note || countryInfo.fallbackCustomsNote}
                  </p>
                </div>
              </form>
            </>
          )}
        </div>

        {/* DRAWER FOOTER */}
        {cart.length > 0 && checkoutStep !== 'ready' && (
          <div className="p-4 sm:p-5 border-t border-stone-200 dark:border-stone-800 bg-stone-50/95 dark:bg-stone-950/95 sticky bottom-0 z-20 space-y-3 shadow-lg">
            {totalSavings > 0 && (
              <div className="space-y-1 pb-2 border-b border-stone-200 dark:border-stone-800 text-xs tabular-nums">
                <div className="flex justify-between text-stone-500">
                  <span>Original Subtotal</span>
                  <span className="line-through">₦{originalSubtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-amber-800 dark:text-amber-400 font-semibold">
                  <span>Promotional Savings</span>
                  <span>-₦{totalSavings.toLocaleString()}</span>
                </div>
              </div>
            )}

            <div className="flex justify-between items-baseline tabular-nums">
              <div>
                <span className="text-xs uppercase tracking-wider text-stone-600 dark:text-stone-400 font-semibold block">
                  Garments Subtotal (NGN)
                </span>
                <span className="text-[11px] text-stone-500">
                  {totalItemCount} {totalItemCount === 1 ? 'piece' : 'pieces'} · Dispatch fee confirmed separately
                </span>
              </div>
              <div className="text-right">
                <span className="text-xl font-serif font-bold text-stone-900 dark:text-amber-300 block">
                  {subtotalDisplay.primaryNgn}
                </span>
                {subtotalDisplay.indicativeForeign && (
                  <span className="text-[11px] text-stone-500 block">
                    {subtotalDisplay.indicativeForeign}
                  </span>
                )}
              </div>
            </div>

            {subtotalDisplay.disclaimer && (
              <p className="text-[10px] text-stone-500 leading-snug">
                {subtotalDisplay.disclaimer}
              </p>
            )}

            <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-tight flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-700 dark:text-emerald-400 flex-shrink-0" />
              <span>
                Logs a tracked reference before opening WhatsApp. No payment is charged automatically.
              </span>
            </p>

            <button
              type="submit"
              form="teefahs-checkout-form"
              disabled={submitting}
              className="w-full py-3.5 px-4 bg-[#25D366] hover:bg-[#1fa855] disabled:opacity-60 text-white font-semibold text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <MessageCircle size={17} />
              <span>
                {submitting ? 'Generating Order Reference...' : 'Log Order & Continue to WhatsApp'}
              </span>
              <ArrowRight size={15} />
            </button>

            {showResetConfirm ? (
              <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-center space-y-2">
                <p className="text-xs text-red-900 dark:text-red-200">
                  Remove all garments from your bag?
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 py-1.5 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      clearCart();
                      setShowResetConfirm(false);
                    }}
                    className="flex-1 py-1.5 bg-red-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    Empty Bag
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between pt-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={closeCart}
                  className="text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white font-medium cursor-pointer"
                >
                  &larr; Continue Shopping
                </button>
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(true)}
                  className="text-stone-400 hover:text-red-600 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw size={12} />
                  <span>Clear Bag</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
