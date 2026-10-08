import { parseProspectCsv, normalizePhone, splitCsv } from './prospect-csv';

describe('splitCsv', () => {
  it('gère guillemets, guillemets doublés, séparateur et retour à la ligne dans un champ', () => {
    expect(splitCsv('a,"b,c","d ""e""","f\ng"\r\nh,i', ',')).toEqual([
      ['a', 'b,c', 'd "e"', 'f\ng'],
      ['h', 'i'],
    ]);
  });
});

describe('normalizePhone', () => {
  it.each([
    ['+966 50 123 4567', null, '966501234567'],
    ['00971-50-123-4567', null, '971501234567'],
    ['0501234567', 'SA', '966501234567'],
    ['0501234567', 'AE', '971501234567'],
    ['501234567', 'SA', '966501234567'],
    ['55123456', 'QA', '97455123456'],
    ['966501234567', 'SA', '966501234567'],
    ['966501234567', null, '966501234567'],
  ])('%s (%s) → %s', (raw, country, expected) => {
    expect(normalizePhone(raw, country)).toBe(expected);
  });

  it.each([
    ['0501234567', null],     // numéro local sans pays : indicatif inconnu
    ['055123456', 'QA'],      // pas de « 0 » national au Qatar
    ['abc', 'SA'],
    ['12345', null],          // trop court
  ])('%s (%s) → null', (raw, country) => {
    expect(normalizePhone(raw, country)).toBeNull();
  });
});

describe('parseProspectCsv', () => {
  it('en-tête FR avec « ; » (Excel), colonnes dans le désordre, BOM', () => {
    const csv = '﻿Nom;Téléphone;Site web;Pays\r\nParfums Riyad;0501234567;parfums.sa;sa\r\n';
    const { rows, issues } = parseProspectCsv(csv);
    expect(issues).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      line: 2, url: 'https://parfums.sa', name: 'Parfums Riyad', phone: '966501234567', country: 'SA',
    });
    expect(rows[0].urlHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('en-tête arabe', () => {
    const { rows } = parseProspectCsv('الاسم,الموقع,الجوال,الدولة\nمتجر,https://matjar.example,+971501234567,AE');
    expect(rows[0]).toMatchObject({ url: 'https://matjar.example', name: 'متجر', phone: '971501234567', country: 'AE' });
  });

  it('sans en-tête : url, nom, téléphone, pays', () => {
    const { rows } = parseProspectCsv('https://a.example,A,55123456,QA\nb.example');
    expect(rows.map((r) => [r.url, r.name, r.phone, r.country])).toEqual([
      ['https://a.example', 'A', '97455123456', 'QA'],
      ['https://b.example', null, null, null],
    ]);
  });

  it('rejette les URL internes / invalides et les doublons (casse de l’hôte ignorée)', () => {
    const csv = 'url\nhttps://shop.example\nhttp://localhost:3000\nhttp://10.0.0.1\nftp://x.example\nHTTPS://SHOP.example/\n\n';
    const { rows, issues } = parseProspectCsv(csv);
    expect(rows.map((r) => r.url)).toEqual(['https://shop.example']);
    expect(issues.map((i) => [i.line, i.code])).toEqual([
      [3, 'invalid_url'], [4, 'invalid_url'], [5, 'invalid_url'], [6, 'duplicate'],
    ]);
  });

  it('téléphone non interprétable : ligne gardée sans téléphone + signalement', () => {
    const { rows, issues } = parseProspectCsv('url,phone\nhttps://a.example,0501234567');
    expect(rows[0].phone).toBeNull();
    expect(issues).toEqual([{ line: 2, code: 'phone_invalid', detail: '0501234567' }]);
  });

  it('en-tête sans colonne URL → refus', () => {
    expect(parseProspectCsv('nom,phone\nA,1').issues).toEqual([{ line: 1, code: 'no_url_column' }]);
  });

  it('limite le nombre de lignes', () => {
    const csv = ['url', 'a.example', 'b.example', 'c.example'].join('\n');
    const { rows, issues } = parseProspectCsv(csv, 2);
    expect(rows).toHaveLength(2);
    expect(issues).toEqual([{ line: 4, code: 'too_many_rows', detail: '2' }]);
  });

  it('fichier vide', () => {
    expect(parseProspectCsv('  \n').issues).toEqual([{ line: 0, code: 'empty' }]);
  });
});
