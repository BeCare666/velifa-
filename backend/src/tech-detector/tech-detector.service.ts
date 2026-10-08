import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { Readable } from 'stream';
import { safeHttpAgent, safeHttpsAgent } from '../common/validators/url.validator';
import { runSiteChecks, SiteChecks } from '../site-checks/site-checks';

// ── Types ─────────────────────────────────────────────────────────────────

export type TechCategory = 'E-commerce' | 'CMS' | 'Framework JS' | 'Analytics' | 'Serveur';
export type TechConfidence = 'high' | 'medium' | 'low';

export interface DetectedTech {
  name:       string;
  category:   TechCategory;
  confidence: TechConfidence;
  version?:   string;
}

// ── Signatures de détection ───────────────────────────────────────────────

interface Signature {
  /** 'html' ou le nom du header (lowercase) */
  target:    'html' | string;
  pattern:   RegExp;
  /** Groupe de capture optionnel pour extraire la version */
  versionGroup?: number;
  confidence: TechConfidence;
}

/**
 * Plateformes e-commerce : signatures vérifiées le 2026-10-08 sur des boutiques réelles
 * (classements StoreLeads SA/AE) — voir ROADMAP.md, Journal 1.1.
 * Magento « headless » (façade Next.js) n'est pas détectable depuis le HTML : c'est attendu.
 */
const SIGNATURES: Record<TechCategory, Record<string, Signature[]>> = {
  'E-commerce': {
    'Salla': [
      { target: 'html', pattern: /cdn\.salla\.(?:network|sa)/i,                   confidence: 'high' },
      { target: 'content-security-policy', pattern: /s\.salla\.sa/i,             confidence: 'high' },
    ],
    'Zid': [
      { target: 'html', pattern: /(?:static|media)\.zid\.store/i,                 confidence: 'high' },
    ],
    'Shopify': [
      { target: 'html', pattern: /cdn\.shopify\.com|Shopify\.theme/i,            confidence: 'high' },
    ],
    'WooCommerce': [
      { target: 'html', pattern: /\/wp-content\/plugins\/woocommerce\//i,         confidence: 'high' },
      { target: 'html', pattern: /woocommerce-(?:page|no-js)|wc-block/i,          confidence: 'medium' },
    ],
    'Magento': [
      { target: 'html', pattern: /Magento_[A-Za-z]+\//,                           confidence: 'high' },
      { target: 'x-magento-cache-debug', pattern: /./,                            confidence: 'high' },
    ],
    'BigCommerce': [
      { target: 'html', pattern: /cdn\d*\.bigcommerce\.com/i,                     confidence: 'high' },
    ],
  },
  'CMS': {
    'WordPress': [
      { target: 'html', pattern: /\/wp-content\/|\/wp-includes\/|wp-json/i,    confidence: 'high' },
      { target: 'html', pattern: /var\s+wpApiSettings|wp\.i18n\./i,              confidence: 'high' },
    ],
    'Wix': [
      { target: 'html', pattern: /static\.parastorage\.com|_wix_/i,              confidence: 'high' },
    ],
    'Squarespace': [
      { target: 'html', pattern: /static1?\.squarespace\.com/i,                  confidence: 'high' },
    ],
    'Webflow': [
      { target: 'html', pattern: /assets\.website-files\.com|data-wf-page/i,     confidence: 'high' },
      { target: 'x-powered-by', pattern: /webflow/i,                             confidence: 'high' },
    ],
    'PrestaShop': [
      { target: 'html', pattern: /prestashop/i,                                  confidence: 'medium' },
    ],
    'Drupal': [
      { target: 'html', pattern: /Drupal\.settings|\/sites\/default\/files\//i,  confidence: 'high' },
      { target: 'x-generator', pattern: /Drupal/i,                               confidence: 'high' },
    ],
    'Joomla': [
      { target: 'html', pattern: /\/components\/com_|Joomla!/i,                  confidence: 'medium' },
    ],
  },

  'Framework JS': {
    'Next.js': [
      { target: 'html', pattern: /__NEXT_DATA__|"\/_next\/|\/_next\/static\//i,   confidence: 'high' },
      { target: 'x-powered-by', pattern: /Next\.js/i,                            confidence: 'high' },
    ],
    'Nuxt.js': [
      { target: 'html', pattern: /__nuxt|"\/_nuxt\//i,                            confidence: 'high' },
    ],
    'React': [
      { target: 'html', pattern: /data-reactroot|react\.production\.min\.js|react-dom/i, confidence: 'medium' },
    ],
    'Vue.js': [
      { target: 'html', pattern: /data-v-[a-f0-9]{7,}|vue\.(?:min|runtime)[^"']*\.js/i, confidence: 'medium' },
    ],
    'Angular': [
      { target: 'html', pattern: /ng-version=|ng-app|angular\.min\.js/i,          confidence: 'high' },
    ],
    'Gatsby': [
      { target: 'html', pattern: /___gatsby|gatsby-chunk/i,                       confidence: 'high' },
    ],
    'jQuery': [
      { target: 'html', pattern: /jquery[.\-](\d+\.\d+(?:\.\d+)?)(?:\.min)?\.js/i, confidence: 'high', versionGroup: 1 },
      { target: 'html', pattern: /jquery(?:\.min)?\.js/i,                         confidence: 'medium' },
    ],
  },

  'Analytics': {
    'Google Analytics': [
      { target: 'html', pattern: /gtag\(["']config["']\s*,\s*["']G-|google-analytics\.com\/(?:analytics|ga)\.js/i, confidence: 'high' },
    ],
    'Google Tag Manager': [
      { target: 'html', pattern: /googletagmanager\.com\/gtm\.js|GTM-[A-Z0-9]{4,}/, confidence: 'high' },
    ],
    'Meta Pixel': [
      { target: 'html', pattern: /connect\.facebook\.net\/[^"']*\/fbevents\.js|fbq\(\s*["']init/i, confidence: 'high' },
    ],
    'Snapchat Pixel': [
      { target: 'html', pattern: /sc-static\.net\/scevent\.min\.js|snaptr\(\s*["']init/i, confidence: 'high' },
    ],
    'TikTok Pixel': [
      { target: 'html', pattern: /analytics\.tiktok\.com\/i18n\/pixel|ttq\.load\(/i, confidence: 'high' },
    ],
    'Hotjar': [
      { target: 'html', pattern: /static\.hotjar\.com|hjSettings/i,               confidence: 'high' },
    ],
    'Matomo': [
      { target: 'html', pattern: /matomo\.js|piwik\.js|_paq\.push/i,              confidence: 'high' },
    ],
    'Plausible': [
      { target: 'html', pattern: /plausible\.io\/js/i,                            confidence: 'high' },
    ],
  },

  'Serveur': {
    // Rempli dynamiquement depuis les headers
  },
};

/**
 * Ordre de priorité si plusieurs plateformes sont repérées. Shopify en dernier : son CDN sert
 * parfois à héberger des images sur des boutiques d'autres plateformes (constaté sur 3saf.com / Salla).
 */
const PLATFORM_PRIORITY = ['Salla', 'Zid', 'Magento', 'BigCommerce', 'WooCommerce', 'Shopify'];

/** Taille maximale lue : au-delà, on garde le début de la page (les marqueurs sont dans le <head>). */
export const MAX_HTML_BYTES = 1_500_000;

/** Détection pure à partir du HTML et des en-têtes (sans réseau) — testable. */
export function detectFromHtml(html: string, rawHeaders: Record<string, unknown>): DetectedTech[] {
  const headers = normalizeHeaders(rawHeaders);
  const detected: DetectedTech[] = [];
  const seen = new Set<string>();

  const addTech = (name: string, cat: TechCategory, conf: TechConfidence, version?: string) => {
    if (seen.has(name)) return;
    seen.add(name);
    detected.push({ name, category: cat, confidence: conf, ...(version ? { version } : {}) });
  };

  for (const [category, techs] of Object.entries(SIGNATURES) as [TechCategory, Record<string, Signature[]>][]) {
    for (const [name, sigs] of Object.entries(techs)) {
      for (const sig of sigs) {
        const source = sig.target === 'html' ? html : (headers[sig.target] ?? '');
        if (!source) continue;
        const m = source.match(sig.pattern);
        if (m) {
          const version = sig.versionGroup != null ? m[sig.versionGroup] : undefined;
          addTech(name, category, sig.confidence, version);
          break; // une signature suffit par tech
        }
      }
    }
  }

  // Une boutique n'a qu'une plateforme. Plusieurs marqueurs = une plateforme + des ressources externes
  // (ex. boutique Salla réelle hébergeant des images sur cdn.shopify.com). On garde la plus spécifique.
  const ecommerce = detected.filter((t) => t.category === 'E-commerce');
  if (ecommerce.length > 1) {
    const keep = PLATFORM_PRIORITY.find((p) => ecommerce.some((t) => t.name === p));
    for (let i = detected.length - 1; i >= 0; i--) {
      if (detected[i].category === 'E-commerce' && detected[i].name !== keep) detected.splice(i, 1);
    }
  }

  // WooCommerce tourne sur WordPress : WordPress reste listé (catégorie CMS).

  const serverHeader = headers['server'] ?? '';
  if (serverHeader) {
    const knownServers: [RegExp, string][] = [
      [/cloudflare/i, 'Cloudflare'], [/nginx/i, 'Nginx'], [/apache/i, 'Apache'],
      [/iis/i, 'IIS (Microsoft)'], [/litespeed/i, 'LiteSpeed'], [/caddy/i, 'Caddy'],
      [/openresty/i, 'OpenResty'], [/vercel/i, 'Vercel'], [/netlify/i, 'Netlify'],
    ];
    const match = knownServers.find(([re]) => re.test(serverHeader));
    const serverName = serverHeader.split(/[\s/]/)[0];
    if (match) addTech(match[1], 'Serveur', 'high');
    else if (serverName && serverName.length > 1) addTech(serverName, 'Serveur', 'medium');
  }

  const xPoweredBy = headers['x-powered-by'] ?? '';
  if (xPoweredBy) {
    const knownPowers: [RegExp, string][] = [
      [/php/i, 'PHP'], [/asp\.net/i, 'ASP.NET'], [/express/i, 'Express.js'], [/next\.js/i, 'Next.js'],
    ];
    for (const [re, name] of knownPowers) {
      if (re.test(xPoweredBy)) {
        const verMatch = name === 'PHP' ? xPoweredBy.match(/PHP\/([\d.]+)/i) : null;
        addTech(name, name === 'Next.js' ? 'Framework JS' : 'Serveur', 'high', verMatch?.[1]);
      }
    }
  }

  return detected;
}

/** Plateforme e-commerce principale détectée (ou null). */
export function primaryPlatform(techs: DetectedTech[]): string | null {
  return techs.find((t) => t.category === 'E-commerce')?.name ?? null;
}

function normalizeHeaders(raw: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw ?? {})) {
    out[k.toLowerCase()] = Array.isArray(v) ? v.join(', ') : String(v ?? '');
  }
  return out;
}

/**
 * Lit au plus `max` octets d'un flux puis l'interrompt (les grosses pages ne font plus échouer la détection).
 * `truncated` = la fin de la page (pied de page…) n'a pas été lue.
 */
export async function readCapped(stream: Readable, max = MAX_HTML_BYTES): Promise<{ html: string; truncated: boolean }> {
  const chunks: Buffer[] = [];
  let size = 0;
  let truncated = false;
  for await (const chunk of stream) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    chunks.push(buf);
    size += buf.length;
    if (size >= max) { truncated = true; break; }
  }
  stream.destroy();
  return { html: Buffer.concat(chunks).subarray(0, max).toString('utf8'), truncated };
}

// ── Service ───────────────────────────────────────────────────────────────

export interface SiteInspection {
  technologies: DetectedTech[];
  siteChecks: SiteChecks | null;
}

@Injectable()
export class TechDetectorService {
  private readonly logger = new Logger(TechDetectorService.name);

  /** Technologies seules (compatibilité). */
  async detect(url: string): Promise<DetectedTech[]> {
    return (await this.inspect(url)).technologies;
  }

  /** Un seul téléchargement de la page → technologies + contrôles langue/confidentialité. */
  async inspect(url: string): Promise<SiteInspection> {
    const start = Date.now();
    try {
      const res = await axios.get(url, {
        timeout: 10_000,
        responseType: 'stream',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
            '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'ar,en;q=0.8,fr;q=0.6',
        },
        maxRedirects: 5,
        // Chaque connexion (redirections comprises) refuse les adresses internes
        httpAgent:  safeHttpAgent,
        httpsAgent: safeHttpsAgent,
        // Une page anti-robot (403) contient souvent encore les marqueurs de la plateforme
        validateStatus: (s) => s < 600,
      });
      const { html, truncated } = await readCapped(res.data as Readable);
      const detected = detectFromHtml(html, res.headers as Record<string, unknown>);
      const siteChecks = runSiteChecks(html, url, detected, res.status, { truncated });
      this.logger.log(
        `TechDetector → ${detected.length} tech(s), ${siteChecks.issues.length} issue(s) in ${Date.now() - start}ms`,
      );
      return { technologies: detected, siteChecks };
    } catch (err: any) {
      this.logger.warn(`TechDetector fetch failed: ${err.message}`);
      return { technologies: [], siteChecks: null };
    }
  }
}
