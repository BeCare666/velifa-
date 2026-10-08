'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Zap, Menu, X, Sparkles, Gem } from 'lucide-react';
import { UserButton, useAuth } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useSubscription } from '@/context/SubscriptionContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';

type NavHref = '/' | '/fonctionnalites' | '/tarifs' | '/faq' | '/contact';
const NAV_HREFS: NavHref[] = ['/', '/fonctionnalites', '/tarifs', '/faq', '/contact'];
const NAV_KEYS = ['home', 'features', 'pricing', 'faq', 'contact'] as const;

/** Badge inline plan — argent/platine pour Business, doré pour Pro */
function HeaderPlanBadge({ plan }: { plan: 'pro' | 'business' | null }) {
  if (!plan) return null;
  if (plan === 'business') {
    return (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase leading-none"
        style={{
          background: 'linear-gradient(135deg, rgba(232,232,232,0.18) 0%, rgba(180,180,180,0.10) 100%)',
          border: '1px solid rgba(200,200,200,0.45)',
          color: '#E8E8E8',
          boxShadow: '0 1px 6px rgba(200,200,200,0.12)',
        }}
      >
        <Gem className="w-2.5 h-2.5" />
        Business
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase leading-none"
      style={{
        background: 'linear-gradient(135deg, rgba(212,175,55,0.20) 0%, rgba(168,123,30,0.28) 100%)',
        border: '1px solid rgba(212,175,55,0.45)',
        color: 'var(--accent)',
      }}
    >
      <Sparkles className="w-2.5 h-2.5" />
      Pro
    </span>
  );
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { userId } = useAuth();
  const { plan } = useSubscription();
  const t = useTranslations('nav');

  const navLinks = NAV_HREFS.map((href, i) => ({ label: t(NAV_KEYS[i]), href }));

  return (
    <header className="bg-surface border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">

        {/* ── Desktop ──────────────────────────────────────────────── */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <Zap className="w-5 h-5 text-accent" />
            <span className="velifa-wordmark text-sm">VELIFA</span>
          </Link>

          <nav className="flex-1 flex items-center justify-center gap-8">
            {navLinks.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="text-sm text-text-muted hover:text-accent transition-colors"
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3 flex-shrink-0">
            <LanguageSwitcher variant="header" />
            <ThemeToggle />
            {userId ? (
              <>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1.5 text-sm text-text-muted hover:text-accent transition-colors whitespace-nowrap"
                >
                  {t('dashboard')}
                  <HeaderPlanBadge plan={plan} />
                </Link>
                <UserButton />
              </>
            ) : (
              <Link href="/sign-in" className="velifa-btn velifa-btn--ghost text-xs">
                {t('login')}
              </Link>
            )}
          </div>
        </div>

        {/* ── Mobile ───────────────────────────────────────────────── */}
        <div className="flex md:hidden items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-accent" />
            <span className="velifa-wordmark text-sm">VELIFA</span>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="header" />
            <ThemeToggle />
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-velifa-md text-text-muted hover:text-accent hover:bg-surface transition"
              aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* ── Mobile menu ──────────────────────────────────────────── */}
        {menuOpen && (
          <nav className="md:hidden pt-4 pb-2 border-t border-border mt-4 space-y-1">
            {navLinks.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="block py-3 px-2 text-sm text-text-muted hover:text-accent hover:bg-surface-raised rounded-velifa-md transition"
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </Link>
            ))}
            <div className="pt-3 border-t border-border mt-3 flex items-center justify-between">
              {userId ? (
                <>
                  <div className="flex flex-col gap-1">
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2 py-3 px-2 text-sm text-text-muted hover:text-accent hover:bg-surface-raised rounded-velifa-md transition"
                      onClick={() => setMenuOpen(false)}
                    >
                      {t('dashboard')}
                      <HeaderPlanBadge plan={plan} />
                    </Link>
                    <span className="px-2 text-xs text-text-subtle">Mon compte</span>
                  </div>
                  <UserButton />
                </>
              ) : (
                <Link
                  href="/sign-in"
                  className="block py-3 px-2 text-sm text-text-muted hover:text-accent hover:bg-surface-raised rounded-velifa-md transition"
                  onClick={() => setMenuOpen(false)}
                >
                  {t('login')}
                </Link>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
