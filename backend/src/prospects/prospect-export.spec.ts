import {
  buildProspectMessage, buildProspectWhatsappLink, buildProspectsCsv, csvCell, PROSPECT_EXPORT_HEADER,
} from './prospect-export';
import { splitCsv } from './prospect-csv';

const base = {
  id: 'p1', batchId: 'b1', urlSite: 'https://parfums.sa', name: 'عطور الرياض', phone: '966501234567',
  country: 'SA', locale: 'ar', analysisId: 'c1', createdAt: new Date('2026-10-08T10:00:00Z'),
  status: 'completed' as const, scorePerformance: 34, platform: 'Salla',
  siteChecks: { blocked: false, issues: [{ code: 'arabic_without_rtl' }, { code: 'trackers_without_consent_tool' }] },
  reportUrl: 'https://velifa.io/ar/analyse/c1', errorMessage: null,
};

describe('buildProspectMessage', () => {
  it('arabe : nom, site, score mesuré, lien du rapport, possibilité de refuser', () => {
    const m = buildProspectMessage('ar', { site: 'https://parfums.sa', name: 'عطور الرياض', score: 34, reportUrl: 'https://velifa.io/ar/analyse/c1' });
    expect(m).toContain('السلام عليكم عطور الرياض');
    expect(m).toContain('https://parfums.sa');
    expect(m).toContain('34/100');
    expect(m).toContain('Google Lighthouse');
    expect(m).toContain('https://velifa.io/ar/analyse/c1');
    expect(m).toContain('لا ترغبون في تلقي رسائل');
  });

  it('sans nom, EN et FR ; langue inconnue → anglais', () => {
    const input = { site: 's.example', name: null, score: 50, reportUrl: 'u' };
    expect(buildProspectMessage('en', input).startsWith('Hello,')).toBe(true);
    expect(buildProspectMessage('fr', input)).toContain('50/100');
    expect(buildProspectMessage('de', input)).toBe(buildProspectMessage('en', input));
  });
});

describe('buildProspectWhatsappLink', () => {
  it('lien wa.me vers le numéro du prospect, message encodé et décodable à l’identique', () => {
    const text = 'مرحباً\nhttps://velifa.io/ar/analyse/c1?x=1&y=2';
    const link = buildProspectWhatsappLink('966501234567', text);
    const url = new URL(link);
    expect(url.origin + url.pathname).toBe('https://wa.me/966501234567');
    expect(url.searchParams.get('text')).toBe(text);
  });
  it('sans téléphone → vide', () => {
    expect(buildProspectWhatsappLink(null, 'x')).toBe('');
  });
});

describe('csvCell', () => {
  it.each([
    ['simple', 'simple'],
    ['a,b', '"a,b"'],
    ['a;b', '"a;b"'],
    ['dit "oui"', '"dit ""oui"""'],
    ['ligne\nsuivante', '"ligne\nsuivante"'],
    ['=HYPERLINK("http://x")', `"'=HYPERLINK(""http://x"")"`],
    ['@SUM(A1)', "'@SUM(A1)"],
    ['-2+3', "'-2+3"],
    ['+966501234567', '+966501234567'],
    [42, '42'],
    [null, ''],
  ])('%p → %p', (input, expected) => {
    expect(csvCell(input)).toBe(expected);
  });
});

describe('buildProspectsCsv', () => {
  it('BOM UTF-8, en-tête, lien WhatsApp arabe pour un audit terminé ; rien pour un audit en attente', () => {
    const csv = buildProspectsCsv([
      base,
      { ...base, id: 'p2', urlSite: 'https://b.example', name: null, phone: null, status: 'pending', scorePerformance: null, platform: null, siteChecks: null, reportUrl: null },
      { ...base, id: 'p3', urlSite: 'https://c.example', siteChecks: { blocked: true, issues: [] } },
    ]);
    expect(csv.startsWith('﻿')).toBe(true);
    const rows = splitCsv(csv.slice(1), ',');
    expect(rows[0]).toEqual(PROSPECT_EXPORT_HEADER);
    const col = (r: string[], name: string) => r[PROSPECT_EXPORT_HEADER.indexOf(name)];

    const done = rows[1];
    expect(col(done, 'phone')).toBe('+966501234567');
    expect(col(done, 'score_performance')).toBe('34');
    expect(col(done, 'gulf_issues')).toBe('arabic_without_rtl trackers_without_consent_tool');
    expect(col(done, 'report_url')).toBe('https://velifa.io/ar/analyse/c1');
    const wa = new URL(col(done, 'whatsapp_link'));
    expect(wa.pathname).toBe('/966501234567');
    expect(wa.searchParams.get('text')).toContain('34/100');
    expect(wa.searchParams.get('text')).toContain('السلام عليكم عطور الرياض');

    const pending = rows[2];
    expect(col(pending, 'status')).toBe('pending');
    expect(col(pending, 'whatsapp_link')).toBe('');
    expect(col(pending, 'report_url')).toBe('');

    expect(col(rows[3], 'gulf_issues')).toBe('page_blocked');
    expect(rows).toHaveLength(4);
  });
});
