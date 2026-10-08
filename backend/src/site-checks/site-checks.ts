import type { DetectedTech } from '../tech-detector/tech-detector.service';

/**
 * Contrôles « Golfe » calculés à partir du HTML de la page (sans réseau) :
 * - langue / sens d'écriture / versions linguistiques (hreflang)
 * - indicateurs de confidentialité (traceurs, outil de consentement, politique de confidentialité)
 *
 * Ce sont des INDICATEURS techniques, pas un avis juridique ni une certification de conformité.
 */

export type CheckSeverity = 'high' | 'medium' | 'low';

export interface SiteIssue {
  code: string;
  severity: CheckSeverity;
}

export interface LanguageChecks {
  htmlLang: string | null;
  dir: 'rtl' | 'ltr' | null;
  /** Part des lettres arabes parmi les lettres du texte visible (0–1). */
  arabicRatio: number;
  hreflangs: string[];
  /** Liens vers une autre version linguistique (/ar/, /en/, ?lang=…). */
  languageSwitchTargets: string[];
}

export interface PrivacyChecks {
  trackers: string[];
  consentTool: string | null;
  privacyPolicyLink: boolean;
}

export interface SiteChecks {
  /** true si la page reçue est un écran anti-robot (contrôles de contenu non fiables → non calculés). */
  blocked: boolean;
  language: LanguageChecks;
  privacy: PrivacyChecks;
  issues: SiteIssue[];
}

/** Statuts qui signalent une page bloquée par une protection anti-robot plutôt que le vrai contenu. */
export function isBlockedResponse(status: number): boolean {
  return status === 401 || status === 403 || status === 429 || status === 503;
}

const TRACKER_NAMES = new Set([
  'Google Analytics', 'Google Tag Manager', 'Meta Pixel', 'Snapchat Pixel', 'TikTok Pixel', 'Hotjar',
]);

/** Outils de gestion du consentement (CMP) reconnus par leur domaine de script. */
const CONSENT_TOOLS: [RegExp, string][] = [
  [/consent\.cookiebot\.com|cookiebot/i,               'Cookiebot'],
  [/cdn\.cookielaw\.org|onetrust/i,                    'OneTrust'],
  [/cdn-cookieyes\.com/i,                              'CookieYes'],
  [/sdk\.privacy-center\.org|didomi/i,                 'Didomi'],
  [/app\.usercentrics\.eu|usercentrics/i,              'Usercentrics'],
  [/cdn\.iubenda\.com/i,                               'iubenda'],
  [/cookiehub\.net/i,                                  'CookieHub'],
  [/cmp\.osano\.com/i,                                 'Osano'],
  [/app\.termly\.io/i,                                 'Termly'],
  [/complianz/i,                                       'Complianz'],
  [/cookie-law-info|cookieyes/i,                       'CookieYes'],
];

const PRIVACY_LINK = /<a\b[^>]*>(?:(?!<\/a>)[\s\S]){0,200}?(?:privacy|confidentialit|سياسة\s*الخصوصية|الخصوصية)(?:(?!<\/a>)[\s\S]){0,200}?<\/a>|href=["'][^"']*(?:privacy|confidentialite|privacy-policy|سياسة-الخصوصية)[^"']*["']/i;

function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i'));
  return m ? m[1].trim() : null;
}

/** Texte visible approximatif : retire scripts, styles et balises. */
function visibleText(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
}

export function analyzeLanguage(html: string, pageUrl: string): LanguageChecks {
  const htmlTag = (html.match(/<html\b[^>]*>/i) || [''])[0];
  const bodyTag = (html.match(/<body\b[^>]*>/i) || [''])[0];
  const htmlLang = attr(htmlTag, 'lang')?.toLowerCase() || null;
  const dirAttr = (attr(htmlTag, 'dir') ?? attr(bodyTag, 'dir'))?.toLowerCase();
  // RTL aussi déclaré par classe (<html|body class="rtl">) ou feuille de style dédiée (rtl.css) :
  // constaté sur une vraie boutique Zid (dkhoonemirates.com), affichage correct.
  const rtlByClass = /\brtl\b/i.test(`${attr(htmlTag, 'class') ?? ''} ${attr(bodyTag, 'class') ?? ''}`);
  const rtlStylesheet = /<link\b[^>]*href=["'][^"']*\brtl(?:\.min)?\.css/i.test(html);
  const dir: 'rtl' | 'ltr' | null =
    dirAttr === 'rtl' || dirAttr === 'ltr' ? dirAttr : rtlByClass || rtlStylesheet ? 'rtl' : null;

  const text = visibleText(html);
  const arabic = (text.match(/[؀-ۿ]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  const arabicRatio = arabic + latin > 0 ? arabic / (arabic + latin) : 0;

  const hreflangs = [...html.matchAll(/<link\b[^>]*rel=["']alternate["'][^>]*>/gi)]
    .map((m) => attr(m[0], 'hreflang')?.toLowerCase())
    .filter((v): v is string => !!v);

  let host = '';
  try { host = new URL(pageUrl).host; } catch { /* ignore */ }
  const currentLang = (htmlLang ?? '').slice(0, 2);
  const targets = new Set<string>();
  for (const m of html.matchAll(/href=["']([^"'#]+)["']/gi)) {
    const href = m[1];
    let u: URL;
    try { u = new URL(href, pageUrl); } catch { continue; }
    if (host && u.host !== host) continue;
    const seg = u.pathname.match(/^\/(ar|en|fr)(?:\/|$)/i)?.[1]?.toLowerCase()
      ?? u.searchParams.get('lang')?.slice(0, 2).toLowerCase();
    if (seg && seg !== currentLang) targets.add(seg);
  }

  return { htmlLang, dir, arabicRatio: Math.round(arabicRatio * 100) / 100, hreflangs: [...new Set(hreflangs)], languageSwitchTargets: [...targets] };
}

export function analyzePrivacy(html: string, techs: DetectedTech[]): PrivacyChecks {
  const trackers = techs.filter((t) => TRACKER_NAMES.has(t.name)).map((t) => t.name);
  const consentTool = CONSENT_TOOLS.find(([re]) => re.test(html))?.[1] ?? null;
  return { trackers, consentTool, privacyPolicyLink: PRIVACY_LINK.test(html) };
}

export function runSiteChecks(
  html: string,
  pageUrl: string,
  techs: DetectedTech[],
  httpStatus = 200,
  opts: { truncated?: boolean } = {},
): SiteChecks {
  const language = analyzeLanguage(html, pageUrl);
  const privacy = analyzePrivacy(html, techs);
  const issues: SiteIssue[] = [];

  // Page anti-robot : on ne tire aucune conclusion sur le contenu (évite les faux positifs constatés).
  if (isBlockedResponse(httpStatus)) {
    return { blocked: true, language, privacy, issues };
  }

  if (!language.htmlLang) issues.push({ code: 'lang_missing', severity: 'medium' });

  // Contenu majoritairement arabe mais page non déclarée de droite à gauche
  if (language.arabicRatio >= 0.5 && language.dir !== 'rtl') {
    issues.push({ code: 'arabic_without_rtl', severity: 'high' });
  }
  // Page déclarée arabe mais sans dir="rtl"
  if (language.htmlLang?.startsWith('ar') && language.dir !== 'rtl' && language.arabicRatio < 0.5) {
    issues.push({ code: 'arabic_lang_without_rtl', severity: 'medium' });
  }
  // Plusieurs versions linguistiques mais Google n'est pas informé (hreflang)
  if (language.languageSwitchTargets.length > 0 && language.hreflangs.length === 0) {
    issues.push({ code: 'hreflang_missing', severity: 'medium' });
  }
  // Pas de version arabe repérable (marché du Golfe)
  if (!language.htmlLang?.startsWith('ar') && language.arabicRatio < 0.2
      && !language.hreflangs.some((h) => h.startsWith('ar'))
      && !language.languageSwitchTargets.includes('ar')) {
    issues.push({ code: 'no_arabic_version', severity: 'low' });
  }

  if (privacy.trackers.length > 0 && !privacy.consentTool) {
    issues.push({ code: 'trackers_without_consent_tool', severity: 'high' });
  }
  // Le lien est souvent dans le pied de page : si la page a été tronquée, on ne peut pas conclure
  // (constaté sur care-outlet.com 2,1 Mo et pcpalace.com.sa 11 Mo).
  if (!privacy.privacyPolicyLink && !opts.truncated) {
    issues.push({ code: 'privacy_policy_link_missing', severity: 'medium' });
  }

  return { blocked: false, language, privacy, issues };
}
