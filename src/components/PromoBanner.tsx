import { Sparkles } from 'lucide-react';
import { useRealtimePromotion } from '../hooks/useRealtimePromotion';

export default function PromoBanner() {
  const { promotion } = useRealtimePromotion();

  if (!promotion || !promotion.is_active) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-emerald-950 via-stone-900 to-emerald-950 text-amber-100 py-2.5 px-4 text-center text-xs sm:text-sm font-medium tracking-wide border-b border-amber-400/30 shadow-xs relative z-30 transition-all duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 flex-wrap">
        <span className="flex items-center gap-1 bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-xs font-semibold text-[11px] uppercase tracking-wider">
          <Sparkles size={13} className="animate-pulse" />
          <span>{promotion.badge_text || 'Special Season Offer'}</span>
        </span>
        <span className="text-stone-100">
          {promotion.message}
        </span>
        {promotion.subtext && (
          <>
            <span className="hidden md:inline text-stone-400">•</span>
            <span className="text-stone-300 text-[11px] font-light">
              {promotion.subtext}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
