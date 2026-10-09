/**
 * Copie dans le backend les textes du rapport (source : frontend/src/messages/*.json, espace `reportPage`)
 * utilisés par le rapport PDF. Usage : `npm run i18n:sync` après toute modification de ces textes.
 * Le test `report-messages.spec.ts` échoue si le fichier généré n'est plus à jour.
 */
const fs = require('fs');
const path = require('path');

const LOCALES = ['fr', 'en', 'ar'];
const MESSAGES_DIR = path.resolve(__dirname, '../../frontend/src/messages');
const OUT = path.resolve(__dirname, '../src/i18n/report-messages.generated.ts');

function extract(locale) {
  const r = JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, `${locale}.json`), 'utf8')).reportPage;
  return {
    scoreLabel: r.scoreLabel,
    field: r.field,
    lab: r.lab,
    scores: r.scores,
    recs: { title: r.recs.title, impact: r.recs.impact, list: r.recs.list },
    gulf: { title: r.gulf.title, disclaimer: r.gulf.disclaimer, blocked: r.gulf.blocked, ok: r.gulf.ok, issues: r.gulf.issues },
    impact: { title: r.impact.title, body: r.impact.body, caveat: r.impact.caveat },
  };
}

function build() {
  const data = Object.fromEntries(LOCALES.map((l) => [l, extract(l)]));
  return `// Fichier généré par scripts/sync-report-texts.js — ne pas modifier à la main.\n` +
    `// Source : frontend/src/messages/{fr,en,ar}.json (reportPage).\n` +
    `export const REPORT_MESSAGES = ${JSON.stringify(data, null, 2)} as const;\n`;
}

module.exports = { build, OUT };

if (require.main === module) {
  fs.writeFileSync(OUT, build());
  console.log(`Écrit : ${path.relative(process.cwd(), OUT)}`);
}
