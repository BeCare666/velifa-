/**
 * Applique les migrations en attente puis s'arrête : `npm run migrate` (après `npm run build`).
 * Lit DATABASE_URL dans l'environnement.
 */
import * as mysql from 'mysql2/promise';
import { loadMigrations, runMigrations } from './migrator';

async function main(): Promise<void> {
  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error('DATABASE_URL manquant');
  const conn = await mysql.createConnection({ uri, ssl: { rejectUnauthorized: false } });
  try {
    const report = await runMigrations(
      async (sql, params) => (await conn.query(sql, params))[0] as any[],
      loadMigrations(),
      (msg) => console.log(msg),
    );
    console.log(`${report.applied.length} migration(s) appliquée(s), ${report.alreadyApplied.length} déjà en place.`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err?.message ?? err);
  process.exit(1);
});
