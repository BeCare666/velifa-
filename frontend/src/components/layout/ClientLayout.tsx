'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';

/**
 * Layout client racine.
 * Le Header est masqué sur /dashboard et /analyse/* qui ont
 * leur propre sidebar de navigation.
 */
export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hiddenHeader =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/analyse/')  ||
    pathname.startsWith('/audits')    ||
    pathname.startsWith('/settings')  ||
    pathname.startsWith('/billing')   ||
    pathname.startsWith('/support')   ||
    pathname.startsWith('/admin');

  return (
    <>
      {!hiddenHeader && <Header />}
      {children}
    </>
  );
}
