import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';

/**
 * Migrations SQL versionnées (`backend/migrations/NNN_nom.sql`).
 *
 * - Chaque fichier est appliqué une seule fois, dans l'ordre, puis enregistré dans `schema_migrations`.
 * - Un fichier déjà appliqué ne doit plus être modifié : son empreinte SHA-256 est vérifiée à chaque démarrage.
 * - Le DDL MySQL/TiDB n'est pas transactionnel : chaque instruction doit être idempotente (`IF NOT EXISTS`)
 *   pour qu'une migration interrompue puisse être relancée sans erreur.
 */

export const MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations');
const FILE_PATTERN = /^(\d{3})_([a-z0-9_]+)\.sql$/;

export interface Migration {
  version: string;
  name: string;
  checksum: string;
  statements: string[];
}

export type Exec = (sql: string, params?: unknown[]) => Promise<any[]>;

/** Découpe un fichier SQL en instructions (« ; » en fin de ligne), commentaires « -- » retirés. */
export function splitStatements(sql: string): string[] {
  return sql
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(/;\s*(?:\n|$)/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function loadMigrations(dir = MIGRATIONS_DIR): Migration[] {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  const seen = new Set<string>();
  return files.map((file) => {
    const m = FILE_PATTERN.exec(file);
    if (!m) throw new Error(`Nom de migration invalide : ${file} (attendu : 001_nom.sql)`);
    if (seen.has(m[1])) throw new Error(`Version de migration en double : ${m[1]}`);
    seen.add(m[1]);
    const sql = fs.readFileSync(path.join(dir, file), 'utf8').replace(/\r\n/g, '\n');
    return {
      version: m[1],
      name: m[2],
      checksum: createHash('sha256').update(sql).digest('hex'),
      statements: splitStatements(sql),
    };
  });
}

export interface MigrationReport {
  applied: string[];
  alreadyApplied: string[];
}

export async function runMigrations(exec: Exec, migrations: Migration[], log: (msg: string) => void = () => {}): Promise<MigrationReport> {
  await exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    VARCHAR(20)  NOT NULL,
      name       VARCHAR(255) NOT NULL,
      checksum   CHAR(64)     NOT NULL,
      applied_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (version)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  const rows = await exec('SELECT version, checksum FROM schema_migrations');
  const done = new Map<string, string>(rows.map((r: any) => [String(r.version), String(r.checksum)]));

  const report: MigrationReport = { applied: [], alreadyApplied: [] };
  for (const m of migrations) {
    const previous = done.get(m.version);
    if (previous !== undefined) {
      if (previous !== m.checksum) {
        throw new Error(`Migration ${m.version}_${m.name} modifiée après application : créez une nouvelle migration`);
      }
      report.alreadyApplied.push(m.version);
      continue;
    }
    for (const statement of m.statements) {
      try {
        await exec(statement);
      } catch (err: any) {
        throw new Error(`Migration ${m.version}_${m.name} échouée : ${err?.message}\n${statement.slice(0, 200)}`);
      }
    }
    await exec('INSERT INTO schema_migrations (version, name, checksum) VALUES (?, ?, ?)', [m.version, m.name, m.checksum]);
    log(`Migration ${m.version}_${m.name} appliquée`);
    report.applied.push(m.version);
  }
  return report;
}
