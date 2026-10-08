'use client';

import { usePathname } from '@/navigation';
import Footer from './Footer';
import { isAppSection } from './appSections';

/** Masque le Footer sur les sections applicatives (chemin sans préfixe de langue). */
export default function ClientFooter() {
  const pathname = usePathname();
  if (isAppSection(pathname)) return null;
  return <Footer />;
}
