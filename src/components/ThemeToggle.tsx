import { motion } from 'framer-motion';
import { Sun, Moon, Sparkles } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ThemeToggleProps {
  variant?: 'header' | 'hero' | 'floating';
  showLabel?: boolean;
}

export default function ThemeToggle({ variant = 'header', showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="inline-flex items-center gap-2.5">
      {showLabel && (
        <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300 hidden sm:inline">
          {isDark ? 'Royal Night' : 'Sunlit Gold'}
        </span>
      )}

      <button
        type="button"
        onClick={toggleTheme}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        title={`Toggle theme: currently ${isDark ? 'Dark Mode (Royal Night)' : 'Light Mode (Sunlit Gold)'}`}
        className={`
          relative flex items-center justify-between p-1 rounded-full cursor-pointer transition-all duration-500 select-none
          border shadow-md
          ${
            isDark
              ? 'bg-gradient-to-r from-emerald-950 via-teal-900 to-indigo-950 border-emerald-500/60 shadow-[0_0_18px_rgba(16,185,129,0.35)]'
              : 'bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 border-amber-500/80 shadow-[0_0_18px_rgba(245,158,11,0.5)]'
          }
          ${variant === 'hero' ? 'w-24 h-9 px-1.5' : 'w-18 h-8 px-1'}
        `}
      >
        {/* Animated Internal Track Glow */}
        <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
          <div
            className={`absolute inset-0 transition-opacity duration-500 ${
              isDark
                ? 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-400/30 via-transparent to-transparent opacity-90'
                : 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/80 via-transparent to-transparent opacity-95'
            }`}
          />
        </div>

        {/* Left Side Icon (Sun) */}
        <div className={`relative z-10 flex items-center justify-center transition-opacity duration-300 ${isDark ? 'opacity-30' : 'opacity-100'}`}>
          <Sun size={variant === 'hero' ? 16 : 13} className="text-amber-950 drop-shadow-xs" />
        </div>

        {/* Right Side Icon (Moon) */}
        <div className={`relative z-10 flex items-center justify-center transition-opacity duration-300 ${isDark ? 'opacity-100' : 'opacity-30'}`}>
          <Moon size={variant === 'hero' ? 16 : 13} className="text-emerald-300 drop-shadow-xs" />
        </div>

        {/* Sliding Colorful Animated Knob */}
        <motion.div
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 28 }}
          className={`
            absolute top-1 rounded-full flex items-center justify-center shadow-lg z-20
            ${variant === 'hero' ? 'w-7 h-7' : 'w-6 h-6'}
            ${
              isDark
                ? 'right-1 bg-gradient-to-br from-stone-900 via-emerald-950 to-stone-950 text-emerald-300 border border-emerald-400/90 shadow-[0_0_12px_rgba(52,211,153,0.8)]'
                : 'left-1 bg-gradient-to-br from-white via-amber-50 to-yellow-100 text-amber-700 border border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.9)]'
            }
          `}
        >
          {isDark ? (
            <Sparkles size={variant === 'hero' ? 14 : 12} className="text-emerald-300 animate-pulse" />
          ) : (
            <Sun size={variant === 'hero' ? 14 : 12} className="text-amber-600 animate-spin duration-[6000ms]" />
          )}
        </motion.div>
      </button>
    </div>
  );
}
