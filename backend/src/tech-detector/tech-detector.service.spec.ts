import { Readable } from 'stream';
import { detectFromHtml, primaryPlatform, readCapped } from './tech-detector.service';

/**
 * Extraits réels relevés le 2026-10-08 (HTML de boutiques en ligne, classements StoreLeads).
 * Gardés courts : seule la partie contenant le marqueur.
 */
const REAL = {
  salla:   '<link rel="preload" href="https://cdn.salla.network/fonts/sallaicons.css?v=2.0.5" as="style">',     // 3saf.com
  sallaBotPage: '<link rel="icon" type="image/png" sizes="32x32" href="https://cdn.salla.network/images/logo/logo-square.png">', // page 403 anti-robot
  zid:     '<link rel="preconnect" href="https://static.zid.store" crossorigin />',                               // alfajr.com
  shopify: '<link rel="preconnect" href="https://cdn.shopify.com" crossorigin>',
  woo:     '<link rel="stylesheet" href="https://shop.example/wp-content/plugins/woocommerce/assets/css/woocommerce.css">',
  magento: '<script src="https://shop.example/static/version1700000000/frontend/Magento_Theme/js/theme.js"></script>',
  bigcommerce: '<script src="https://cdn11.bigcommerce.com/s-abc123/stencil/theme.js"></script>',
};

const platformOf = (html: string, headers: Record<string, string> = {}) => primaryPlatform(detectFromHtml(html, headers));

describe('detectFromHtml — plateformes e-commerce', () => {
  it.each([
    ['Salla', REAL.salla],
    ['Salla', REAL.sallaBotPage],
    ['Zid', REAL.zid],
    ['Shopify', REAL.shopify],
    ['WooCommerce', REAL.woo],
    ['Magento', REAL.magento],
    ['BigCommerce', REAL.bigcommerce],
  ])('reconnaît %s', (expected, html) => {
    expect(platformOf(html)).toBe(expected);
  });

  it('aucune plateforme ne déclenche les signatures d’une autre', () => {
    for (const [name, html] of Object.entries(REAL)) {
      const platforms = detectFromHtml(html, {}).filter((t) => t.category === 'E-commerce');
      expect({ name, count: platforms.length }).toEqual({ name, count: 1 });
    }
  });

  it('boutique Salla avec des images sur cdn.shopify.com → Salla seulement (cas réel 3saf.com)', () => {
    const html = REAL.salla + '<img src="https://cdn.shopify.com/s/files/1/0621/8081/9111/files/x.png">';
    const platforms = detectFromHtml(html, {}).filter((t) => t.category === 'E-commerce').map((t) => t.name);
    expect(platforms).toEqual(['Salla']);
  });

  it('Salla via l’en-tête CSP quand le HTML ne contient rien', () => {
    expect(platformOf('<html></html>', {
      'Content-Security-Policy': "frame-ancestors 'self' https://s.salla.sa https://mahally.com/",
    })).toBe('Salla');
  });

  it('Magento via l’en-tête x-magento-cache-debug', () => {
    expect(platformOf('<html></html>', { 'X-Magento-Cache-Debug': 'MISS' })).toBe('Magento');
  });

  it('site sans plateforme connue → null', () => {
    expect(platformOf('<html><body>Bonjour</body></html>')).toBeNull();
  });
});

describe('detectFromHtml — autres technologies', () => {
  it('WooCommerce garde aussi WordPress', () => {
    const names = detectFromHtml(REAL.woo, {}).map((t) => t.name);
    expect(names).toEqual(expect.arrayContaining(['WooCommerce', 'WordPress']));
  });

  it('pixels publicitaires courants dans le Golfe', () => {
    const html = `
      <script src="https://connect.facebook.net/en_US/fbevents.js"></script>
      <script src="https://sc-static.net/scevent.min.js"></script>
      <script>ttq.load('ABC');</script>`;
    const names = detectFromHtml(html, {}).map((t) => t.name);
    expect(names).toEqual(expect.arrayContaining(['Meta Pixel', 'Snapchat Pixel', 'TikTok Pixel']));
  });

  it('serveur et version PHP depuis les en-têtes', () => {
    const techs = detectFromHtml('', { server: 'cloudflare', 'x-powered-by': 'PHP/8.3.20' });
    expect(techs).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Cloudflare', category: 'Serveur' }),
      expect.objectContaining({ name: 'PHP', version: '8.3.20' }),
    ]));
  });

  it('version jQuery extraite du nom de fichier', () => {
    const t = detectFromHtml('<script src="/js/jquery-3.6.0.min.js"></script>', {}).find((x) => x.name === 'jQuery');
    expect(t?.version).toBe('3.6.0');
  });
});

describe('readCapped', () => {
  it('lit une page de 11 Mo sans échouer, en gardant le début', async () => {
    const head = '<link href="https://static.zid.store">';
    const big = head + 'x'.repeat(11_000_000);
    const stream = Readable.from([Buffer.from(big.slice(0, 5_000_000)), Buffer.from(big.slice(5_000_000))]);
    const { html, truncated } = await readCapped(stream, 1_500_000);
    expect(html.length).toBeLessThanOrEqual(1_500_000);
    expect(truncated).toBe(true);
    expect(platformOf(html)).toBe('Zid');
  });

  it('page courte : non tronquée', async () => {
    const { truncated } = await readCapped(Readable.from([Buffer.from('<html></html>')]), 1_500_000);
    expect(truncated).toBe(false);
  });
});
