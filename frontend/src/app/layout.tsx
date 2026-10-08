import type { Metadata } from 'next';
import './globals.css';
import '@/styles/velifa-design-system.css';

export const metadata: Metadata = {
  title: 'VELIFA — Web Performance Audit',
  description: 'Analyze your website performance in 30 seconds. Score, Core Web Vitals, detailed report.',
};

/**
 * Racine : simple relais. La balise <html lang dir> est rendue par app/[locale]/layout.tsx
 * (langue connue côté serveur → lang/dir corrects pour Google et les lecteurs d'écran)
 * et par app/(auth)/layout.tsx pour les pages de connexion.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
