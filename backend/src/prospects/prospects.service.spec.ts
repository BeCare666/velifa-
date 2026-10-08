import { BadRequestException } from '@nestjs/common';

jest.mock('../common/validators/url.validator', () => {
  const actual = jest.requireActual('../common/validators/url.validator');
  return {
    ...actual,
    // Pas de réseau en test : « interne.example » simule un nom public qui pointe vers le réseau interne
    assertPublicHost: jest.fn(async (host: string) => {
      if (host === 'interne.example') throw new Error('URL réseau privé non autorisée');
    }),
  };
});

import { ProspectsService, scheduleDelays } from './prospects.service';
import { hashUrl } from '../common/validators/url.validator';

describe('scheduleDelays', () => {
  it('sans audit programmé : démarre maintenant, puis un audit par intervalle', () => {
    expect(scheduleDelays(3, 1000, null, 30_000)).toEqual([0, 30_000, 60_000]);
  });
  it('à la suite d’un lot encore programmé', () => {
    expect(scheduleDelays(2, 1000, 1000 + 90_000, 30_000)).toEqual([120_000, 150_000]);
  });
  it('dernier audit programmé déjà passé : démarre maintenant', () => {
    expect(scheduleDelays(1, 100_000, 10_000, 30_000)).toEqual([0]);
  });
});

function setup(opts: { existing?: string[]; delayed?: any[] } = {}) {
  let n = 0;
  const db = {
    findExistingProspectHashes: jest.fn(async () => new Set(opts.existing ?? [])),
    createAnalysis: jest.fn(async (d: any) => ({ id: `c${++n}`, ...d })),
    insertProspect: jest.fn(async () => undefined),
    listProspects: jest.fn(async () => ({ rows: [], total: 0 })),
  };
  const queue = {
    getDelayed: jest.fn(async () => opts.delayed ?? []),
    add: jest.fn(async () => undefined),
  };
  const config = { get: jest.fn((_k: string, def: any) => def) };
  const service = new ProspectsService(db as any, queue as any, config as any);
  return { service, db, queue };
}

describe('ProspectsService.importCsv', () => {
  beforeEach(() => jest.spyOn(Date, 'now').mockReturnValue(1_000_000));
  afterEach(() => jest.restoreAllMocks());

  it('crée un audit « prospect » sans email par boutique, espacé de 30 s, et la ligne prospect liée', async () => {
    const { service, db, queue } = setup();
    const res = await service.importCsv('url,phone,country\nhttps://a.example,0501234567,SA\nb.example,,', 'ar');

    expect(res.queued).toBe(2);
    expect(res.issues).toEqual([]);
    expect(res.lastAuditAt).toBe(new Date(1_000_000 + 30_000).toISOString());

    expect(db.createAnalysis).toHaveBeenNthCalledWith(1, expect.objectContaining({
      urlSite: 'https://a.example', email: '', source: 'prospect', locale: 'ar', clerkUserId: null, ipAddress: null,
    }));
    expect(db.insertProspect).toHaveBeenNthCalledWith(1, expect.objectContaining({
      batchId: res.batchId, urlSite: 'https://a.example', phone: '966501234567', country: 'SA', analysisId: 'c1',
    }));
    expect(queue.add).toHaveBeenNthCalledWith(1, 'run',
      { analysisId: 'c1', url: 'https://a.example', email: '', locale: 'ar', prospect: true },
      { jobId: 'c1', timeout: 60_000, delay: 0 });
    expect(queue.add).toHaveBeenNthCalledWith(2, 'run',
      expect.objectContaining({ analysisId: 'c2', url: 'https://b.example' }),
      { jobId: 'c2', timeout: 60_000, delay: 30_000 });
  });

  it('se place après les audits de prospects déjà programmés (ignore les autres tâches)', async () => {
    const { service, queue } = setup({
      delayed: [
        { data: { prospect: true },  timestamp: 1_000_000, opts: { delay: 300_000 } },
        { data: { prospect: false }, timestamp: 1_000_000, opts: { delay: 900_000 } }, // nouvelle tentative d'un audit client
        null,
      ],
    });
    await service.importCsv('https://a.example');
    expect(queue.add).toHaveBeenCalledWith('run', expect.anything(), expect.objectContaining({ delay: 330_000 }));
  });

  it('ignore les boutiques déjà importées et les hôtes internes, sans rien créer pour elles', async () => {
    const { service, db, queue } = setup({ existing: [hashUrl('https://deja.example')] });
    const res = await service.importCsv('url\nhttps://deja.example\nhttps://interne.example\nhttp://127.0.0.1\nhttps://ok.example');

    expect(res.queued).toBe(1);
    expect(res.issues.map((i) => [i.line, i.code])).toEqual([
      [2, 'already_imported'], [3, 'host_rejected'], [4, 'invalid_url'],
    ]);
    expect(db.createAnalysis).toHaveBeenCalledTimes(1);
    expect(db.createAnalysis).toHaveBeenCalledWith(expect.objectContaining({ urlSite: 'https://ok.example' }));
    expect(queue.add).toHaveBeenCalledTimes(1);
  });

  it('CSV vide ou sans colonne URL → 400, rien en base', async () => {
    const { service, db } = setup();
    await expect(service.importCsv('   ')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.importCsv('nom,phone\nA,1')).rejects.toBeInstanceOf(BadRequestException);
    expect(db.createAnalysis).not.toHaveBeenCalled();
  });

  it('langue non supportée → 400', async () => {
    const { service } = setup();
    await expect(service.importCsv('https://a.example', 'de' as any)).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('ProspectsService.list', () => {
  it('borne la pagination (limite 1–200, page ≥ 1)', async () => {
    const { service, db } = setup();
    await service.list({ page: 0, limit: 10_000, batchId: 'b1' });
    expect(db.listProspects).toHaveBeenCalledWith({ batchId: 'b1', limit: 200, offset: 0 });
    await service.list({ page: 3, limit: 50 });
    expect(db.listProspects).toHaveBeenLastCalledWith({ batchId: undefined, limit: 50, offset: 100 });
  });
});
