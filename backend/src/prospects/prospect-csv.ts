import { validateUrl, hashUrl } from '../common/validators/url.validator';

/**
 * Import CSV de prospects (audit en lot, admin).
 *
 * Formats acceptés :
 *  - avec en-tête : colonnes reconnues par leur nom (FR/EN/AR), ordre libre, colonne URL obligatoire ;
 *  - sans en-tête : url, nom, téléphone, pays.
 * Séparateur détecté sur la première ligne : « , », « ; » (Excel FR) ou tabulation.
 */

export const MAX_PROSPECT_ROWS = 500;

export interface ProspectRow {
  line: number;
  url: string;
  urlHash: string;
  name: string | null;
  /** Numéro international, chiffres seulement (format wa.me), ou null. */
  phone: string | null;
  /** Code pays ISO à 2 lettres, ou null. */
  country: string | null;
}

export type ProspectCsvIssueCode =
  | 'invalid_url' | 'duplicate' | 'phone_invalid' | 'too_many_rows' | 'no_url_column' | 'empty';

export interface ProspectCsvIssue {
  line: number;
  code: ProspectCsvIssueCode;
  detail?: string;
}

export interface ProspectCsvResult {
  rows: ProspectRow[];
  /** Lignes rejetées (`invalid_url`, `duplicate`…) ; `phone_invalid` garde la ligne, sans téléphone. */
  issues: ProspectCsvIssue[];
}

type Field = 'url' | 'name' | 'phone' | 'country';

const HEADER_ALIASES: Record<Field, string[]> = {
  url:     ['url', 'site', 'website', 'site web', 'domain', 'domaine', 'store', 'boutique', 'الموقع', 'الرابط', 'المتجر'],
  name:    ['name', 'nom', 'store name', 'shop', 'company', 'société', 'الاسم', 'اسم المتجر'],
  phone:   ['phone', 'whatsapp', 'tel', 'tél', 'telephone', 'téléphone', 'mobile', 'الجوال', 'الهاتف', 'واتساب'],
  country: ['country', 'pays', 'الدولة', 'البلد'],
};

/** Indicatifs du Golfe : préfixe national « 0 » (SA, AE) ou numéros locaux à 8 chiffres (QA, KW, BH, OM). */
const COUNTRY_CODES: Record<string, { cc: string; trunkZero: boolean }> = {
  SA: { cc: '966', trunkZero: true },
  AE: { cc: '971', trunkZero: true },
  QA: { cc: '974', trunkZero: false },
  KW: { cc: '965', trunkZero: false },
  BH: { cc: '973', trunkZero: false },
  OM: { cc: '968', trunkZero: false },
};

/** Découpe un texte CSV (guillemets RFC 4180, retours à la ligne dans les champs). */
export function splitCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"' && field === '') {
      quoted = true;
    } else if (c === delimiter) {
      row.push(field); field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function detectDelimiter(firstLine: string): string {
  let best = ',';
  let bestCount = 0;
  for (const d of [',', ';', '\t']) {
    const n = firstLine.split(d).length - 1;
    if (n > bestCount) { best = d; bestCount = n; }
  }
  return best;
}

function normalizeHeader(cell: string): string {
  return cell.trim().toLowerCase().replace(/[_-]+/g, ' ');
}

function headerMap(cells: string[]): Partial<Record<Field, number>> | null {
  const map: Partial<Record<Field, number>> = {};
  cells.forEach((cell, idx) => {
    const h = normalizeHeader(cell);
    for (const f of Object.keys(HEADER_ALIASES) as Field[]) {
      if (map[f] === undefined && HEADER_ALIASES[f].includes(h)) map[f] = idx;
    }
  });
  return Object.keys(map).length ? map : null;
}

/**
 * Numéro → format international sans « + » (wa.me). Null si non interprétable.
 * Sans indicatif, un numéro local n'est converti que si le pays est connu (Golfe).
 */
export function normalizePhone(raw: string, country: string | null): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let digits = trimmed.replace(/[\s().\-‎‏]/g, '');
  if (!/^\+?\d+$/.test(digits)) return null;
  const international = digits.startsWith('+') || digits.startsWith('00');
  digits = digits.replace(/^\+/, '').replace(/^00/, '');
  if (!international) {
    const info = country ? COUNTRY_CODES[country] : undefined;
    if (digits.startsWith('0')) {
      if (!info?.trunkZero) return null;
      digits = info.cc + digits.slice(1);
    } else if (info && !digits.startsWith(info.cc) && digits.length <= 9) {
      digits = info.cc + digits;
    }
  }
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

function normalizeCountry(raw: string | undefined): string | null {
  const c = (raw ?? '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(c) ? c : null;
}

export function parseProspectCsv(text: string, maxRows = MAX_PROSPECT_ROWS): ProspectCsvResult {
  const issues: ProspectCsvIssue[] = [];
  const clean = (text ?? '').replace(/^﻿/, '');
  if (!clean.trim()) return { rows: [], issues: [{ line: 0, code: 'empty' }] };

  const delimiter = detectDelimiter(clean.split(/\r?\n/, 1)[0]);
  const table = splitCsv(clean, delimiter);

  let start = 0;
  let cols: Partial<Record<Field, number>> = { url: 0, name: 1, phone: 2, country: 3 };
  const header = headerMap(table[0] ?? []);
  if (header) {
    if (header.url === undefined) return { rows: [], issues: [{ line: 1, code: 'no_url_column' }] };
    cols = header;
    start = 1;
  }

  const rows: ProspectRow[] = [];
  const seen = new Set<string>();
  for (let i = start; i < table.length; i++) {
    const cells = table[i];
    const line = i + 1;
    const cell = (f: Field) => (cols[f] !== undefined ? (cells[cols[f]!] ?? '').trim() : '');
    let rawUrl = cell('url');
    if (!rawUrl && cells.every((c) => !c.trim())) continue; // ligne vide
    if (rows.length >= maxRows) {
      issues.push({ line, code: 'too_many_rows', detail: String(maxRows) });
      break;
    }
    if (rawUrl && !/^[a-z][a-z0-9+.-]*:\/\//i.test(rawUrl)) rawUrl = `https://${rawUrl}`;
    const v = validateUrl(rawUrl);
    if (!v.valid) {
      issues.push({ line, code: 'invalid_url', detail: v.reason });
      continue;
    }
    const urlHash = hashUrl(v.normalized!);
    if (seen.has(urlHash)) {
      issues.push({ line, code: 'duplicate', detail: v.normalized });
      continue;
    }
    seen.add(urlHash);

    const country = normalizeCountry(cell('country'));
    const rawPhone = cell('phone');
    const phone = rawPhone ? normalizePhone(rawPhone, country) : null;
    if (rawPhone && !phone) issues.push({ line, code: 'phone_invalid', detail: rawPhone });

    rows.push({ line, url: v.normalized!, urlHash, name: cell('name') || null, phone, country });
  }
  return { rows, issues };
}
