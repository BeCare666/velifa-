import { Orbitron, Chakra_Petch, Sora } from 'next/font/google';

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

export const fontVariables = [orbitron.variable, chakraPetch.variable, sora.variable].join(' ');
