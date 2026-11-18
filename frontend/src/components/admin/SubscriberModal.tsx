'use client';

import { Fragment, useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { X, ExternalLink, Mail, Ban, CheckCircle2, Loader2 } from 'lucide-react';
import { Badge, TableShell, Th, Td } from '@/components/ui';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@clerk/nextjs';
import { toast } from '@/components/admin/AdminToast';

const ISSUE_INFO: Record<string, { label: string; severity: 'Critique' | 'Important' | 'Mineur'; color: string; text: string; icon: string; solution: string }> = {
  lcp: {
    label: 'LCP lent', severity: 'Critique', color: 'var(--velifa-score-poor)', icon: '⏱',
    text: "Temps de chargement principal trop lent. Le contenu principal met plus de 2.5s à apparaître. Impact : les visiteurs quittent le site avant de le voir.",
    solution: "Compresser et redimensionner les images (formats WebP/AVIF), activer la mise en cache et un CDN, charger les ressources critiques en priorité (preload) et différer le JS/CSS non essentiel.",
  },
  cls: {
    label: 'Instabilité visuelle', severity: 'Important', color: 'var(--velifa-score-average)', icon: '📐',
    text: "Instabilité visuelle. Les éléments bougent pendant le chargement. Impact : mauvaise expérience utilisateur, clics accidentels.",
    solution: "Définir des dimensions (width/height) fixes pour les images et vidéos, réserver l'espace des publicités/iframes, et éviter d'insérer du contenu dynamique au-dessus du contenu existant.",
  },
  tbt: {
    label: 'Page peu réactive', severity: 'Important', color: 'var(--velifa-score-average)', icon: '🐢',
    text: "Page peu réactive. Le navigateur est bloqué pendant le chargement. Impact : l'utilisateur ne peut pas interagir avec la page rapidement.",
    solution: "Réduire et découper le JavaScript en petits morceaux (code splitting), supprimer le code inutilisé, et différer/charger en asynchrone les scripts tiers (analytics, chat, pubs).",
  },
  seo: {
    label: 'Problèmes SEO', severity: 'Important', color: 'var(--velifa-score-average)', icon: '🔍',
    text: "Problèmes de référencement. Le site est mal optimisé pour les moteurs de recherche. Impact : moins de visiteurs organiques.",
    solution: "Ajouter des balises title/meta description uniques, des balises alt sur les images, une structure de titres (H1-H2) cohérente, et un fichier sitemap.xml accessible.",
  },
  accessibility: {
    label: 'Problèmes d\'accessibilité', severity: 'Important', color: 'var(--velifa-score-average)', icon: '♿',
    text: "Problèmes d'accessibilité. Le site est difficile à utiliser pour les personnes handicapées. Impact : exclusion d'utilisateurs.",
    solution: "Ajouter des textes alternatifs aux images, garantir un contraste suffisant des couleurs, rendre le site navigable au clavier et utiliser des attributs ARIA appropriés.",
  },
  best_practices: {
    label: 'Mauvaises pratiques', severity: 'Mineur', color: 'var(--text-muted)', icon: '⚠️',
    text: "Mauvaises pratiques web. Problèmes de sécurité ou de performance potentiels.",
    solution: "Utiliser HTTPS partout, mettre à jour les bibliothèques avec failles connues, éviter les erreurs console et corriger les ressources avec un mauvais ratio d'aspect.",
  },
};

function scoreColor(score: number) {
  if (score >= 80) return 'var(--velifa-score-good)';
  if (score >= 50) return 'var(--velifa-score-average)';
  return 'var(--velifa-score-poor)';
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'up') return <span className="font-semibold" style={{ color: 'var(--velifa-score-good)' }} aria-label="En hausse">↑</span>;
  if (trend === 'down') return <span className="font-semibold" style={{ color: 'var(--velifa-score-poor)' }} aria-label="En baisse">↓</span>;
  return <span className="text-text-subtle" aria-label="Stable">→</span>;
}

export default function SubscriberModal({ subscriber, onClose, onChanged }: { subscriber: any; onClose: () => void; onChanged: () => void }) {
  const { getToken } = useAuth();
  const locale = useLocale();
  const [tab, setTab] = useState<'header' | 'sites' | 'issues' | 'actions'>('header');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmSuspend, setConfirmSuspend] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!subscriber) return null;
  const s = subscriber;

  // Aggregate issues across all sites
  const issueMap: Record<string, number> = {};
  (s.sites ?? []).forEach((site: any) => {
    (site.issues ?? []).forEach((iss: string) => { issueMap[iss] = (issueMap[iss] ?? 0) + 1; });
  });

  async function doSuspend() {
    setBusy(true);
    try {
      const token = await getToken();
      if (!token) { toast('Session expirée, reconnectez-vous', 'error'); return; }
      if (s.suspended) {
        await api.admin.unsuspendUser(token, s.clerkUserId);
        toast('Compte réactivé', 'success');
      } else {
        await api.admin.suspendUser(token, s.clerkUserId);
        toast('Compte suspendu', 'success');
      }
      setConfirmSuspend(false);
      onChanged();
      onClose();
    } catch (e: any) { toast(e.message ?? 'Erreur', 'error'); }
    finally { setBusy(false); }
  }

  async function changePlan(plan: string) {
    setBusy(true);
    try {
      const token = await getToken();
      if (!token) { toast('Session expirée, reconnectez-vous', 'error'); return; }
      await api.admin.updatePlan(token, s.clerkUserId, plan);
      toast(`Plan mis à jour : ${plan}`, 'success');
      onChanged();
    } catch (e: any) { toast(e.message ?? 'Erreur', 'error'); }
    finally { setBusy(false); }
  }

  const tabs: { key: typeof tab; label: string }[] = [
    { key: 'header', label: 'Vue d\'ensemble' },
    { key: 'sites', label: 'Sites' },
    { key: 'issues', label: 'Problèmes' },
    { key: 'actions', label: 'Actions' },
  ];

  const tile = 'rounded-velifa-md border border-border bg-[color:var(--bg-subtle)] px-4 py-3.5';
  const tileLabel = 'mb-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-text-subtle';

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-5" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={s.email ?? s.clerkUserId}
        className="flex max-h-[92vh] w-full max-w-[880px] flex-col overflow-hidden rounded-t-velifa-xl border border-border bg-[color:var(--surface)] shadow-velifa-lg sm:max-h-[88vh] sm:rounded-velifa-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full border border-border bg-[color:var(--bg-subtle)] text-sm font-semibold text-text">
              {(s.email ?? s.clerkUserId ?? '?').slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text" dir="ltr">{s.email ?? s.clerkUserId}</p>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="inline-flex items-center rounded-full bg-[color:var(--surface-raised)] px-2 py-0.5 text-[11px] font-semibold text-text ring-1 ring-inset ring-[color:var(--border-strong)]">
                  {s.plan === 'business' ? 'Business' : 'Pro'}
                </span>
                {s.suspended && <Badge tone="poor">Suspendu</Badge>}
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer"
            className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-[8px] border border-border text-text-muted transition-colors hover:text-text">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Onglets */}
        <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-border px-5 sm:px-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`-mb-px whitespace-nowrap border-b-2 px-3 py-3 text-xs font-semibold transition-colors ${
                tab === t.key ? 'border-[color:var(--text)] text-text' : 'border-transparent text-text-muted hover:text-text'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {tab === 'header' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  { label: 'Sites audités', value: s.sitesCount },
                  { label: 'Audits totaux', value: s.auditsCount },
                  { label: 'Score moyen', value: `${s.avgScore}%`, color: scoreColor(s.avgScore) },
                  { label: 'Problèmes', value: s.totalProblems, color: s.totalProblems > 0 ? 'var(--velifa-score-poor)' : 'var(--velifa-score-good)' },
                ].map((kpi) => (
                  <div key={kpi.label} className={tile}>
                    <p className={tileLabel}>{kpi.label}</p>
                    <p className="font-heading text-2xl font-semibold tabular-nums" style={{ color: kpi.color ?? 'var(--text)' }}>{kpi.value}</p>
                  </div>
                ))}
              </div>

              <div className={tile}>
                <p className={tileLabel}>Répartition des sites</p>
                {(() => {
                  const dist = [
                    { label: 'Critique (<50)', pct: s.performanceDistribution?.critical ?? 0, color: 'var(--velifa-score-poor)' },
                    { label: 'À améliorer (50-79)', pct: s.performanceDistribution?.needsImprovement ?? 0, color: 'var(--velifa-score-average)' },
                    { label: 'Bon (80+)', pct: s.performanceDistribution?.good ?? 0, color: 'var(--velifa-score-good)' },
                  ];
                  return (
                    <>
                      <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-[color:var(--surface-raised)]">
                        {dist.map((d) => <span key={d.label} style={{ width: `${d.pct}%`, background: d.color }} />)}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
                        {dist.map((d) => (
                          <span key={d.label} className="inline-flex items-center gap-1.5 text-xs text-text-muted">
                            <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                            {d.label} <span className="font-semibold tabular-nums text-text">{d.pct}%</span>
                          </span>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { label: 'Pire site', site: s.worstSite },
                  { label: 'Meilleur site', site: s.bestSite },
                ].map(({ label, site }) => (
                  <div key={label} className={tile}>
                    <p className={tileLabel}>{label}</p>
                    {site ? (
                      <div className="flex items-center justify-between gap-3">
                        <span className="min-w-0 truncate text-xs text-text" dir="ltr">{site.url}</span>
                        <span className="text-lg font-semibold tabular-nums" style={{ color: scoreColor(site.score) }}>{site.score}%</span>
                      </div>
                    ) : <p className="text-xs text-text-subtle">—</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'sites' && (
            <TableShell minWidth={560}>
              <thead>
                <tr>{['URL', 'Score moyen', 'Audits', 'Tendance', 'Problèmes'].map((h) => <Th key={h}>{h}</Th>)}</tr>
              </thead>
              <tbody>
                {(s.sites ?? []).map((site: any) => (
                  <Fragment key={site.url}>
                    <tr className="cursor-pointer transition-colors hover:bg-[color:var(--surface-raised)]" onClick={() => setExpanded(expanded === site.url ? null : site.url)}>
                      <Td className="max-w-[240px] truncate text-xs text-text"><span dir="ltr">{site.url}</span></Td>
                      <Td className="font-semibold tabular-nums"><span style={{ color: scoreColor(site.avgScore) }}>{site.avgScore}%</span></Td>
                      <Td className="tabular-nums text-text-muted">{site.count}</Td>
                      <Td><TrendIcon trend={site.trend} /></Td>
                      <Td>{site.issues?.length ? <Badge tone="poor">{site.issues.length}</Badge> : <Badge tone="good">OK</Badge>}</Td>
                    </tr>
                    {expanded === site.url && (
                      <tr className="bg-[color:var(--bg-subtle)]">
                        <Td colSpan={5}>
                          {site.issues?.length ? (
                            <div className="flex flex-wrap gap-2">
                              {site.issues.map((iss: string) => (
                                <span key={iss} className="rounded-[6px] border border-border px-2 py-1 text-[11px]" style={{ color: ISSUE_INFO[iss]?.color }}>
                                  {ISSUE_INFO[iss]?.icon} {ISSUE_INFO[iss]?.label}
                                </span>
                              ))}
                            </div>
                          ) : <span className="text-xs text-text-muted">Aucun problème détecté.</span>}
                        </Td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </TableShell>
          )}

          {tab === 'issues' && (
            <div className="space-y-4">
              {Object.keys(issueMap).length === 0 && (
                <p className="text-sm text-text-muted">Aucun problème détecté sur les sites de cet utilisateur.</p>
              )}
              {(s.sites ?? []).filter((site: any) => site.issues?.length).map((site: any) => (
                <div key={site.url} className="overflow-hidden rounded-velifa-md border border-border">
                  <div className="flex items-center justify-between gap-3 border-b border-border bg-[color:var(--bg-subtle)] px-4 py-2.5">
                    <span className="min-w-0 truncate text-xs font-semibold text-text" dir="ltr">{site.url}</span>
                    <span className="text-xs font-semibold tabular-nums" style={{ color: scoreColor(site.avgScore) }}>{site.avgScore}%</span>
                  </div>
                  <div className="space-y-3 p-4">
                    {site.issues.map((key: string) => {
                      const info = ISSUE_INFO[key];
                      if (!info) return null;
                      return (
                        <div key={key} className="rounded-velifa-md border border-border p-4">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="text-base">{info.icon}</span>
                            <span className="text-sm font-semibold text-text">{info.label}</span>
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ color: info.color, background: 'var(--accent-soft)' }}>{info.severity}</span>
                          </div>
                          <p className="mb-3 text-xs leading-relaxed text-text-muted">{info.text}</p>
                          <div className="rounded-[8px] px-3 py-2.5" style={{ background: 'var(--velifa-score-good-bg)' }}>
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--velifa-score-good)' }}>Solution recommandée</p>
                            <p className="text-xs leading-relaxed text-text">{info.solution}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'actions' && (
            <div className="space-y-3">
              <div className={tile}>
                <p className="mb-3 text-sm font-semibold text-text">Statut du compte</p>
                {!confirmSuspend ? (
                  <button
                    type="button"
                    onClick={() => setConfirmSuspend(true)}
                    disabled={busy}
                    className="inline-flex h-9 items-center gap-2 rounded-velifa-md px-4 text-xs font-semibold disabled:opacity-50"
                    style={{
                      color: s.suspended ? 'var(--velifa-score-good)' : 'var(--velifa-score-poor)',
                      background: s.suspended ? 'var(--velifa-score-good-bg)' : 'var(--velifa-score-poor-bg)',
                    }}
                  >
                    {s.suspended ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                    {s.suspended ? 'Réactiver le compte' : 'Suspendre le compte'}
                  </button>
                ) : (
                  <div>
                    <p className="mb-3 text-xs text-text-muted">
                      {s.suspended ? 'Réactiver ce compte ?' : 'Suspendre ce compte ? L\'utilisateur ne pourra plus lancer d\'audits.'}
                    </p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setConfirmSuspend(false)} className="h-9 rounded-velifa-md border border-border px-4 text-xs text-text-muted hover:text-text">Annuler</button>
                      <button type="button" onClick={doSuspend} disabled={busy} className="inline-flex h-9 items-center gap-2 rounded-velifa-md px-4 text-xs font-semibold disabled:opacity-50"
                        style={{ color: 'var(--velifa-score-poor)', background: 'var(--velifa-score-poor-bg)' }}>
                        {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Confirmer
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className={tile}>
                <label htmlFor="sub-plan" className="mb-3 block text-sm font-semibold text-text">Changer le plan</label>
                <select
                  id="sub-plan"
                  defaultValue={s.plan}
                  disabled={busy}
                  onChange={(e) => changePlan(e.target.value)}
                  className="h-9 cursor-pointer rounded-velifa-md border border-border bg-[color:var(--surface)] px-3 text-xs text-text focus:outline-none disabled:opacity-50"
                >
                  <option value="free">Gratuit</option>
                  <option value="pro">Pro</option>
                  <option value="business">Business</option>
                </select>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Link href={`/${locale}/admin/audits?user=${s.clerkUserId}`} className="velifa-btn inline-flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" /> Voir tous ses audits
                </Link>
                {s.email && (
                  <a href={`mailto:${s.email}`} className="velifa-btn velifa-btn--ghost inline-flex items-center gap-2">
                    <Mail className="h-4 w-4" /> Envoyer un email
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
