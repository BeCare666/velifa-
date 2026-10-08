'use client';

import { usePathname } from '@/navigation';
import Header from './Header';
import { isAppSection } from './appSections';

/**
 * Layout client racine.
 * Le Header est masqué sur les sections applicatives (dashboard, rapport…) qui ont
 * leur propre navigation. usePathname de next-intl renvoie le chemin sans /fr|/en|/ar.
 */
export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <>
      {!isAppSection(pathname) && <Header />}
      {children}
    </>
  );
}
