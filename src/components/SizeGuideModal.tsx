import { useState, useEffect } from 'react';
import { X, Ruler, Info, MessageCircle } from 'lucide-react';
import { Product } from '../types/product';
import { getActiveWhatsAppChatNumber } from '../config/shopConfig';

interface SizeGuideModalProps {
  product: Product;
  categoryName?: string;
  isOpen: boolean;
  onClose: () => void;
}

const cmToIn = (cm?: number | null): string => {
  if (cm === null || cm === undefined || !Number.isFinite(Number(cm))) return '—';
  return `${(Number(cm) / 2.54).toFixed(1)}"`;
};

const formatMeasure = (cm?: number | null, unit: 'cm' | 'in' = 'cm'): string => {
  if (cm === null || cm === undefined || !Number.isFinite(Number(cm))) return '—';
  return unit === 'cm' ? `${Number(cm)} cm` : cmToIn(cm);
};

export default function SizeGuideModal({
  product,
  categoryName,
  isOpen,
  onClose,
}: SizeGuideModalProps) {
  const [unit, setUnit] = useState<'cm' | 'in'>('cm');

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const rows = product.measurements?.rows || [];
  const hasRealMeasurements = rows.length > 0;
  const garmentCat = product.measurements?.garment_category || 'general';
  const fitLabel = (product.fit_type || 'loose').replace(/_/g, ' ');
  const whatsappUrl = `https://wa.me/${getActiveWhatsAppChatNumber()}?text=${encodeURIComponent(
    `Assalamu Alaikum! Please could you confirm exact measurements & recommended size for "${product.name}"?`
  )}`;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Size and Garment Measurements Guide"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-sm shadow-2xl border border-stone-200 dark:border-stone-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-stone-50 dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800 px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Ruler size={18} className="text-emerald-800 dark:text-emerald-400" />
            <div>
              <h2 className="font-serif text-lg text-stone-900 dark:text-white leading-tight">
                Size &amp; Garment Measurements Guide
              </h2>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                {product.name} {categoryName ? `· ${categoryName}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* cm / in toggle */}
            <div className="inline-flex border border-stone-300 dark:border-stone-700 rounded-xs overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setUnit('cm')}
                className={`px-3 py-1.5 font-semibold transition-colors cursor-pointer ${
                  unit === 'cm'
                    ? 'bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950'
                    : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300'
                }`}
              >
                cm
              </button>
              <button
                type="button"
                onClick={() => setUnit('in')}
                className={`px-3 py-1.5 font-semibold transition-colors cursor-pointer ${
                  unit === 'in'
                    ? 'bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950'
                    : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300'
                }`}
              >
                inches
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-stone-500 hover:text-stone-900 dark:hover:text-white cursor-pointer"
              aria-label="Close size guide"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Garment Metadata Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800">
              <span className="text-[10px] uppercase tracking-wider text-stone-500 block mb-0.5">
                Sizing System
              </span>
              <strong className="text-stone-900 dark:text-stone-100">
                {product.sizing_system || 'NG (Standard Boutique Sizing)'}
              </strong>
            </div>
            <div className="p-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800">
              <span className="text-[10px] uppercase tracking-wider text-stone-500 block mb-0.5">
                Cut / Fit Silhouette
              </span>
              <strong className="text-stone-900 dark:text-stone-100 capitalize">
                {fitLabel} Fit
              </strong>
            </div>
            <div className="p-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800">
              <span className="text-[10px] uppercase tracking-wider text-stone-500 block mb-0.5">
                Measurement Basis
              </span>
              <strong className="text-stone-900 dark:text-stone-100">
                {product.measurements_unit_note || 'Flat garment dimensions'}
              </strong>
            </div>
          </div>

          {product.fit_guidance && (
            <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-950 dark:text-emerald-200 leading-relaxed flex gap-2.5">
              <Info size={16} className="flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block mb-0.5">Owner Fit &amp; Drape Guidance</span>
                <span>{product.fit_guidance}</span>
              </div>
            </div>
          )}

          {/* Product-Specific Measurement Matrix (Only when recorded by owner) */}
          {hasRealMeasurements ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-base text-stone-900 dark:text-white">
                  Garment Dimensions ({unit === 'cm' ? 'Centimetres' : 'Inches'})
                </h3>
                {product.measurements?.model_height_cm && (
                  <span className="text-[11px] text-stone-500">
                    Model height: {formatMeasure(product.measurements.model_height_cm, unit)}
                    {product.measurements.model_wearing_size
                      ? ` · Wearing ${product.measurements.model_wearing_size}`
                      : ''}
                  </span>
                )}
              </div>

              <div className="overflow-x-auto border border-stone-200 dark:border-stone-800">
                <table className="w-full text-xs text-left">
                  <thead className="bg-stone-100 dark:bg-stone-800 text-[10px] uppercase tracking-wider text-stone-600 dark:text-stone-300">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Size Label</th>
                      {garmentCat === 'khimar' || garmentCat === 'hijab' ? (
                        <>
                          <th className="py-2.5 px-3 font-semibold">Front / Length</th>
                          <th className="py-2.5 px-3 font-semibold">Back Length / Width</th>
                        </>
                      ) : (
                        <>
                          <th className="py-2.5 px-3 font-semibold">Bust / Chest</th>
                          <th className="py-2.5 px-3 font-semibold">Waist</th>
                          <th className="py-2.5 px-3 font-semibold">Hip</th>
                          <th className="py-2.5 px-3 font-semibold">Full Length</th>
                          <th className="py-2.5 px-3 font-semibold">Sleeve</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 dark:divide-stone-800 tabular-nums">
                    {rows.map((row, i) => (
                      <tr key={i} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                        <td className="py-2.5 px-3 font-semibold text-stone-900 dark:text-white">
                          {row.size_label}
                        </td>
                        {garmentCat === 'khimar' || garmentCat === 'hijab' ? (
                          <>
                            <td className="py-2.5 px-3">
                              {formatMeasure(row.front_length_cm ?? row.hijab_length_cm ?? row.length_cm, unit)}
                            </td>
                            <td className="py-2.5 px-3">
                              {formatMeasure(row.back_length_cm ?? row.hijab_width_cm, unit)}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-2.5 px-3">{formatMeasure(row.chest_cm, unit)}</td>
                            <td className="py-2.5 px-3">{formatMeasure(row.waist_cm, unit)}</td>
                            <td className="py-2.5 px-3">{formatMeasure(row.hip_cm, unit)}</td>
                            <td className="py-2.5 px-3">{formatMeasure(row.length_cm, unit)}</td>
                            <td className="py-2.5 px-3">{formatMeasure(row.sleeve_cm, unit)}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-stone-500">
                Note: Slight 1–2 cm tailoring variance can occur due to artisanal finishing.
              </p>
            </div>
          ) : (
            <div className="p-4 border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 space-y-2">
              <p className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                Exact product dimensions are confirmed on request
              </p>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                Exact garment tape measurements for this design have not been published in the matrix yet.
                We never estimate dimensions — message our Lagos boutique desk with your height and preferred bust/hip fit so our tailors can verify before dispatch.
              </p>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-400 hover:underline pt-1"
              >
                <MessageCircle size={14} />
                <span>Request Exact Tape Measurements on WhatsApp &rarr;</span>
              </a>
            </div>
          )}

          {/* General Measuring Instructions */}
          <div className="border-t border-stone-200 dark:border-stone-800 pt-5 space-y-3">
            <h4 className="text-xs uppercase tracking-widest font-semibold text-stone-700 dark:text-stone-300">
              How to Measure for Modest Garments
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
              <div>
                <strong className="text-stone-900 dark:text-stone-200 block">Garment Length (Shoulder to Ankle)</strong>
                Measure straight down from the highest point of your shoulder to where you want the abaya or dress hem to rest while wearing flat shoes or heels.
              </div>
              <div>
                <strong className="text-stone-900 dark:text-stone-200 block">Garment vs Body Bust</strong>
                Loose-fit abayas and khimars carry intentional ease (typically extra drapery) beyond your snug body bust measurement for modest flow.
              </div>
              <div>
                <strong className="text-stone-900 dark:text-stone-200 block">Sleeve Length</strong>
                Measure from the top shoulder seam along a slightly bent arm down to the wrist bone.
              </div>
              <div>
                <strong className="text-stone-900 dark:text-stone-200 block">Khimar / Hijab Coverage</strong>
                Front length falls from the chin/forehead line down the torso; back length covers from crown toward upper back or waist depending on style.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
