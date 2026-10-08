'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useClerk, useUser, useAuth } from '@clerk/nextjs';
import {
  LayoutDashboard, Users, BarChart2, DollarSign,
  Server, LogOut, Zap, Shield, Menu, X, TrendingUp, Bell,
} from 'lucide-react';
import { api } from '@/lib/api';

const NAV = [
  { href: '/admin',             icon: LayoutDashboard, label: 'Vue generale'   },
  { href: '/admin/users',       icon: Users,           label: 'Utilisateurs'   },
  { href: '/admin/audits',      icon: BarChart2,       label: 'Audits'         },
  { href: '/admin/performance', icon: TrendingUp,      label: 'Performance'    },
  { href: '/admin/revenue',     icon: DollarSign,      label: 'Revenus'        },
  { href: '/admin/system',      icon: Server,          label: 'Systeme'        },
];

const W = 240;

function NavLink({ item, active, badge }: { item: typeof NAV[0]; active: boolean; badge?: number }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className="flex items-center gap-3 px-3 py-2 rounded-[8px] text-sm transition-all duration-150 relative"
      style={{
        color:      active ? '#ef4444' : 'rgba(255,255,255,0.62)',
        background: active ? 'rgba(239,68,68,0.10)' : 'transparent',
        fontWeight: active ? 500 : 400,
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full"
          style={{ width: 2, height: 18, background: '#ef4444' }} />
      )}
      <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={active ? 2 : 1.75}
        style={{ color: active ? '#ef4444' : 'rgba(255,255,255,0.38)' }} />
      <span className="flex-1">{item.label}</span>
      {badge != null && badge > 0 && (
        <span style={{ fontSize: 9, fontWeight: 700, minWidth: 16, height: 16, borderRadius: 8, background: '#ef4444', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  );
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const { user }    = useUser();
  const { getToken } = useAuth();
  const [unread, setUnread] = useState(0);

  const name    = user?.fullName ?? user?.firstName ?? 'Admin';
  const initial = (user?.firstName?.[0] ?? 'A').toUpperCase();

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  }

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
    <div className="flex flex-col h-full"
      style={{ background: '#080808', borderRight: '1px solid rgba(239,68,68,0.15)' }}>

      {/* Logo + badge ADMIN */}
      <div className="flex items-center justify-between px-5 py-5 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[6px] flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.30)' }}>
            <Shield className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />
          </div>
          <span className="velifa-wordmark text-sm tracking-widest" style={{ color: '#D4AF37' }}>
            VELIFA
          </span>
          
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-[6px] transition-colors"
            style={{ color: 'rgba(255,255,255,0.35)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div style={{ height: 1, background: 'rgba(239,68,68,0.12)', margin: '0 16px 8px' }} />

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {NAV.map(item => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} />
        ))}
        {/* Notifications link */}
        <Link
          href="/admin/notifications"
          className="flex items-center gap-3 px-3 py-2 rounded-[8px] text-sm transition-all duration-150"
          style={{ color: 'rgba(255,255,255,0.62)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <Bell className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} style={{ color: 'rgba(255,255,255,0.38)' }} />
          <span className="flex-1">Notifications</span>
          {unread > 0 && (
            <span style={{ fontSize: 9, fontWeight: 700, minWidth: 16, height: 16, borderRadius: 8, background: '#ef4444', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Link>
      </nav>

      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '8px 16px' }} />

      {/* Lien retour dashboard */}
      <div className="px-3 pb-2">
        <Link href="/dashboard"
          className="flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-xs transition-all"
          style={{ color: 'rgba(255,255,255,0.40)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.70)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.40)'; }}>
          <Zap className="w-3.5 h-3.5" />
          Retour au dashboard
        </Link>
      </div>

      {/* User + logout */}
      <div className="flex-shrink-0 px-3 pb-5 pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2.5 px-2 pt-3">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.28)' }}>
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: 'rgba(255,255,255,0.80)' }}>{name}</p>
            <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>Administrateur</p>
          </div>
          <button onClick={() => signOut({ redirectUrl: '/' })}
            className="p-1.5 rounded-[6px] transition-all flex-shrink-0"
            style={{ color: 'rgba(255,255,255,0.35)' }}
            title="Deconnexion"
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.10)'; e.currentTarget.style.color = '#ef4444'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}>
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  return (
    <>
      {/* Desktop */}
      <aside className="hidden md:flex flex-col h-screen sticky top-0 flex-shrink-0"
        style={{ width: W, minWidth: W }}>
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50"
          onClick={() => setMobileOpen(false)}
          style={{ background: 'rgba(0,0,0,0.70)' }} />
      )}

      {/* Mobile drawer */}
      <aside className="md:hidden fixed inset-y-0 left-0 z-50 flex flex-col"
        style={{ width: W, transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 250ms cubic-bezier(0.22,1,0.36,1)' }}>
        <SidebarContent onClose={() => setMobileOpen(false)} />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center gap-3 h-12 px-4"
        style={{ background: '#080808', borderBottom: '1px solid rgba(239,68,68,0.15)' }}>
        <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-[6px]"
          style={{ color: 'rgba(255,255,255,0.55)' }}>
          <Menu className="w-5 h-5" />
        </button>
        <span className="velifa-wordmark text-sm" style={{ color: '#D4AF37' }}>VELIFA</span>
        <span className="text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded-[4px]"
          style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>ADMIN</span>
      </div>
    </>
  );
}
