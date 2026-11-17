'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import {
  LayoutDashboard, BarChart2, Globe, Plus, Settings, CreditCard, HelpCircle, LogOut, Menu, X, Sparkles, Gem,
} from 'lucide-react';
import { useUser, useClerk } from '@clerk/nextjs';
import { useSubscription } from '@/context/SubscriptionContext';
import NewAuditModal from '@/components/audit/NewAuditModal';
import { BrandMark } from '@/components/layout/Header';

const SIDEBAR_W = 264;

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  match: (p: string) => boolean;
}

/** Chemin sans préfixe de langue (/fr/dashboard → /dashboard). */
const stripLocale = (p: string) => p.replace(/^\/(fr|en|ar)(?=\/|$)/, '') || '/';

function PlanChip({ plan }: { plan: 'pro' | 'business' | null }) {
  const tCommon = useTranslations('common');
  const Icon = plan === 'business' ? Gem : plan === 'pro' ? Sparkles : null;
  return (
    <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full border border-border px-1.5 py-px text-[10px] font-medium text-text-muted">
      {Icon && <Icon className="h-2.5 w-2.5" />}
      {plan === 'business' ? tCommon('business') : plan === 'pro' ? tCommon('pro') : tCommon('free')}
    </span>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={`relative flex items-center gap-3 rounded-[9px] px-3 py-2 text-sm transition-colors ${
        active ? 'bg-[color:var(--accent-soft)] font-medium text-text' : 'text-text-muted hover:bg-[color:var(--accent-soft)] hover:text-text'
      }`}
    >
      {active && <span className="absolute start-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-e-full bg-[color:var(--accent)]" />}
      <Icon className="h-4 w-4 flex-shrink-0" strokeWidth={active ? 2 : 1.75} />
      {item.label}
    </Link>
  );
}

function SidebarContent({ onClose, onNewAudit }: { onClose?: () => void; onNewAudit: () => void }) {
  const pathname = stripLocale(usePathname());
  const { user } = useUser();
  const { signOut } = useClerk();
  const { plan } = useSubscription();
  const t = useTranslations('dashboard');
  const tNav = useTranslations('nav');

  const main: NavItem[] = [
    { icon: LayoutDashboard, label: tNav('dashboard'), href: '/dashboard', match: (p) => p === '/dashboard' || p.startsWith('/analyse/') },
    { icon: BarChart2, label: t('myAudits'), href: '/audits', match: (p) => p.startsWith('/audits') },
    ...(plan === 'business'
      ? [{ icon: Globe, label: t('multiSite'), href: '/dashboard#multisites', match: () => false }]
      : []),
  ];
  const account: NavItem[] = [
    { icon: Settings, label: t('settings'), href: '/settings', match: (p) => p.startsWith('/settings') },
    { icon: CreditCard, label: t('billing'), href: '/billing', match: (p) => p.startsWith('/billing') },
    { icon: HelpCircle, label: t('support'), href: '/support', match: (p) => p.startsWith('/support') },
  ];

  const name = user?.fullName ?? user?.firstName ?? user?.username ?? '';
  const email = user?.primaryEmailAddress?.emailAddress ?? '';
  const init = (user?.firstName?.[0] ?? user?.username?.[0] ?? 'U').toUpperCase();

  return (
    <div className="flex h-full flex-col border-e border-border bg-[color:var(--bg-subtle)]">
      <div className="flex h-16 flex-shrink-0 items-center justify-between px-5">
        <Link href="/"><BrandMark /></Link>
        {onClose && (
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full border border-border text-text" aria-label={tNav('closeMenu')}>
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="px-4 pb-2 pt-1">
        <button onClick={onNewAudit} className="velifa-btn w-full !py-2.5">
          <Plus className="h-4 w-4" strokeWidth={2.25} />
          {t('newAudit')}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <ul className="space-y-0.5">
          {main.map((item) => <li key={item.href}><NavLink item={item} active={item.match(pathname)} /></li>)}
        </ul>
        <p className="velifa-eyebrow mt-6 px-3 pb-2 !text-[10px]">{tNav('account')}</p>
        <ul className="space-y-0.5">
          {account.map((item) => <li key={item.href}><NavLink item={item} active={item.match(pathname)} /></li>)}
        </ul>
      </nav>

      <div className="border-t border-border px-3 py-3">
        <LanguageSwitcher variant="sidebar" />
      </div>

      <div className="flex items-center gap-3 border-t border-border px-4 py-4">
        <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full border border-[color:var(--border-strong)] bg-[color:var(--surface-raised)] text-xs font-semibold text-text">
          {init}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-medium text-text">{name}</span>
            <PlanChip plan={plan} />
          </div>
          <p className="truncate text-xs text-text-subtle">{email}</p>
        </div>
        <button
          onClick={() => signOut({ redirectUrl: '/' })}
          className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full text-text-subtle transition-colors hover:bg-[color:var(--velifa-score-poor-bg)] hover:text-[color:var(--velifa-score-poor)]"
          aria-label={t('logout')}
          title={t('logout')}
        >
          <LogOut className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}

export default function DashboardSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const tDash = useTranslations('dashboard');
  const tNav = useTranslations('nav');
  const pathname = usePathname();

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Tiroir mobile : Échap pour fermer, page bloquée derrière
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [mobileOpen]);

  function openAudit() {
    setMobileOpen(false);
    setAuditModalOpen(true);
  }

  return (
    <>
      {auditModalOpen && <NewAuditModal onClose={() => setAuditModalOpen(false)} />}

      {/* ── Ordinateur : barre fixe ─────────────────────────────────── */}
      <aside className="sticky top-0 hidden h-screen flex-shrink-0 md:flex md:flex-col" style={{ width: SIDEBAR_W, minWidth: SIDEBAR_W }}>
        <SidebarContent onNewAudit={openAudit} />
      </aside>

      {/* ── Mobile : tiroir du côté de lecture (gauche FR/EN, droite AR) ── */}
      <div className={`fixed inset-0 z-[70] md:hidden ${mobileOpen ? '' : 'pointer-events-none'}`} aria-hidden={!mobileOpen}>
        <div
          onClick={() => setMobileOpen(false)}
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${mobileOpen ? 'opacity-100' : 'opacity-0'}`}
        />
        <aside
          role="dialog"
          aria-modal="true"
          className={`absolute inset-y-0 start-0 flex flex-col shadow-2xl transition-transform duration-300 ease-velifa ${
            mobileOpen ? 'translate-x-0' : 'ltr:-translate-x-full rtl:translate-x-full'
          }`}
          style={{ width: SIDEBAR_W }}
        >
          <SidebarContent onClose={() => setMobileOpen(false)} onNewAudit={openAudit} />
        </aside>
      </div>

      {/* ── Mobile : barre supérieure ───────────────────────────────── */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-[color-mix(in_srgb,var(--bg)_85%,transparent)] px-4 backdrop-blur-xl md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="grid h-9 w-9 place-items-center rounded-full border border-border text-text"
          aria-label={tNav('openMenu')}
          aria-expanded={mobileOpen}
        >
          <Menu className="h-4 w-4" />
        </button>
        <BrandMark />
        <button onClick={openAudit} className="velifa-btn ms-auto !rounded-full !px-3 !py-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
          {tDash('newAudit')}
        </button>
      </div>
    </>
  );
}
