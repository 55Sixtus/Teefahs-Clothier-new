import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ThemeToggleProps {
  variant?: 'header' | 'hero' | 'floating';
  showLabel?: boolean;
}

export default function ThemeToggle({ variant = 'header', showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="inline-flex items-center gap-2">
      {showLabel && (
        <span className="text-[11px] font-medium uppercase tracking-wider text-stone-600 dark:text-stone-400 hidden sm:inline">
          {isDark ? 'Dark' : 'Light'}
        </span>
      )}

      <button
        type="button"
        onClick={toggleTheme}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        title={`Appearance: currently ${isDark ? 'Dark Mode' : 'Light Mode'}`}
        className={`
          relative inline-flex items-center rounded-full cursor-pointer transition-colors duration-300 select-none
          border focus:outline-none focus:ring-1 focus:ring-stone-400
          ${variant === 'hero' ? 'h-8 w-16 px-1' : 'h-7 w-13 px-0.5'}
          ${
            isDark
              ? 'bg-stone-800 border-stone-700 text-stone-300 hover:border-stone-600'
              : 'bg-stone-200 border-stone-300 text-stone-700 hover:border-stone-400'
          }
        `}
      >
        <span className="sr-only">Toggle appearance</span>
        <span
          className={`
            inline-flex items-center justify-center rounded-full transition-transform duration-300 shadow-xs
            ${variant === 'hero' ? 'w-6 h-6' : 'w-5 h-5'}
            ${
              isDark
                ? `${variant === 'hero' ? 'translate-x-8' : 'translate-x-6'} bg-stone-900 text-amber-300 border border-stone-700`
                : 'translate-x-0.5 bg-white text-stone-800 border border-stone-200'
            }
          `}
        >
          {isDark ? (
            <Moon size={variant === 'hero' ? 13 : 11} className="text-amber-300" />
          ) : (
            <Sun size={variant === 'hero' ? 13 : 11} className="text-amber-600" />
          )}
        </span>
      </button>
    </div>
  );
}
