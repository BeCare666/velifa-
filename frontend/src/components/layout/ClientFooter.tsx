'use client';

import { usePathname } from 'next/navigation';
import Footer from './Footer';

/**
 * Wrapper client pour le Footer — le masque sur les pages
 * du dashboard et des rapports (qui ont leur propre sidebar).
 */
export default function ClientFooter() {
  const pathname = usePathname();
  const isDashboardRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/analyse/')  ||
    pathname.startsWith('/audits')    ||
    pathname.startsWith('/settings')  ||
    pathname.startsWith('/billing')   ||
    pathname.startsWith('/support')   ||
    pathname.startsWith('/admin');
  if (isDashboardRoute) return null;
  return <Footer />;
}
