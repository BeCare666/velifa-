'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { LayoutDashboard, BarChart2, Globe, Plus, Settings, CreditCard, HelpCircle, LogOut, Menu, X, Sparkles, Gem } from 'lucide-react';
import { useUser, useClerk } from '@clerk/nextjs';
import { useSubscription } from '@/context/SubscriptionContext';
import NewAuditModal from '@/components/audit/NewAuditModal';

// ── Constants ────────────────────────────────────────────────────────────────
const SIDEBAR_W = 260;

// ── Types ────────────────────────────────────────────────────────────────────
interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  match: (p: string) => boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function initials(user: ReturnType<typeof useUser>['user']): string {
  return (user?.firstName?.[0] ?? user?.username?.[0] ?? 'U').toUpperCase();
}

function fullName(user: ReturnType<typeof useUser>['user']): string {
  return user?.fullName ?? user?.firstName ?? user?.username ?? 'Utilisateur';
}

// ── Plan badge (inline, compact) ─────────────────────────────────────────────
function PlanChip({ plan }: { plan: 'pro' | 'business' | null }) {
  const tCommon = useTranslations('common');
  if (plan === 'business') return (
    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#C8C8C8', background: 'rgba(200,200,200,0.10)', border: '1px solid rgba(200,200,200,0.22)', borderRadius: 999, padding: '1px 7px', flexShrink: 0 }}>
      💎 {tCommon('business')}
    </span>
  );
  if (plan === 'pro') return (
    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#D4AF37', background: 'rgba(212,175,55,0.10)', border: '1px solid rgba(212,175,55,0.28)', borderRadius: 999, padding: '1px 7px', flexShrink: 0 }}>
      ⚡ {tCommon('pro')}
    </span>
  );
  return (
    <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', color: 'var(--text-subtle)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 999, padding: '1px 7px', flexShrink: 0 }}>
      {tCommon('free')}
    </span>
  );
}

// ── User popup menu ───────────────────────────────────────────────────────────
function UserPopup({ onClose }: { onClose: () => void }) {
  const { signOut } = useClerk();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const t = useTranslations('dashboard');

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const items = [
    { icon: Settings,   label: t('settings'), href: '/settings' },
    { icon: CreditCard, label: t('billing'),   href: '/billing'  },
    { icon: HelpCircle, label: t('support'),   href: '/support'  },
  ];

  function goto(href: string) {
    onClose();
    router.push(href);
  }

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 mb-2 w-52 rounded-[12px] overflow-hidden"
      style={{
        background: '#1a1a1a',
        border: '1px solid rgba(255,255,255,0.10)',
        boxShadow: '0 16px 48px rgba(0,0,0,0.70)',
        zIndex: 200,
      }}
    >
      {items.map(({ icon: Icon, label, href }) => (
        <button
          key={href}
          onClick={() => goto(href)}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-start text-sm transition-colors duration-100"
          style={{ color: 'rgba(255,255,255,0.75)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} style={{ color: 'rgba(255,255,255,0.40)' }} />
          {label}
        </button>
      ))}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '2px 0' }} />
      <button
        onClick={() => { onClose(); signOut({ redirectUrl: '/' }); }}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-start text-sm transition-colors duration-100"
        style={{ color: 'rgba(255,255,255,0.75)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(239,68,68,0.10)';
          e.currentTarget.style.color = '#f87171';
          (e.currentTarget.querySelector('svg') as SVGElement | null)?.style.setProperty('color', '#f87171');
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'rgba(255,255,255,0.75)';
          (e.currentTarget.querySelector('svg') as SVGElement | null)?.style.setProperty('color', 'rgba(255,255,255,0.40)');
        }}
      >
        <LogOut className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} style={{ color: 'rgba(255,255,255,0.40)' }} />
        {t('logout')}
      </button>
    </div>
  );
}

// ── Nav link ─────────────────────────────────────────────────────────────────
function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className="flex items-center gap-3 px-3 py-2 rounded-[8px] text-sm relative transition-all duration-150 group"
      style={{
        color:      active ? '#D4AF37'              : 'rgba(255,255,255,0.65)',
        background: active ? 'rgba(212,175,55,0.08)' : 'transparent',
        fontWeight: active ? 500 : 400,
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Barre gauche active */}
      {active && (
        <span
          className="absolute start-0 top-1/2 -translate-y-1/2 rounded-e-full"
          style={{ width: 2, height: 18, background: '#D4AF37' }}
        />
      )}
      <Icon
        className="w-4 h-4 flex-shrink-0"
        strokeWidth={active ? 2 : 1.75}
        style={{ color: active ? '#D4AF37' : 'rgba(255,255,255,0.40)' }}
      />
      {item.label}
    </Link>
  );
}

// ── Sidebar content (partagé desktop + mobile) ────────────────────────────────
function SidebarContent({ onClose, onNewAudit }: { onClose?: () => void; onNewAudit: () => void }) {
  const pathname = usePathname();
  const { user }  = useUser();
  const { plan }  = useSubscription();
  const [popupOpen, setPopupOpen] = useState(false);
  const t = useTranslations('dashboard');

  const isBusiness = plan === 'business';

  const NAV: NavItem[] = [
    {
      icon: LayoutDashboard,
      label: 'Dashboard',
      href: '/dashboard',
      match: (p) => p === '/dashboard' || p.startsWith('/analyse/'),
    },
    {
      icon: BarChart2,
      label: t('myAudits'),
      href: '/audits',
      match: (p) => p === '/audits' || p.startsWith('/audits/'),
    },
    ...(isBusiness ? [{
      icon: Globe,
      label: t('multiSite'),
      href: '/dashboard#multisites',
      match: () => false,
    }] : []),
  ];

  const name  = fullName(user);
  const email = user?.primaryEmailAddress?.emailAddress ?? '';
  const init  = initials(user);

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: '#0f0f0f', borderRight: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* ── Logo ──────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between flex-shrink-0"
        style={{ padding: '20px 20px 0' }}
      >
        <Link href="/" className="flex items-center gap-2 min-w-0">
          <span
            className="velifa-wordmark tracking-widest"
            style={{ fontSize: 15, color: '#D4AF37', letterSpacing: '0.20em' }}
          >
            VELIFA
          </span>
        </Link>
        {/* Bouton fermer — mobile uniquement */}
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-[6px] text-text-subtle hover:text-text transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── CTA Nouvel audit ──────────────────────────────────────── */}
      <div style={{ padding: '16px 16px 8px' }}>
        <button
          onClick={onNewAudit}
          className="flex items-center justify-center gap-2 w-full rounded-[10px] text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, #D4AF37 0%, #A87B1E 100%)',
            color:      '#0A0A0A',
            height:     38,
            boxShadow:  '0 2px 12px rgba(212,175,55,0.25)',
            border:     'none',
            cursor:     'pointer',
          }}
        >
          <Plus style={{ width: 15, height: 15, strokeWidth: 2.5 }} />
          {t('newAudit')}
        </button>
      </div>

      {/* ── Navigation ────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto" style={{ padding: '8px 12px' }}>
        <div className="space-y-0.5">
          {NAV.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={item.match(pathname)}
            />
          ))}
        </div>
      </nav>

      {/* ── Séparateur ────────────────────────────────────────────── */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 16px' }} />

      {/* ── Sélecteur de langue ───────────────────────────────────── */}
      <div style={{ padding: '8px 12px 4px' }}>
        <LanguageSwitcher variant="sidebar" />
      </div>

      {/* ── Séparateur ────────────────────────────────────────────── */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 16px' }} />

      {/* ── Section utilisateur ───────────────────────────────────── */}
      <div className="flex-shrink-0 relative" style={{ padding: '14px 16px 18px' }}>
        {popupOpen && <UserPopup onClose={() => setPopupOpen(false)} />}

        <button
          onClick={() => setPopupOpen((o) => !o)}
          className="w-full flex items-center gap-3 min-w-0 rounded-[8px] text-start transition-colors duration-150 group"
          style={{ padding: '6px 8px' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          {/* Avatar */}
          <div
            className="flex items-center justify-center text-xs font-bold flex-shrink-0 rounded-full"
            style={{
              width: 32,
              height: 32,
              background: 'rgba(212,175,55,0.15)',
              color: '#D4AF37',
              border: '1px solid rgba(212,175,55,0.30)',
            }}
          >
            {init}
          </div>

          {/* Nom + email + badge */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="text-sm truncate"
                style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500, maxWidth: 110 }}
              >
                {name}
              </span>
              <PlanChip plan={plan} />
            </div>
            <p
              className="text-xs truncate"
              style={{ color: 'rgba(255,255,255,0.35)', marginTop: 1 }}
            >
              {email}
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}

// ── Export principal ──────────────────────────────────────────────────────────
export default function DashboardSidebar() {
  const [mobileOpen,    setMobileOpen]    = useState(false);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const tDash = useTranslations('dashboard');
  const pathname = usePathname();

  // Ferme le drawer mobile à chaque changement de route
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  function openAudit() {
    setMobileOpen(false);      // ferme le drawer si ouvert sur mobile
    setAuditModalOpen(true);
  }

  return (
    <>
      {/* ── Modal Nouvel audit (overlay global, z-[9999]) ──────────── */}
      {auditModalOpen && (
        <NewAuditModal onClose={() => setAuditModalOpen(false)} />
      )}

      {/* ── Desktop sidebar (fixe, toujours visible) ───────────────── */}
      <aside
        className="hidden md:flex flex-col h-screen sticky top-0 flex-shrink-0"
        style={{ width: SIDEBAR_W, minWidth: SIDEBAR_W }}
      >
        <SidebarContent onNewAudit={openAudit} />
      </aside>

      {/* ── Mobile overlay ─────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-50"
          onClick={() => setMobileOpen(false)}
          style={{ background: 'rgba(0,0,0,0.60)', backdropFilter: 'blur(2px)' }}
        />
      )}

      {/* ── Mobile drawer ──────────────────────────────────────────── */}
      <aside
        className="md:hidden fixed inset-y-0 left-0 z-50 flex flex-col"
        style={{
          width:     SIDEBAR_W,
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition:'transform 250ms cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        <SidebarContent onClose={() => setMobileOpen(false)} onNewAudit={openAudit} />
      </aside>

      {/* ── Mobile top bar ─────────────────────────────────────────── */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center gap-3 h-12 px-4"
        style={{ background: '#0f0f0f', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <button
          onClick={() => setMobileOpen(true)}
          className="p-1.5 rounded-[6px] transition-colors"
          style={{ color: 'rgba(255,255,255,0.55)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          aria-label="Ouvrir le menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="velifa-wordmark text-sm" style={{ color: '#D4AF37', letterSpacing: '0.18em' }}>
          VELIFA
        </span>
        {/* Bouton Nouvel audit rapide sur mobile */}
        <button
          onClick={openAudit}
          className="ms-auto flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-semibold transition-all"
          style={{
            background: 'rgba(212,175,55,0.12)',
            border:     '1px solid rgba(212,175,55,0.28)',
            color:      '#D4AF37',
          }}
        >
          <Plus style={{ width: 13, height: 13, strokeWidth: 2.5 }} />
          {tDash('newAudit')}
        </button>
      </div>
    </>
  );
}
