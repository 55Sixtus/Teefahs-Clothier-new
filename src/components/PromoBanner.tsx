import { Sparkles } from 'lucide-react';
import { useRealtimePromotion } from '../hooks/useRealtimePromotion';

export default function PromoBanner() {
  const { promotion } = useRealtimePromotion();

  if (!promotion || !promotion.is_active) {
    return null;
  }

  return (
    <div className="bg-stone-950 text-amber-100 py-2 px-4 text-center text-xs font-medium tracking-wide border-b border-amber-400/20 relative z-30">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2.5 flex-wrap">
        <span className="inline-flex items-center gap-1.5 text-amber-300 font-semibold text-[11px] uppercase tracking-widest">
          <Sparkles size={12} />
          <span>{promotion.badge_text || 'Seasonal Edit'}</span>
        </span>
        <span className="text-stone-600">·</span>
        <span className="text-stone-100">{promotion.message}</span>
        {promotion.subtext && (
          <>
            <span className="hidden md:inline text-stone-600">·</span>
            <span className="text-stone-400 text-[11px] font-light">{promotion.subtext}</span>
          </>
        )}
      </div>
    </div>
  );
}
