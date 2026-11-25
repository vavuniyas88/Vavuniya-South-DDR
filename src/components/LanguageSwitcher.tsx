import type {Language} from '../types.ts';

interface LanguageSwitcherProps {
  language: Language;
  onChange: (lang: Language) => void;
  variant?: 'light' | 'dark';
}

const LANGUAGES: Array<{code: Language; label: string}> = [
  {code: 'ta', label: 'தமிழ்'},
  {code: 'en', label: 'English'},
  {code: 'si', label: 'සිංහල'},
];

export function LanguageSwitcher({
  language,
  onChange,
  variant = 'light',
}: LanguageSwitcherProps) {
  const isDark = variant === 'dark';

  return (
    <div
      role="group"
      aria-label="Language switcher"
      className={`inline-flex items-center gap-1 rounded-lg p-1 border ${
        isDark
          ? 'bg-slate-900/75 border-slate-700/80 backdrop-blur-md'
          : 'bg-slate-100 border-slate-200'
      }`}
    >
      {LANGUAGES.map((item) => {
        const active = language === item.code;
        return (
          <button
            key={item.code}
            type="button"
            onClick={() => onChange(item.code)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
              active
                ? isDark
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-white text-slate-900 shadow-sm'
                : isDark
                  ? 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
