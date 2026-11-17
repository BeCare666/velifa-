'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Menu, X, Sparkles, Gem, Home, LayoutGrid, Tag, HelpCircle, Mail, ChevronRight, ArrowRight, LayoutDashboard,
} from 'lucide-react';
import { UserButton, useAuth } from '@clerk/nextjs';
import { useLocale, useTranslations } from 'next-intl';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useSubscription } from '@/context/SubscriptionContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { usePathname } from '@/navigation';

type NavHref = '/' | '/fonctionnalites' | '/tarifs' | '/faq' | '/contact';
const NAV = [
  { href: '/' as NavHref,                key: 'home',     icon: Home },
  { href: '/fonctionnalites' as NavHref, key: 'features', icon: LayoutGrid },
  { href: '/tarifs' as NavHref,          key: 'pricing',  icon: Tag },
  { href: '/faq' as NavHref,             key: 'faq',      icon: HelpCircle },
  { href: '/contact' as NavHref,         key: 'contact',  icon: Mail },
] as const;

/** Monogramme de marque (remplace l'ancienne icône éclair générique). */
export function BrandMark({ className = '' }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <span className="grid h-7 w-7 place-items-center rounded-[8px] bg-[color:var(--accent)] text-[color:var(--text-on-accent)] text-[13px] font-bold leading-none">
        V
      </span>
      <span className="velifa-wordmark text-[13px]">VELIFA</span>
    </span>
  );
}

function HeaderPlanBadge({ plan }: { plan: 'pro' | 'business' | null }) {
  if (!plan) return null;
  const Icon = plan === 'business' ? Gem : Sparkles;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--border-strong)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest leading-none text-text">
      <Icon className="h-2.5 w-2.5" />
      {plan === 'business' ? 'Business' : 'Pro'}
    </span>
  );
}

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { userId } = useAuth();
  const { plan } = useSubscription();
  const t = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();

  const isActive = (href: NavHref) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  // En-tête qui se densifie au défilement
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Panneau mobile : Échap pour fermer, défilement de la page bloqué
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open]);

  // Fermeture à chaque changement de page
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <>
      <header
        className={`sticky top-0 z-50 transition-colors duration-300 ${
          scrolled
            ? 'border-b border-border bg-[color-mix(in_srgb,var(--bg)_82%,transparent)] backdrop-blur-xl'
            : 'border-b border-transparent bg-transparent'
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-5 sm:px-6">
          <Link href="/" aria-label="VELIFA" className="flex-shrink-0">
            <BrandMark />
          </Link>

          {/* ── Navigation ordinateur ─────────────────────────────── */}
          <nav className="hidden flex-1 items-center justify-center gap-1 md:flex">
            {NAV.map(({ href, key }) => (
              <Link
                key={key}
                href={href}
                aria-current={isActive(href) ? 'page' : undefined}
                className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                  isActive(href) ? 'bg-[color:var(--accent-soft)] text-text' : 'text-text-muted hover:text-text'
                }`}
              >
                {t(key)}
              </Link>
            ))}
          </nav>

          <div className="ms-auto hidden items-center gap-2 md:flex">
            <LanguageSwitcher variant="header" />
            <ThemeToggle />
            {userId ? (
              <>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-medium text-text-muted transition-colors hover:text-text"
                >
                  {t('dashboard')}
                  <HeaderPlanBadge plan={plan} />
                </Link>
                <UserButton />
              </>
            ) : (
              <>
                <Link href="/sign-in" className="rounded-full px-3 py-1.5 text-[13px] font-medium text-text-muted transition-colors hover:text-text">
                  {t('login')}
                </Link>
                <Link href={`/${locale}#audit`} className="velifa-btn !rounded-full !px-4 !py-2 text-[13px]">
                  {t('startAudit')}
                </Link>
              </>
            )}
          </div>

          {/* ── Bouton menu mobile ─────────────────────────────────── */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="ms-auto grid h-10 w-10 place-items-center rounded-full border border-border text-text md:hidden"
            aria-label={t('openMenu')}
            aria-expanded={open}
            aria-controls="mobile-nav"
          >
            <Menu className="h-[18px] w-[18px]" />
          </button>
        </div>
      </header>

      {/* ── Panneau latéral mobile ─────────────────────────────────── */}
      <div className={`fixed inset-0 z-[70] md:hidden ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
        />
        <aside
          id="mobile-nav"
          role="dialog"
          aria-modal="true"
          aria-label={t('menu')}
          className={`absolute inset-y-0 start-0 flex w-[86%] max-w-[360px] flex-col border-e border-border bg-[color:var(--bg-subtle)] shadow-2xl transition-transform duration-300 ease-velifa ${
            open ? 'translate-x-0' : 'ltr:-translate-x-full rtl:translate-x-full'
          }`}
        >
          <div className="flex h-16 items-center justify-between border-b border-border px-5">
            <Link href="/" onClick={() => setOpen(false)}><BrandMark /></Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid h-10 w-10 place-items-center rounded-full border border-border text-text"
              aria-label={t('closeMenu')}
            >
              <X className="h-[18px] w-[18px]" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <p className="velifa-eyebrow px-3 pb-3">{t('menu')}</p>
            <ul className="space-y-1">
              {NAV.map(({ href, key, icon: Icon }) => (
                <li key={key}>
                  <Link
                    href={href}
                    onClick={() => setOpen(false)}
                    aria-current={isActive(href) ? 'page' : undefined}
                    className={`group flex items-center gap-3 rounded-velifa-md px-3 py-3 text-[15px] font-medium transition-colors ${
                      isActive(href) ? 'bg-[color:var(--accent-soft)] text-text' : 'text-text-muted hover:bg-[color:var(--accent-soft)] hover:text-text'
                    }`}
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-[10px] border border-border bg-[color:var(--surface)]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1">{t(key)}</span>
                    <ChevronRight className="h-4 w-4 text-text-subtle rtl:rotate-180" />
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-6 border-t border-border pt-5">
              <p className="velifa-eyebrow px-3 pb-3">{t('account')}</p>
              {userId ? (
                <div className="flex items-center justify-between gap-3 px-3">
                  <Link
                    href="/dashboard"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 text-[15px] font-medium text-text"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    {t('dashboard')}
                    <HeaderPlanBadge plan={plan} />
                  </Link>
                  <UserButton />
                </div>
              ) : (
                <Link
                  href="/sign-in"
                  onClick={() => setOpen(false)}
                  className="block rounded-velifa-md px-3 py-3 text-[15px] font-medium text-text-muted hover:text-text"
                >
                  {t('login')}
                </Link>
              )}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border px-3 pt-5">
              <div>
                <p className="mb-2 text-[11px] text-text-subtle">{t('language')}</p>
                <LanguageSwitcher variant="header" />
              </div>
              <div>
                <p className="mb-2 text-[11px] text-text-subtle">{t('theme')}</p>
                <ThemeToggle />
              </div>
            </div>
          </nav>

          <div className="border-t border-border p-4">
            <Link
              href={`/${locale}#audit`}
              onClick={() => setOpen(false)}
              className="velifa-btn w-full !py-3.5 text-[15px]"
            >
              {t('startAudit')}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
