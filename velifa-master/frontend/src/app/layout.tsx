import type { Metadata } from 'next';
import { Orbitron, Chakra_Petch, Sora } from 'next/font/google';
import './globals.css';
import '@/styles/velifa-design-system.css';
import Providers from '@/components/Providers';

const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800', '900'],
  variable: '--velifa-font-brand',
  display: 'swap',
});

const chakraPetch = Chakra_Petch({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--velifa-font-heading',
  display: 'swap',
});

const sora = Sora({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--velifa-font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'VELIFA — Web Performance Audit',
  description: 'Analyze your website performance in 30 seconds. Score, Core Web Vitals, detailed report.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fontVariables = [orbitron.variable, chakraPetch.variable, sora.variable].join(' ');

  return (
    <html data-theme="dark" className={fontVariables}>
      <body className="antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
