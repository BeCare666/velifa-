'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useClerk, useUser, useAuth } from '@clerk/nextjs';
import {
  LayoutDashboard, Users, BarChart2, DollarSign,
  Server, LogOut, Shield, Menu, X, TrendingUp, Bell, Target, Inbox, Tags, ArrowLeft,
} from 'lucide-react';
import { api } from '@/lib/api';
import { BrandMark } from '@/components/layout/Header';

// Espace interne au propriétaire : libellés en français.
const NAV = [
  { href: '/admin',             icon: LayoutDashboard, label: 'Vue générale'  },
  { href: '/admin/users',       icon: Users,           label: 'Utilisateurs'  },
  { href: '/admin/audits',      icon: BarChart2,       label: 'Audits'        },
  { href: '/admin/prospects',   icon: Target,          label: 'Prospects'     },
  { href: '/admin/leads',       icon: Inbox,           label: 'Demandes'      },
  { href: '/admin/performance', icon: TrendingUp,      label: 'Performance'   },
  { href: '/admin/revenue',     icon: DollarSign,      label: 'Revenus'       },
  { href: '/admin/plans',       icon: Tags,            label: 'Plans et prix' },
  { href: '/admin/system',      icon: Server,          label: 'Système'       },
  { href: '/admin/notifications', icon: Bell,          label: 'Notifications' },
];

const W = 252;

/** Chemin sans préfixe de langue : avant, « /fr/admin » ≠ « /admin » → aucun lien n'était actif. */
const stripLocale = (p: string) => p.replace(/^\/(fr|en|ar)(?=\/|$)/, '') || '/';

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = stripLocale(usePathname());
  const { signOut } = useClerk();
  const { user } = useUser();
  const { getToken } = useAuth();
  const [unread, setUnread] = useState(0);

  const name = user?.fullName ?? user?.firstName ?? 'Admin';
  const initial = (user?.firstName?.[0] ?? 'A').toUpperCase();
  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href));

  useEffect(() => {
    async function fetchBadge() {
      try {
        const token = await getToken().catch(() => null);
        const res = await api.admin.getNotifications(token);
        setUnread((res?.data ?? res)?.unread ?? 0);
      } catch { /* noop */ }
    }
    fetchBadge();
    const interval = setInterval(fetchBadge, 60_000);
    return () => clearInterval(interval);
  }, [getToken]);

  return (
    <div className="flex h-full flex-col border-e border-border bg-[color:var(--bg-subtle)]">
      <div className="flex h-16 flex-shrink-0 items-center justify-between px-5">
        <span className="flex items-center gap-2.5">
          <BrandMark />
          <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest"
            style={{ color: 'var(--velifa-score-poor)', background: 'var(--velifa-score-poor-bg)' }}>
            <Shield className="h-2.5 w-2.5" /> Admin
          </span>
        </span>
        {onClose && (
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full border border-border text-text" aria-label="Fermer le menu">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <ul className="space-y-0.5">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = isActive(href);
            const badge = href === '/admin/notifications' ? unread : 0;
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex items-center gap-3 rounded-[9px] px-3 py-2 text-sm transition-colors ${
                    active ? 'bg-[color:var(--accent-soft)] font-medium text-text' : 'text-text-muted hover:bg-[color:var(--accent-soft)] hover:text-text'
                  }`}
                >
                  {active && <span className="absolute start-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-e-full bg-[color:var(--accent)]" />}
                  <Icon className="h-4 w-4 flex-shrink-0" strokeWidth={active ? 2 : 1.75} />
                  <span className="flex-1">{label}</span>
                  {badge > 0 && (
                    <span className="grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-semibold text-white" style={{ background: 'var(--velifa-score-poor)' }}>
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-border px-3 py-2">
        <Link href="/dashboard" className="flex items-center gap-2.5 rounded-[9px] px-3 py-2 text-xs text-text-muted transition-colors hover:bg-[color:var(--accent-soft)] hover:text-text">
          <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
          Retour à l&apos;espace client
        </Link>
      </div>

      <div className="flex items-center gap-3 border-t border-border px-4 py-4">
        <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full border border-[color:var(--border-strong)] bg-[color:var(--surface-raised)] text-xs font-semibold text-text">
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text">{name}</p>
          <p className="truncate text-xs text-text-subtle">Administrateur</p>
        </div>
        <button
          onClick={() => signOut({ redirectUrl: '/' })}
          className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full text-text-subtle transition-colors hover:bg-[color:var(--velifa-score-poor-bg)] hover:text-[color:var(--velifa-score-poor)]"
          title="Déconnexion"
          aria-label="Déconnexion"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}

export default function AdminSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [mobileOpen]);

  return (
    <>
      <aside className="sticky top-0 hidden h-screen flex-shrink-0 md:flex md:flex-col" style={{ width: W, minWidth: W }}>
        <SidebarContent />
      </aside>

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
          style={{ width: W }}
        >
          <SidebarContent onClose={() => setMobileOpen(false)} />
        </aside>
      </div>

      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-[color-mix(in_srgb,var(--bg)_85%,transparent)] px-4 backdrop-blur-xl md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="grid h-9 w-9 place-items-center rounded-full border border-border text-text"
          aria-label="Ouvrir le menu"
          aria-expanded={mobileOpen}
        >
          <Menu className="h-4 w-4" />
        </button>
        <BrandMark />
        <span className="ms-auto text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--velifa-score-poor)' }}>Admin</span>
      </div>
    </>
  );
}
