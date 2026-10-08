import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

// ── Types ─────────────────────────────────────────────────────────────────

export type TechCategory = 'CMS' | 'Framework JS' | 'Analytics' | 'Serveur';
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

const SIGNATURES: Record<TechCategory, Record<string, Signature[]>> = {
  'CMS': {
    'WordPress': [
      { target: 'html', pattern: /\/wp-content\/|\/wp-includes\/|wp-json/i,    confidence: 'high' },
      { target: 'html', pattern: /wordpress/i,                                   confidence: 'medium' },
      { target: 'html', pattern: /var\s+wpApiSettings|wp\.i18n\./i,              confidence: 'high' },
    ],
    'Shopify': [
      { target: 'html', pattern: /cdn\.shopify\.com|Shopify\.theme/i,            confidence: 'high' },
      { target: 'html', pattern: /shopify\.com/i,                                confidence: 'medium' },
    ],
    'Wix': [
      { target: 'html', pattern: /wix\.com|_wix_/i,                              confidence: 'high' },
      { target: 'html', pattern: /static\.parastorage\.com/i,                    confidence: 'high' },
    ],
    'Squarespace': [
      { target: 'html', pattern: /squarespace\.com|static\.squarespace/i,        confidence: 'high' },
    ],
    'Webflow': [
      { target: 'html', pattern: /webflow\.com|\.w-[a-z]/i,                      confidence: 'high' },
      { target: 'x-powered-by', pattern: /webflow/i,                             confidence: 'high' },
    ],
    'PrestaShop': [
      { target: 'html', pattern: /prestashop|presta-shop/i,                      confidence: 'high' },
    ],
    'Drupal': [
      { target: 'html', pattern: /Drupal\.settings|\/sites\/default\/files\//i,  confidence: 'high' },
      { target: 'x-generator', pattern: /Drupal/i,                               confidence: 'high' },
    ],
    'Joomla': [
      { target: 'html', pattern: /joomla|\/components\/com_/i,                   confidence: 'high' },
      { target: 'x-content-encoded-by', pattern: /joomla/i,                      confidence: 'high' },
    ],
  },

  'Framework JS': {
    'Next.js': [
      { target: 'html', pattern: /__NEXT_DATA__|"\/_next\//i,                     confidence: 'high' },
      { target: 'x-powered-by', pattern: /Next\.js/i,                            confidence: 'high' },
    ],
    'Nuxt.js': [
      { target: 'html', pattern: /__nuxt|"\/_nuxt\//i,                            confidence: 'high' },
    ],
    'React': [
      { target: 'html', pattern: /__REACT_DEVTOOLS__|data-reactroot|_reactFiber|__reactFiber/i, confidence: 'high' },
      { target: 'html', pattern: /react\.production\.min\.js|react\.development\.js/i,          confidence: 'high' },
    ],
    'Vue.js': [
      { target: 'html', pattern: /__vue__|data-v-[a-f0-9]{7,}/i,                  confidence: 'high' },
      { target: 'html', pattern: /vue\.min\.js|vue\.runtime/i,                    confidence: 'medium' },
    ],
    'Angular': [
      { target: 'html', pattern: /ng-version=|ng-app|angular\.min\.js/i,          confidence: 'high' },
      { target: 'html', pattern: /"angular"|angular\.js/i,                        confidence: 'medium' },
    ],
    'Svelte': [
      { target: 'html', pattern: /\bsvelte\b|\.svelte-[a-z0-9]+/i,               confidence: 'high' },
    ],
    'Gatsby': [
      { target: 'html', pattern: /___gatsby|gatsby-chunk/i,                       confidence: 'high' },
    ],
    'jQuery': [
      { target: 'html', pattern: /jquery[.\-](\d+\.\d+)/i,                        confidence: 'high', versionGroup: 1 },
      { target: 'html', pattern: /jquery\.min\.js|jquery\.js/i,                   confidence: 'medium' },
    ],
  },

  'Analytics': {
    'Google Analytics': [
      { target: 'html', pattern: /gtag\(["']config["']|google-analytics\.com\/analytics\.js/i, confidence: 'high' },
      { target: 'html', pattern: /UA-\d{5,}-\d+/i,                               confidence: 'high' },
      { target: 'html', pattern: /G-[A-Z0-9]{10}/i,                              confidence: 'high' },
    ],
    'Google Tag Manager': [
      { target: 'html', pattern: /googletagmanager\.com\/gtm\.js|GTM-[A-Z0-9]+/i, confidence: 'high' },
    ],
    'Facebook Pixel': [
      { target: 'html', pattern: /fbq\s*\(|connect\.facebook\.net\/.*\/fbevents/i, confidence: 'high' },
    ],
    'Hotjar': [
      { target: 'html', pattern: /hotjar|hjSetting|hj\(/i,                        confidence: 'high' },
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

// ── Service ───────────────────────────────────────────────────────────────

@Injectable()
export class TechDetectorService {
  private readonly logger = new Logger(TechDetectorService.name);

  async detect(url: string): Promise<DetectedTech[]> {
    const start = Date.now();
    let html    = '';
    let headers: Record<string, string> = {};

    try {
      const res = await axios.get(url, {
        timeout: 8000,
        maxContentLength: 500_000,   // 500 KB max
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
            '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        },
        // Ne suit pas les redirections infinies
        maxRedirects: 5,
        // Retourne quand même les 4xx/5xx pour lire les headers
        validateStatus: (s) => s < 600,
      });
      html    = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
      headers = this.normalizeHeaders(res.headers);
    } catch (err: any) {
      this.logger.warn(`TechDetector fetch failed for ${url}: ${err.message}`);
      return [];
    }

    const detected: DetectedTech[] = [];
    const seen = new Set<string>();

    const addTech = (name: string, cat: TechCategory, conf: TechConfidence, version?: string) => {
      if (!seen.has(name)) {
        seen.add(name);
        detected.push({ name, category: cat, confidence: conf, ...(version ? { version } : {}) });
      }
    };

    // ── HTML + headers signatures ────────────────────────────────────────
    for (const [category, techs] of Object.entries(SIGNATURES) as [TechCategory, Record<string, Signature[]>][]) {
      for (const [name, sigs] of Object.entries(techs)) {
        for (const sig of sigs) {
          const source = sig.target === 'html' ? html : (headers[sig.target] ?? '');
          const m = source.match(sig.pattern);
          if (m) {
            const version = sig.versionGroup != null ? m[sig.versionGroup] : undefined;
            addTech(name, category, sig.confidence, version);
            break; // une signature suffit par tech
          }
        }
      }
    }

    // ── Serveur depuis headers ────────────────────────────────────────────
    const serverHeader = headers['server'] ?? '';
    if (serverHeader) {
      // Extrait le nom du serveur (avant le premier espace ou '/')
      const serverName = serverHeader.split(/[\s/]/)[0];
      // Normalise les noms connus
      const knownServers: [RegExp, string][] = [
        [/cloudflare/i, 'Cloudflare'],
        [/nginx/i,      'Nginx'],
        [/apache/i,     'Apache'],
        [/iis/i,        'IIS (Microsoft)'],
        [/litespeed/i,  'LiteSpeed'],
        [/caddy/i,      'Caddy'],
        [/openresty/i,  'OpenResty'],
        [/vercel/i,     'Vercel'],
        [/netlify/i,    'Netlify'],
      ];
      const match = knownServers.find(([re]) => re.test(serverHeader));
      if (match) {
        addTech(match[1], 'Serveur', 'high');
      } else if (serverName && serverName.length > 1) {
        addTech(serverName, 'Serveur', 'medium');
      }
    }

    const xPoweredBy = headers['x-powered-by'] ?? '';
    if (xPoweredBy) {
      const knownPowers: [RegExp, string][] = [
        [/php\/?([\d.]+)?/i, 'PHP'],
        [/asp\.net/i,        'ASP.NET'],
        [/express/i,         'Express.js'],
        [/next\.js/i,        'Next.js'],
      ];
      for (const [re, name] of knownPowers) {
        if (re.test(xPoweredBy)) {
          const verMatch = xPoweredBy.match(/[\d.]+/);
          addTech(name, 'Serveur', 'high', verMatch?.[0]);
          break;
        }
      }
    }

    this.logger.log(
      `TechDetector [${url}] → ${detected.length} tech(s) in ${Date.now() - start}ms : ` +
      detected.map((t) => t.name).join(', '),
    );

    return detected;
  }

  private normalizeHeaders(raw: Record<string, any>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
      out[k.toLowerCase()] = Array.isArray(v) ? v.join(', ') : String(v ?? '');
    }
    return out;
  }
}
