const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/**
 * Tableau de bord intégré dans l'espace marchand Salla (iframe, ROADMAP 3.4) : seules les pages /salla/* peuvent être
 * affichées dans une iframe, et uniquement par les domaines listés dans SALLA_FRAME_ANCESTORS.
 * ⚠️ Domaine exact de l'espace marchand à confirmer lors du test réel (boutique de démo).
 */
const SALLA_FRAME_ANCESTORS = process.env.SALLA_FRAME_ANCESTORS || 'https://salla.sa https://*.salla.sa';

const securityHeaders = [
  { key: 'X-Content-Type-Options',  value: 'nosniff' },
  { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  async headers() {
    return [
      {
        // Toutes les pages sauf /salla/* et /{ar,en,fr}/salla/* : aucune intégration en iframe
        source: '/((?!(?:ar/|en/|fr/)?salla(?:/|$)).*)',
        headers: [{ key: 'X-Frame-Options', value: 'DENY' }, ...securityHeaders],
      },
      {
        source: '/:locale(ar|en|fr)/salla/:path*',
        headers: [{ key: 'Content-Security-Policy', value: `frame-ancestors ${SALLA_FRAME_ANCESTORS}` }, ...securityHeaders],
      },
      {
        source: '/salla/:path*',
        headers: [{ key: 'Content-Security-Policy', value: `frame-ancestors ${SALLA_FRAME_ANCESTORS}` }, ...securityHeaders],
      },
    ];
  },
};

module.exports = withNextIntl(nextConfig);
