import { runSiteChecks, analyzeLanguage } from './site-checks';

const codes = (html: string, techs: any[] = [], status = 200, url = 'https://shop.sa/') =>
  runSiteChecks(html, url, techs, status).issues.map((i) => i.code);

const AR_TEXT = 'مرحبا بكم في متجرنا الإلكتروني، تسوق أفضل المنتجات بأفضل الأسعار';
const PRIVACY = '<a href="/ar/privacy-policy">سياسة الخصوصية</a>';

describe('analyzeLanguage', () => {
  it('lit lang, dir et hreflang', () => {
    const l = analyzeLanguage(
      `<html lang="ar" dir="rtl"><head><link rel="alternate" hreflang="en-sa" href="https://shop.sa/en"></head><body>${AR_TEXT}</body></html>`,
      'https://shop.sa/',
    );
    expect(l.htmlLang).toBe('ar');
    expect(l.dir).toBe('rtl');
    expect(l.hreflangs).toEqual(['en-sa']);
    expect(l.arabicRatio).toBe(1);
  });

  it('RTL déclaré par classe sur <body> (cas réel Zid dkhoonemirates.com)', () => {
    expect(analyzeLanguage(`<html lang="ar"><body class=" rtl country-sa">${AR_TEXT}</body></html>`, 'https://x.sa/').dir).toBe('rtl');
  });

  it('RTL déclaré par feuille rtl.css', () => {
    expect(analyzeLanguage('<html lang="ar"><link rel="stylesheet" href="https://static.zid.store/1/rtl.css?v=1">', 'https://x.sa/').dir).toBe('rtl');
  });

  it('repère les liens vers une autre langue du même site', () => {
    const l = analyzeLanguage('<html lang="ar"><a href="/en/products">EN</a><a href="https://other.com/en/">x</a>', 'https://shop.sa/ar');
    expect(l.languageSwitchTargets).toEqual(['en']);
  });

  it('ignore le texte des scripts pour le ratio arabe', () => {
    const l = analyzeLanguage(`<html><script>var t="${AR_TEXT}"</script><body>Hello world shop</body></html>`, 'https://x.com/');
    expect(l.arabicRatio).toBe(0);
  });
});

describe('runSiteChecks — langue', () => {
  it('boutique arabe correcte → aucun problème de langue', () => {
    const html = `<html lang="ar" dir="rtl"><link rel="alternate" hreflang="en" href="/en"><body>${AR_TEXT}<a href="/en/">EN</a>${PRIVACY}</body></html>`;
    expect(codes(html)).toEqual([]);
  });

  it('contenu arabe sans RTL → gravité haute', () => {
    expect(codes(`<html lang="ar"><body>${AR_TEXT}${PRIVACY}</body></html>`)).toContain('arabic_without_rtl');
  });

  it('versions linguistiques sans hreflang', () => {
    expect(codes(`<html lang="ar" dir="rtl"><body>${AR_TEXT}<a href="/en/">English</a>${PRIVACY}</body></html>`))
      .toContain('hreflang_missing');
  });

  it('attribut lang absent', () => {
    expect(codes(`<html dir="rtl"><body>${AR_TEXT}${PRIVACY}</body></html>`)).toContain('lang_missing');
  });

  it('site uniquement anglais → pas de version arabe (gravité basse)', () => {
    const r = runSiteChecks('<html lang="en"><body>Welcome to our shop <a href="/privacy-policy">Privacy</a></body></html>', 'https://shop.com/', []);
    expect(r.issues).toEqual([{ code: 'no_arabic_version', severity: 'low' }]);
  });
});

describe('runSiteChecks — confidentialité (indicateurs)', () => {
  const tracker = [{ name: 'Meta Pixel', category: 'Analytics', confidence: 'high' }];

  it('traceurs sans outil de consentement reconnu', () => {
    expect(codes(`<html lang="ar" dir="rtl"><body>${AR_TEXT}${PRIVACY}</body></html>`, tracker))
      .toContain('trackers_without_consent_tool');
  });

  it('outil de consentement reconnu (Cookiebot) → pas de signalement', () => {
    const html = `<html lang="ar" dir="rtl"><script src="https://consent.cookiebot.com/uc.js"></script><body>${AR_TEXT}${PRIVACY}</body></html>`;
    const r = runSiteChecks(html, 'https://shop.sa/', tracker as any);
    expect(r.privacy.consentTool).toBe('Cookiebot');
    expect(r.issues.map((i) => i.code)).not.toContain('trackers_without_consent_tool');
  });

  it('lien de politique de confidentialité absent', () => {
    expect(codes(`<html lang="ar" dir="rtl"><body>${AR_TEXT}</body></html>`)).toContain('privacy_policy_link_missing');
  });

  it('page tronquée (très lourde) → pas de conclusion sur le lien du pied de page', () => {
    const r = runSiteChecks(`<html lang="ar" dir="rtl"><body>${AR_TEXT}</body></html>`, 'https://x.sa/', [], 200, { truncated: true });
    expect(r.issues.map((i) => i.code)).not.toContain('privacy_policy_link_missing');
  });

  it('lien de politique reconnu en français et en anglais', () => {
    expect(codes(`<html lang="fr"><body>Bonjour <a href="/confidentialite">Confidentialité</a> مرحبا</body></html>`))
      .not.toContain('privacy_policy_link_missing');
    expect(codes('<html lang="en"><body><a href="/legal">Privacy Policy</a></body></html>'))
      .not.toContain('privacy_policy_link_missing');
  });
});

describe('runSiteChecks — page anti-robot', () => {
  it('HTTP 403 → aucune conclusion (cas réels outletpharmacyonline.sa / villagemarket.com.sa)', () => {
    const r = runSiteChecks('<html lang="ar" dir="rtl"><body>Just a moment...</body></html>', 'https://x.sa/', [], 403);
    expect(r.blocked).toBe(true);
    expect(r.issues).toEqual([]);
  });
});
