import { useState } from 'react';
import { X, Check, ShoppingBag, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Product } from '../types/product';
import { useCart } from '../context/CartContext';

import { getActiveWhatsAppChatNumber } from '../config/shopConfig';

interface ProductDetailsModalProps {
  product: Product | null;
  onClose: () => void;
}

export default function ProductDetailsModal({ product, onClose }: ProductDetailsModalProps) {
  const { addToCart } = useCart();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColour, setSelectedColour] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [addedNotice, setAddedNotice] = useState(false);

  if (!product) return null;

  // Gather all unique images (main image + gallery images)
  const allImages: string[] = [];
  if (product.main_image_url) allImages.push(product.main_image_url);
  if (product.images) {
    product.images.forEach(img => {
      if (img.image_url && !allImages.includes(img.image_url)) {
        allImages.push(img.image_url);
      }
    });
  }
  if (allImages.length === 0) {
    allImages.push('https://placehold.co/600x800?text=Teefahs+Clothier');
  }

  // Available sizes & colours from variations
  const sizes = Array.from(new Set(product.variations?.map(v => v.size).filter(Boolean))) as string[];
  const colours = Array.from(new Set(product.variations?.map(v => v.colour).filter(Boolean))) as string[];

  const currentSize = selectedSize || sizes[0] || 'Standard';
  const currentColour = selectedColour || colours[0] || 'Original';

  // Calculate total stock and variation-specific stock
  const totalStock = product.variations?.reduce((acc, v) => acc + (v.stock_quantity || 0), 0) ?? 20;
  const matchingVariation = product.variations?.find(
    v => (!v.size || v.size === currentSize) && (!v.colour || v.colour === currentColour)
  );
  const variationStock = matchingVariation ? (matchingVariation.stock_quantity ?? 0) : totalStock;
  const isOutOfStock = variationStock <= 0;

  const handleAdd = () => {
    if (isOutOfStock) return;
    addToCart({
      product,
      selectedSize: currentSize,
      selectedColour: currentColour,
      quantity: Math.min(variationStock, quantity),
    });
    setAddedNotice(true);
    setTimeout(() => {
      setAddedNotice(false);
      onClose();
    }, 750);
  };

  const currentImage = allImages[selectedImageIndex] || allImages[0];
  const chatNumber = getActiveWhatsAppChatNumber();

  const whatsappMessage = encodeURIComponent(
    `Assalamu Alaikum Teefahs Clothier! I am interested in:\n\n*${product.name}*\nPrice: ₦${product.base_price?.toLocaleString() || 'Contact for price'}\nSize: ${currentSize}\nColour: ${currentColour}\n\nCould you please confirm availability and delivery?`
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div 
        className="relative w-full max-w-4xl bg-white shadow-2xl rounded-sm overflow-hidden my-8"
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 text-stone-500 hover:text-stone-900 bg-white/80 rounded-full transition-colors"
          aria-label="Close modal"
        >
          <X size={22} />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 max-h-[90vh] overflow-y-auto">
          {/* Left Column: Image Gallery */}
          <div className="bg-stone-100 flex flex-col justify-between p-6">
            <div className="relative aspect-[3/4] w-full overflow-hidden bg-stone-200 shadow-inner rounded-sm">
              <img
                src={currentImage}
                alt={product.name}
                className="w-full h-full object-cover object-top transition-all duration-300"
              />
              {allImages.length > 1 && (
                <>
                  <button
                    onClick={() => setSelectedImageIndex(prev => (prev === 0 ? allImages.length - 1 : prev - 1))}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 text-stone-800 shadow-sm hover:bg-white"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={() => setSelectedImageIndex(prev => (prev === allImages.length - 1 ? 0 : prev + 1))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 text-stone-800 shadow-sm hover:bg-white"
                  >
                    <ChevronRight size={18} />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-thin">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`relative w-16 h-20 flex-shrink-0 overflow-hidden border-2 transition-all ${
                      selectedImageIndex === idx ? 'border-stone-900 opacity-100' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`Angle ${idx + 1}`} className="w-full h-full object-cover object-top" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Product Details & Controls */}
          <div className="p-8 flex flex-col justify-between bg-white">
            <div>
              {product.is_new_arrival && (
                <span className="inline-block px-2.5 py-0.5 mb-3 text-[10px] uppercase tracking-widest font-semibold bg-emerald-800 text-white">
                  New Arrival
                </span>
              )}

              <h2 className="text-2xl md:text-3xl font-serif text-stone-900 leading-snug">
                {product.name}
              </h2>

              <div className="flex items-baseline gap-3 my-3">
                <span className="text-2xl font-semibold text-stone-900">
                  ₦{product.base_price ? product.base_price.toLocaleString() : 'Price upon request'}
                </span>
                {product.sale_price && (
                  <span className="text-base line-through text-stone-400">
                    ₦{product.sale_price.toLocaleString()}
                  </span>
                )}
              </div>

              <div className="text-sm text-stone-600 border-t border-b border-stone-100 py-4 my-4 leading-relaxed">
                {product.description || product.short_description || 'Handcrafted modest attire designed with the utmost care, premium stitching, and modest elegance.'}
              </div>

              {/* Sizes */}
              {sizes.length > 0 && (
                <div className="mb-5">
                  <label className="block text-xs uppercase tracking-wider font-semibold text-stone-700 mb-2">
                    Select Size: <span className="font-normal text-stone-900">{currentSize}</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {sizes.map(sz => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setSelectedSize(sz)}
                        className={`px-3.5 py-1.5 text-xs font-medium border transition-colors ${
                          currentSize === sz
                            ? 'border-stone-900 bg-stone-900 text-white'
                            : 'border-stone-200 text-stone-700 hover:border-stone-400'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Colours */}
              {colours.length > 0 && (
                <div className="mb-5">
                  <label className="block text-xs uppercase tracking-wider font-semibold text-stone-700 mb-2">
                    Select Colour: <span className="font-normal text-stone-900">{currentColour}</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {colours.map(col => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setSelectedColour(col)}
                        className={`px-3 py-1.5 text-xs font-medium border transition-colors ${
                          currentColour === col
                            ? 'border-stone-900 bg-stone-100 text-stone-900 font-semibold'
                            : 'border-stone-200 text-stone-600 hover:border-stone-400'
                        }`}
                      >
                        {col}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="mb-6 flex items-center gap-4">
                <span className="text-xs uppercase tracking-wider font-semibold text-stone-700">Quantity:</span>
                <div className="flex items-center border border-stone-200">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1 || isOutOfStock}
                    className="px-3 py-1 text-stone-600 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    -
                  </button>
                  <span className="px-4 py-1 text-sm font-medium text-stone-900">{isOutOfStock ? 0 : quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.min(variationStock, quantity + 1))}
                    disabled={quantity >= variationStock || isOutOfStock}
                    className="px-3 py-1 text-stone-600 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    +
                  </button>
                </div>
                <span className={`text-xs font-medium ${isOutOfStock ? 'text-red-700' : 'text-emerald-700'}`}>
                  {isOutOfStock
                    ? 'Sold out in this variation'
                    : variationStock < 5
                    ? `Low Stock: Only ${variationStock} remaining`
                    : `In Stock (${variationStock} available)`}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-stone-100 flex flex-col gap-3">
              <button
                type="button"
                onClick={handleAdd}
                disabled={isOutOfStock}
                className={`w-full py-3.5 text-xs font-medium uppercase tracking-widest transition-colors flex items-center justify-center gap-2 ${
                  isOutOfStock
                    ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
                    : 'bg-stone-900 text-white hover:bg-stone-800'
                }`}
              >
                {isOutOfStock ? (
                  <span>Out of Stock in this Variation</span>
                ) : addedNotice ? (
                  <>
                    <Check size={16} className="text-emerald-400" />
                    Added to Bag!
                  </>
                ) : (
                  <>
                    <ShoppingBag size={16} />
                    Add to Bag (₦{((product.base_price || 0) * quantity).toLocaleString()})
                  </>
                )}
              </button>

              <a
                href={`https://wa.me/${chatNumber}?text=${whatsappMessage}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 border border-emerald-600 text-emerald-800 text-xs font-medium uppercase tracking-widest hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
              >
                <MessageCircle size={16} className="text-emerald-600" />
                Inquire on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
