'use client';

import { useState, useRef, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/navigation';
import { ChevronDown } from 'lucide-react';

const LOCALES = [
  { code: 'en', label: 'EN', flag: '🇬🇧', name: 'English' },
  { code: 'fr', label: 'FR', flag: '🇫🇷', name: 'Français' },
  { code: 'ar', label: 'AR', flag: '🇸🇦', name: 'العربية' },
] as const;

type LocaleCode = (typeof LOCALES)[number]['code'];

interface Props {
  /** 'header' = compact pill | 'sidebar' = full-width row */
  variant?: 'header' | 'sidebar';
}

export default function LanguageSwitcher({ variant = 'header' }: Props) {
  const locale = useLocale() as LocaleCode;
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  function switchLocale(next: LocaleCode) {
    if (next === locale) { setOpen(false); return; }
    document.cookie = `NEXT_LOCALE=${next};path=/;max-age=31536000;SameSite=Lax`;
    router.replace(pathname, { locale: next });
    setOpen(false);
  }

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (variant === 'sidebar') {
    return (
      <div ref={ref} className="relative w-full">
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-[8px] text-sm transition-colors duration-150"
          style={{
            color: 'rgba(255,255,255,0.65)',
            background: open ? 'rgba(255,255,255,0.05)' : 'transparent',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
          onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = 'transparent'; }}
        >
          <span className="text-base leading-none">{current.flag}</span>
          <span className="flex-1 text-left">{current.name}</span>
          <ChevronDown
            className="w-3.5 h-3.5 flex-shrink-0 transition-transform duration-150"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', color: 'rgba(255,255,255,0.30)' }}
          />
        </button>

        {open && (
          <div
            className="absolute bottom-full left-0 mb-1 w-full rounded-[10px] overflow-hidden"
            style={{
              background: '#1a1a1a',
              border: '1px solid rgba(255,255,255,0.10)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.60)',
              zIndex: 200,
            }}
          >
            {LOCALES.map((l) => (
              <button
                key={l.code}
                onClick={() => switchLocale(l.code)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors duration-100"
                style={{
                  color: l.code === locale ? '#D4AF37' : 'rgba(255,255,255,0.75)',
                  background: l.code === locale ? 'rgba(212,175,55,0.08)' : 'transparent',
                  fontWeight: l.code === locale ? 600 : 400,
                }}
                onMouseEnter={(e) => { if (l.code !== locale) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                onMouseLeave={(e) => { if (l.code !== locale) e.currentTarget.style.background = 'transparent'; }}
              >
                <span className="text-base leading-none">{l.flag}</span>
                <span>{l.name}</span>
                {l.code === locale && (
                  <span className="ml-auto text-xs" style={{ color: '#D4AF37' }}>✓</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // variant === 'header' — compact pill
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] text-xs font-medium transition-colors duration-150"
        style={{
          background: open ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.10)',
          color: 'rgba(255,255,255,0.75)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
      >
        <span className="text-sm leading-none">{current.flag}</span>
        <span>{current.label}</span>
        <ChevronDown
          className="w-3 h-3 transition-transform duration-150"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', color: 'rgba(255,255,255,0.40)' }}
        />
      </button>

      {open && (
        <div
          className="absolute top-full right-0 mt-1.5 rounded-[10px] overflow-hidden"
          style={{
            background: '#1a1a1a',
            border: '1px solid rgba(255,255,255,0.10)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.70)',
            minWidth: 140,
            zIndex: 9999,
          }}
        >
          {LOCALES.map((l) => (
            <button
              key={l.code}
              onClick={() => switchLocale(l.code)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors duration-100"
              style={{
                color: l.code === locale ? '#D4AF37' : 'rgba(255,255,255,0.75)',
                background: l.code === locale ? 'rgba(212,175,55,0.08)' : 'transparent',
                fontWeight: l.code === locale ? 600 : 400,
              }}
              onMouseEnter={(e) => { if (l.code !== locale) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={(e) => { if (l.code !== locale) e.currentTarget.style.background = 'transparent'; }}
            >
              <span className="text-base leading-none">{l.flag}</span>
              <span>{l.name}</span>
              {l.code === locale && (
                <span className="ml-auto text-xs" style={{ color: '#D4AF37' }}>✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
