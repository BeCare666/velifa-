'use client';

import { useEffect, useState } from 'react';
import { X, ExternalLink, Mail, Ban, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@clerk/nextjs';
import { toast } from '@/components/admin/AdminToast';

const ISSUE_INFO: Record<string, { label: string; severity: 'Critique' | 'Important' | 'Mineur'; color: string; text: string; icon: string; solution: string }> = {
  lcp: {
    label: 'LCP lent', severity: 'Critique', color: '#ef4444', icon: '⏱',
    text: "Temps de chargement principal trop lent. Le contenu principal met plus de 2.5s à apparaître. Impact : les visiteurs quittent le site avant de le voir.",
    solution: "Compresser et redimensionner les images (formats WebP/AVIF), activer la mise en cache et un CDN, charger les ressources critiques en priorité (preload) et différer le JS/CSS non essentiel.",
  },
  cls: {
    label: 'Instabilité visuelle', severity: 'Important', color: '#f59e0b', icon: '📐',
    text: "Instabilité visuelle. Les éléments bougent pendant le chargement. Impact : mauvaise expérience utilisateur, clics accidentels.",
    solution: "Définir des dimensions (width/height) fixes pour les images et vidéos, réserver l'espace des publicités/iframes, et éviter d'insérer du contenu dynamique au-dessus du contenu existant.",
  },
  tbt: {
    label: 'Page peu réactive', severity: 'Important', color: '#f59e0b', icon: '🐢',
    text: "Page peu réactive. Le navigateur est bloqué pendant le chargement. Impact : l'utilisateur ne peut pas interagir avec la page rapidement.",
    solution: "Réduire et découper le JavaScript en petits morceaux (code splitting), supprimer le code inutilisé, et différer/charger en asynchrone les scripts tiers (analytics, chat, pubs).",
  },
  seo: {
    label: 'Problèmes SEO', severity: 'Important', color: '#f59e0b', icon: '🔍',
    text: "Problèmes de référencement. Le site est mal optimisé pour les moteurs de recherche. Impact : moins de visiteurs organiques.",
    solution: "Ajouter des balises title/meta description uniques, des balises alt sur les images, une structure de titres (H1-H2) cohérente, et un fichier sitemap.xml accessible.",
  },
  accessibility: {
    label: 'Problèmes d\'accessibilité', severity: 'Important', color: '#f59e0b', icon: '♿',
    text: "Problèmes d'accessibilité. Le site est difficile à utiliser pour les personnes handicapées. Impact : exclusion d'utilisateurs.",
    solution: "Ajouter des textes alternatifs aux images, garantir un contraste suffisant des couleurs, rendre le site navigable au clavier et utiliser des attributs ARIA appropriés.",
  },
  best_practices: {
    label: 'Mauvaises pratiques', severity: 'Mineur', color: 'rgba(255,255,255,0.45)', icon: '⚠️',
    text: "Mauvaises pratiques web. Problèmes de sécurité ou de performance potentiels.",
    solution: "Utiliser HTTPS partout, mettre à jour les bibliothèques avec failles connues, éviter les erreurs console et corriger les ressources avec un mauvais ratio d'aspect.",
  },
};

function scoreColor(score: number) {
  if (score >= 80) return '#22c55e';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'up') return <span style={{ color: '#22c55e' }}>↑</span>;
  if (trend === 'down') return <span style={{ color: '#ef4444' }}>↓</span>;
  return <span style={{ color: 'rgba(255,255,255,0.35)' }}>→</span>;
}

export default function SubscriberModal({ subscriber, onClose, onChanged }: { subscriber: any; onClose: () => void; onChanged: () => void }) {
  const { getToken } = useAuth();
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
      if (!token) { toast('Token manquant', 'error'); return; }
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
      if (!token) { toast('Token manquant', 'error'); return; }
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

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}>
      <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 16, width: '100%', maxWidth: 880, maxHeight: '88vh', display: 'flex', flexDirection: 'column', animation: 'modalIn .22s cubic-bezier(.22,1,.36,1)', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.30)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#D4AF37' }}>
              {(s.email ?? s.clerkUserId ?? '?').slice(0, 1).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.90)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.email ?? s.clerkUserId}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center' }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: s.plan === 'business' ? '#a8a8a8' : '#D4AF37', background: s.plan === 'business' ? 'rgba(168,168,168,0.10)' : 'rgba(212,175,55,0.12)', borderRadius: 99, padding: '2px 8px' }}>
                  {s.plan === 'business' ? 'Business' : 'Pro'}
                </span>
                {s.suspended && (
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.30)' }}>SUSPENDU</span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.50)', cursor: 'pointer', flexShrink: 0 }}>
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, padding: '10px 22px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ padding: '8px 14px', fontSize: 12, fontWeight: 600, borderRadius: '8px 8px 0 0', cursor: 'pointer', background: tab === t.key ? 'rgba(212,175,55,0.10)' : 'transparent', border: 'none', borderBottom: tab === t.key ? '2px solid #D4AF37' : '2px solid transparent', color: tab === t.key ? '#D4AF37' : 'rgba(255,255,255,0.45)' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: 22, overflowY: 'auto', flex: 1 }}>
          {tab === 'header' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Sites audités', value: s.sitesCount },
                  { label: 'Audits totaux', value: s.auditsCount },
                  { label: 'Score moyen', value: `${s.avgScore}%`, color: scoreColor(s.avgScore) },
                  { label: 'Problèmes', value: s.totalProblems, color: s.totalProblems > 0 ? '#ef4444' : '#22c55e' },
                ].map(kpi => (
                  <div key={kpi.label} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{kpi.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: kpi.color ?? 'rgba(255,255,255,0.85)' }}>{kpi.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Critique (<50)', pct: s.performanceDistribution?.critical ?? 0, color: '#ef4444' },
                  { label: 'À améliorer (50-79)', pct: s.performanceDistribution?.needsImprovement ?? 0, color: '#f59e0b' },
                  { label: 'Bon (80+)', pct: s.performanceDistribution?.good ?? 0, color: '#22c55e' },
                ].map(d => (
                  <div key={d.label} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 6 }}>{d.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: d.color }}>{d.pct}%</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: 6 }}>Pire site</div>
                  {s.worstSite ? (
                    <>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.worstSite.url}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: scoreColor(s.worstSite.score) }}>{s.worstSite.score}%</div>
                    </>
                  ) : <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.30)' }}>—</div>}
                </div>
                <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.18)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: 6 }}>Meilleur site</div>
                  {s.bestSite ? (
                    <>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.bestSite.url}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: scoreColor(s.bestSite.score) }}>{s.bestSite.score}%</div>
                    </>
                  ) : <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.30)' }}>—</div>}
                </div>
              </div>
            </div>
          )}

          {tab === 'sites' && (
            <div style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    {['URL', 'Score moyen', 'Audits', 'Tendance', 'Problèmes'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.30)', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(s.sites ?? []).map((site: any) => (
                    <>
                      <tr key={site.url} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}
                        onClick={() => setExpanded(expanded === site.url ? null : site.url)}>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: 'rgba(255,255,255,0.70)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{site.url}</td>
                        <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, color: scoreColor(site.avgScore) }}>{site.avgScore}%</td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{site.count}</td>
                        <td style={{ padding: '10px 12px', fontSize: 14 }}><TrendIcon trend={site.trend} /></td>
                        <td style={{ padding: '10px 12px' }}>
                          {site.issues?.length ? (
                            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: 'rgba(239,68,68,0.10)', color: '#ef4444' }}>{site.issues.length}</span>
                          ) : (
                            <span style={{ fontSize: 10, color: '#22c55e' }}>OK</span>
                          )}
                        </td>
                      </tr>
                      {expanded === site.url && (
                        <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                          <td colSpan={5} style={{ padding: '10px 16px' }}>
                            {site.issues?.length ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {site.issues.map((iss: string) => (
                                  <span key={iss} style={{ fontSize: 11, color: ISSUE_INFO[iss]?.color, background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: '4px 8px' }}>
                                    {ISSUE_INFO[iss]?.icon} {ISSUE_INFO[iss]?.label}
                                  </span>
                                ))}
                              </div>
                            ) : <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Aucun problème détecté.</span>}
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'issues' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {Object.keys(issueMap).length === 0 && (
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>Aucun problème détecté sur les sites de cet utilisateur. 🎉</div>
              )}
              {(s.sites ?? []).filter((site: any) => site.issues?.length).map((site: any) => (
                <div key={site.url} style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.80)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{site.url}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor(site.avgScore) }}>{site.avgScore}%</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14 }}>
                    {site.issues.map((key: string) => {
                      const info = ISSUE_INFO[key];
                      if (!info) return null;
                      return (
                        <div key={key} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <span style={{ fontSize: 16 }}>{info.icon}</span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{info.label}</span>
                            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99, color: info.color, background: 'rgba(255,255,255,0.05)' }}>{info.severity}</span>
                          </div>
                          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, margin: '0 0 8px' }}>{info.text}</p>
                          <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.18)', borderRadius: 8, padding: '8px 12px' }}>
                            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#22c55e', margin: '0 0 4px' }}>Solution recommandée</p>
                            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, margin: 0 }}>{info.solution}</p>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.80)', marginBottom: 10 }}>Statut du compte</div>
                {!confirmSuspend ? (
                  <button onClick={() => setConfirmSuspend(true)} disabled={busy}
                    style={{ height: 34, padding: '0 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, background: s.suspended ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.07)', border: `1px solid ${s.suspended ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.18)'}`, color: s.suspended ? '#22c55e' : '#ef4444' }}>
                    {s.suspended ? <CheckCircle2 style={{ width: 13, height: 13 }} /> : <Ban style={{ width: 13, height: 13 }} />}
                    {s.suspended ? 'Réactiver le compte' : 'Suspendre le compte'}
                  </button>
                ) : (
                  <div>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginBottom: 10 }}>
                      {s.suspended ? 'Réactiver ce compte ?' : 'Suspendre ce compte ? L\'utilisateur ne pourra plus lancer d\'audits.'}
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setConfirmSuspend(false)} style={{ height: 32, padding: '0 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.60)' }}>Annuler</button>
                      <button onClick={doSuspend} disabled={busy} style={{ height: 32, padding: '0 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', color: '#ef4444' }}>Confirmer</button>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.80)', marginBottom: 10 }}>Changer le plan</div>
                <select defaultValue={s.plan} disabled={busy} onChange={e => changePlan(e.target.value)}
                  style={{ height: 34, padding: '0 12px', borderRadius: 8, fontSize: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.75)', cursor: 'pointer', outline: 'none' }}>
                  <option value="free">Gratuit</option>
                  <option value="pro">Pro</option>
                  <option value="business">Business</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link href={`/admin/audits?user=${s.clerkUserId}`}
                  style={{ height: 36, padding: '0 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(212,175,55,0.10)', border: '1px solid rgba(212,175,55,0.25)', color: '#D4AF37', textDecoration: 'none' }}>
                  <ExternalLink style={{ width: 13, height: 13 }} /> Voir tous ses audits
                </Link>
                {s.email && (
                  <a href={`mailto:${s.email}`}
                    style={{ height: 36, padding: '0 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.65)', textDecoration: 'none' }}>
                    <Mail style={{ width: 13, height: 13 }} /> Envoyer un email
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes modalIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}
