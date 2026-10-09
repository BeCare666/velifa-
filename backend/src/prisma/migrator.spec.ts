import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { loadMigrations, runMigrations, splitStatements, Migration, MIGRATIONS_DIR } from './migrator';

describe('splitStatements', () => {
  it('découpe sur « ; » en fin de ligne et ignore les commentaires', () => {
    const sql = '-- titre\nCREATE TABLE a (\n  x INT -- pas un commentaire de ligne entière\n);\n\n-- note\nALTER TABLE a ADD COLUMN IF NOT EXISTS y INT;\n';
    expect(splitStatements(sql)).toEqual([
      'CREATE TABLE a (\n  x INT -- pas un commentaire de ligne entière\n)',
      'ALTER TABLE a ADD COLUMN IF NOT EXISTS y INT',
    ]);
  });
});

/** Base simulée : enregistre les instructions et la table schema_migrations. */
function fakeDb(opts: { failOn?: RegExp } = {}) {
  const executed: string[] = [];
  const applied = new Map<string, string>();
  const exec = jest.fn(async (sql: string, params?: unknown[]) => {
    if (opts.failOn?.test(sql)) throw new Error('syntax error');
    if (sql.startsWith('SELECT version')) return [...applied].map(([version, checksum]) => ({ version, checksum }));
    if (sql.startsWith('INSERT INTO schema_migrations')) { applied.set(String(params![0]), String(params![2])); return []; }
    executed.push(sql);
    return [];
  });
  return { exec, executed, applied };
}

const mig = (version: string, statements: string[], checksum = `sum${version}`): Migration =>
  ({ version, name: `m${version}`, checksum, statements });

describe('runMigrations', () => {
  it('base vide : crée schema_migrations, applique dans l’ordre et enregistre chaque version', async () => {
    const db = fakeDb();
    const report = await runMigrations(db.exec, [mig('001', ['A1', 'A2']), mig('002', ['B1'])]);
    expect(db.executed[0]).toContain('CREATE TABLE IF NOT EXISTS schema_migrations');
    expect(db.executed.slice(1)).toEqual(['A1', 'A2', 'B1']);
    expect(report).toEqual({ applied: ['001', '002'], alreadyApplied: [] });
    expect([...db.applied.keys()]).toEqual(['001', '002']);
  });

  it('idempotent : un second passage n’exécute rien', async () => {
    const db = fakeDb();
    const list = [mig('001', ['A1']), mig('002', ['B1'])];
    await runMigrations(db.exec, list);
    db.executed.length = 0;
    const report = await runMigrations(db.exec, list);
    expect(db.executed.filter((s) => !s.includes('schema_migrations'))).toEqual([]);
    expect(report).toEqual({ applied: [], alreadyApplied: ['001', '002'] });
  });

  it('nouvelle migration ajoutée plus tard : seule celle-ci est appliquée', async () => {
    const db = fakeDb();
    await runMigrations(db.exec, [mig('001', ['A1'])]);
    db.executed.length = 0;
    const report = await runMigrations(db.exec, [mig('001', ['A1']), mig('002', ['B1'])]);
    expect(db.executed.filter((s) => !s.includes('schema_migrations'))).toEqual(['B1']);
    expect(report.applied).toEqual(['002']);
  });

  it('migration déjà appliquée puis modifiée → refus', async () => {
    const db = fakeDb();
    await runMigrations(db.exec, [mig('001', ['A1'], 'v1')]);
    await expect(runMigrations(db.exec, [mig('001', ['A1 modifiée'], 'v2')])).rejects.toThrow('modifiée après application');
  });

  it('échec au milieu : erreur explicite, version non enregistrée (relançable), suivantes non exécutées', async () => {
    const db = fakeDb({ failOn: /^BAD/ });
    await expect(runMigrations(db.exec, [mig('001', ['A1', 'BAD', 'A3']), mig('002', ['B1'])]))
      .rejects.toThrow('Migration 001_m001 échouée : syntax error');
    expect(db.executed.slice(1)).toEqual(['A1']);
    expect(db.applied.size).toBe(0);
  });
});

describe('loadMigrations', () => {
  it('refuse un nom de fichier invalide ou une version en double', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mig-'));
    fs.writeFileSync(path.join(dir, '001_ok.sql'), 'SELECT 1;');
    fs.writeFileSync(path.join(dir, '001_bis.sql'), 'SELECT 2;');
    expect(() => loadMigrations(dir)).toThrow('Version de migration en double');
    fs.rmSync(path.join(dir, '001_bis.sql'));
    fs.writeFileSync(path.join(dir, 'ajout colonne.sql'), 'SELECT 3;');
    expect(() => loadMigrations(dir)).toThrow('Nom de migration invalide');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('empreinte indépendante des fins de ligne (CRLF / LF)', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mig-'));
    fs.writeFileSync(path.join(dir, '001_a.sql'), 'SELECT 1;\r\nSELECT 2;\r\n');
    const crlf = loadMigrations(dir)[0].checksum;
    fs.writeFileSync(path.join(dir, '001_a.sql'), 'SELECT 1;\nSELECT 2;\n');
    expect(loadMigrations(dir)[0].checksum).toBe(crlf);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe('migrations du projet', () => {
  const migrations = loadMigrations(MIGRATIONS_DIR);
  const statements = migrations.flatMap((m) => m.statements);

  it('versions consécutives à partir de 001', () => {
    expect(migrations.map((m) => m.version)).toEqual(migrations.map((_, i) => String(i + 1).padStart(3, '0')));
  });

  it('chaque instruction est idempotente (IF NOT EXISTS)', () => {
    for (const s of statements) {
      expect(s).toMatch(/^(CREATE TABLE IF NOT EXISTS|ALTER TABLE \w+ ADD COLUMN IF NOT EXISTS|CREATE (?:UNIQUE )?INDEX IF NOT EXISTS)\b/);
    }
  });

  /** Colonnes définies par les migrations, par table. */
  const schema = new Map<string, Set<string>>();
  for (const s of statements) {
    let m = /^CREATE TABLE IF NOT EXISTS (\w+) \(([\s\S]*)\)[^)]*$/.exec(s);
    if (m) {
      const cols = m[2].split('\n').map((l) => l.trim()).filter((l) => /^[a-z_]+\s/.test(l) && !/^(PRIMARY|KEY|UNIQUE)\b/.test(l))
        .map((l) => l.split(/\s+/)[0]);
      schema.set(m[1], new Set([...(schema.get(m[1]) ?? []), ...cols]));
      continue;
    }
    m = /^ALTER TABLE (\w+) ADD COLUMN IF NOT EXISTS (\w+)/.exec(s);
    if (m) schema.get(m[1])!.add(m[2]);
  }

  it('toutes les colonnes lues ou écrites par le code existent dans le schéma', () => {
    const src = (f: string) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    const db = src('prisma/database.service.ts');
    const used: [string, string][] = [];

    // analyses : lecture (rowToAnalysis) et écriture (columnMap de updateAnalysis)
    const rowToAnalysis = db.slice(db.indexOf('private rowToAnalysis'), db.indexOf('private parseJson'));
    for (const m of rowToAnalysis.matchAll(/row\.([a-z_]+)/g)) used.push(['analyses', m[1]]);
    const columnMap = db.slice(db.indexOf('const columnMap'), db.indexOf('for (const [key, value]'));
    for (const m of columnMap.matchAll(/'([a-z_]+)'/g)) used.push(['analyses', m[1]]);

    // INSERT INTO t (colonnes) dans tout le code
    for (const f of ['prisma/database.service.ts', 'admin/admin.service.ts']) {
      for (const m of src(f).matchAll(/INSERT (?:IGNORE )?INTO (\w+) \(([^)]+)\)/g)) {
        for (const c of m[2].split(',')) used.push([m[1], c.trim()]);
      }
    }
    // users : colonnes utilisées par l'admin et les abonnements
    for (const c of ['clerk_user_id', 'subscription_plan', 'subscription_status', 'lemon_subscription_id', 'suspended', 'suspended_at', 'updated_at']) {
      used.push(['users', c]);
    }

    const missing = used.filter(([t, c]) => !schema.get(t)?.has(c)).map(([t, c]) => `${t}.${c}`);
    expect(used.length).toBeGreaterThan(60);
    expect([...new Set(missing)]).toEqual([]);
  });
});
