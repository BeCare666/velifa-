import * as dns from 'dns';
import { validateUrl, isBlockedIp, assertPublicHost, safeLookup, hashUrl } from './url.validator';

describe('isBlockedIp', () => {
  it.each([
    '127.0.0.1', '10.1.2.3', '172.20.0.5', '172.31.255.255', '192.168.1.1',
    '169.254.169.254', '100.64.0.1', '0.0.0.0', '224.0.0.1',
    '::1', '::', 'fc00::1', 'fd12:3456::1', 'fe80::1',
    '::ffff:127.0.0.1', '::ffff:7f00:1', '::ffff:a01:203',
  ])('bloque %s', (ip) => {
    expect(isBlockedIp(ip)).toBe(true);
  });

  it.each(['93.184.215.14', '8.8.8.8', '172.32.0.1', '2606:4700:4700::1111'])(
    'autorise l’adresse publique %s',
    (ip) => {
      expect(isBlockedIp(ip)).toBe(false);
    },
  );

  it('refuse une chaîne qui n’est pas une IP', () => {
    expect(isBlockedIp('pas-une-ip')).toBe(true);
  });
});

describe('validateUrl', () => {
  it.each([
    'http://127.0.0.1',
    'http://169.254.169.254/latest/meta-data/',
    'http://10.1.2.3',
    'http://172.20.0.5',
    'http://192.168.1.1',
    'http://[::ffff:7f00:1]',
    'http://localhost:3000',
    'http://intranet.local',
    'http://monserveur',
    'ftp://example.com',
    'https://user:pass@example.com',
    'https://example.com:8443',
    'https://example.com/fichier.zip',
  ])('rejette %s', (url) => {
    expect(validateUrl(url).valid).toBe(false);
  });

  it('accepte une URL publique', () => {
    expect(validateUrl('https://example.com').valid).toBe(true);
  });

  it('met l’hôte en minuscules mais conserve la casse du chemin', () => {
    const r = validateUrl('HTTPS://Shop.Example.COM/Produits/ABC?Ref=X#top');
    expect(r.normalized).toBe('https://shop.example.com/Produits/ABC?Ref=X');
  });

  it('supprime le slash final pour que le cache reconnaisse la même page', () => {
    expect(validateUrl('https://example.com/').normalized).toBe('https://example.com');
    expect(hashUrl(validateUrl('https://example.com/').normalized!))
      .toBe(hashUrl(validateUrl('https://example.com').normalized!));
  });
});

describe('assertPublicHost', () => {
  afterEach(() => jest.restoreAllMocks());

  it('rejette un domaine public qui résout vers 127.0.0.1 (ex. localtest.me)', async () => {
    jest.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '127.0.0.1', family: 4 }] as any);
    await expect(assertPublicHost('localtest.me')).rejects.toThrow('réseau privé');
  });

  it('rejette si une seule des adresses résolues est privée', async () => {
    jest.spyOn(dns.promises, 'lookup').mockResolvedValue([
      { address: '93.184.215.14', family: 4 },
      { address: '10.0.0.5', family: 4 },
    ] as any);
    await expect(assertPublicHost('mixte.example')).rejects.toThrow();
  });

  it('accepte un domaine qui ne résout que vers des adresses publiques', async () => {
    jest.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '93.184.215.14', family: 4 }] as any);
    await expect(assertPublicHost('example.com')).resolves.toBeUndefined();
  });

  it('rejette un domaine introuvable', async () => {
    jest.spyOn(dns.promises, 'lookup').mockRejectedValue(new Error('ENOTFOUND'));
    await expect(assertPublicHost('nexistepas.example')).rejects.toThrow('introuvable');
  });
});

describe('safeLookup (vérification à chaque connexion)', () => {
  afterEach(() => jest.restoreAllMocks());

  function mockLookup(addresses: dns.LookupAddress[]) {
    jest.spyOn(dns, 'lookup').mockImplementation(((_h: string, _o: any, cb: any) =>
      cb(null, addresses)) as any);
  }

  it('bloque la connexion vers une IP interne', (done) => {
    mockLookup([{ address: '10.0.0.1', family: 4 }]);
    safeLookup('redirection.example', {}, (err) => {
      expect(err?.code).toBe('ESSRFBLOCKED');
      done();
    });
  });

  it('laisse passer une IP publique (mode adresse unique)', (done) => {
    mockLookup([{ address: '93.184.215.14', family: 4 }]);
    safeLookup('example.com', {}, (err, address, family) => {
      expect(err).toBeNull();
      expect(address).toBe('93.184.215.14');
      expect(family).toBe(4);
      done();
    });
  });

  it('renvoie la liste complète quand l’appelant demande all: true', (done) => {
    mockLookup([{ address: '93.184.215.14', family: 4 }]);
    safeLookup('example.com', { all: true }, (err, address) => {
      expect(err).toBeNull();
      expect(Array.isArray(address)).toBe(true);
      done();
    });
  });
});
