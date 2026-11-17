import { Inter, IBM_Plex_Sans_Arabic } from 'next/font/google';

// Latin : Inter (sobre, très lisible, standard des produits professionnels)
const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

// Arabe : IBM Plex Sans Arabic (marché prioritaire ; avant : aucune police arabe, rendu système)
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-arabic',
  display: 'swap',
});

export const fontVariables = [inter.variable, plexArabic.variable].join(' ');
