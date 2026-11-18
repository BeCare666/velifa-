'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Save, RefreshCw, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader, Panel, Skeleton, ErrorNote } from '@/components/ui';

/** Messages des erreurs renvoyées par PUT /admin/plans/:code. */
const ERRORS: Record<string, string> = {
  price_invalid: 'Prix invalide (nombre positif, 2 décimales maximum ; un plan payant ne peut pas être à 0).',
  variant_invalid: 'Variante Lemon Squeezy invalide (identifiant numérique, mensuelle et annuelle différentes).',
  limit_invalid: 'Limite invalide (nombre entier positif).',
  plan_not_found: 'Plan inconnu.',
};

const LABEL: Record<string, string> = { free: 'Gratuit', pro: 'Pro', business: 'Business (agence)' };

const inp = 'h-10 w-full rounded-velifa-md border border-border bg-[color:var(--surface)] px-3 text-sm text-text tabular-nums focus:border-[color:var(--border-strong)] focus:outline-none';
const lbl = 'mb-1.5 block text-[10px] font-medium uppercase tracking-[0.12em] text-text-subtle';

type Form = {
  priceMonthly: string; priceYearly: string; lemonVariantMonthly: string; lemonVariantYearly: string;
  siteLimit: string; apiDailyLimit: string; widgetDailyLimit: string;
};

const toForm = (p: any): Form => ({
  priceMonthly: String(p.priceMonthlyCents / 100),
  priceYearly: p.priceYearlyCents == null ? '' : String(p.priceYearlyCents / 100),
  lemonVariantMonthly: p.lemonVariantMonthly ?? '',
  lemonVariantYearly: p.lemonVariantYearly ?? '',
  siteLimit: String(p.siteLimit),
  apiDailyLimit: String(p.apiDailyLimit),
  widgetDailyLimit: String(p.widgetDailyLimit),
});

/** Backoffice : prix (USD), variantes Lemon Squeezy et limites de chaque plan. */
export default function AdminPlansPage() {
  const { getToken } = useAuth();
  const [forms, setForms]       = useState<Record<string, Form>>({});
  const [codes, setCodes]       = useState<string[]>([]);
  const [variants, setVariants] = useState<any[] | null>(null);
  const [variantsError, setVariantsError] = useState('');
  const [status, setStatus]     = useState<Record<string, { ok: boolean; text: string }>>({});
  const [saving, setSaving]     = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const token = await getToken().catch(() => null);
      const res = await api.admin.getPlanPricing(token);
      const list = res?.data ?? res;
      if (!Array.isArray(list)) throw new Error('Réponse inattendue du serveur');
      setCodes(list.map((p: any) => p.code));
      setForms(Object.fromEntries(list.map((p: any) => [p.code, toForm(p)])));
    } catch (e: any) { setError(e.message ?? 'Chargement impossible'); }
    finally { setLoading(false); }
  }, [getToken]);

  const loadVariants = useCallback(async () => {
    setVariantsError('');
    try {
      const token = await getToken().catch(() => null);
      const res = await api.admin.getLemonVariants(token);
      setVariants(res?.data ?? res);
    } catch (e: any) {
      setVariants([]);
      setVariantsError(e.message === 'lemon_not_configured'
        ? 'Clé Lemon Squeezy non configurée (LEMONSQUEEZY_API_KEY) : saisissez les identifiants de variantes à la main.'
        : `Lecture des variantes Lemon Squeezy impossible : ${e.message}`);
    }
  }, [getToken]);

  useEffect(() => { load(); loadVariants(); }, [load, loadVariants]);

  const set = (code: string, key: keyof Form, value: string) =>
    setForms((f) => ({ ...f, [code]: { ...f[code], [key]: value } }));

  async function save(code: string) {
    const f = forms[code];
    setSaving(code);
    setStatus((s) => { const n = { ...s }; delete n[code]; return n; });
    try {
      const token = await getToken().catch(() => null);
      const res = await api.admin.updatePlanPricing(token, code, {
        priceMonthly: Number(f.priceMonthly || 0),
        priceYearly: f.priceYearly.trim() === '' ? null : Number(f.priceYearly),
        lemonVariantMonthly: f.lemonVariantMonthly.trim() || null,
        lemonVariantYearly: f.lemonVariantYearly.trim() || null,
        siteLimit: Number(f.siteLimit),
        apiDailyLimit: Number(f.apiDailyLimit),
        widgetDailyLimit: Number(f.widgetDailyLimit),
      });
      setForms((all) => ({ ...all, [code]: toForm(res?.data ?? res) }));
      setStatus((s) => ({ ...s, [code]: { ok: true, text: 'Enregistré — appliqué sous 1 minute' } }));
    } catch (e: any) {
      const msg = Array.isArray(e.message) ? e.message.join(', ') : ERRORS[e.message] ?? e.message;
      setStatus((s) => ({ ...s, [code]: { ok: false, text: msg } }));
    } finally { setSaving(null); }
  }

  const variantField = (code: string, key: 'lemonVariantMonthly' | 'lemonVariantYearly', interval: 'month' | 'year') => {
    const options = (variants ?? []).filter((v) => !v.interval || v.interval === interval);
    return options.length > 0 ? (
      <select className={inp} value={forms[code][key]} onChange={(e) => set(code, key, e.target.value)}>
        <option value="">— aucune —</option>
        {options.map((v) => (
          <option key={v.id} value={v.id}>
            {v.product} · {v.name} · ${(v.priceCents ?? 0) / 100}{v.interval ? `/${v.interval}` : ''}{v.testMode ? ' (test)' : ''} — #{v.id}
          </option>
        ))}
      </select>
    ) : (
      <input className={inp} dir="ltr" placeholder="ID de variante" value={forms[code][key]} onChange={(e) => set(code, key, e.target.value)} />
    );
  };

  const field = (code: string, key: keyof Form, label: string, step: string) => (
    <div>
      <label htmlFor={`${code}-${key}`} className={lbl}>{label}</label>
      <input id={`${code}-${key}`} className={inp} type="number" min={0} step={step} dir="ltr"
        value={forms[code][key]} onChange={(e) => set(code, key, e.target.value)} />
    </div>
  );

  return (
    <div className="min-h-screen bg-bg px-5 pb-16 pt-8 sm:px-8">
      <div className="mx-auto max-w-[1100px]">
        <PageHeader
          eyebrow="Administration"
          title="Plans et prix"
          description="Prix en USD affichés sur la page Tarifs, variantes Lemon Squeezy utilisées au paiement, et limites appliquées par le serveur. Les fonctions réservées au plan Business (audits programmés, PDF, widget, API) ne se modifient pas ici."
        />

        <div className="mb-6 flex flex-col gap-3 rounded-velifa-lg border border-border bg-[color:var(--surface)] p-4 text-xs leading-relaxed text-text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            Le prix affiché doit correspondre au prix de la variante Lemon Squeezy choisie (c’est elle qui est facturée).
            Les produits se créent dans le tableau de bord Lemon Squeezy (l’API ne permet que de les lire).
          </p>
          <button type="button" onClick={loadVariants} className="inline-flex h-9 flex-shrink-0 items-center gap-2 self-start rounded-velifa-md border border-border px-3 font-medium text-text transition-colors hover:border-[color:var(--border-strong)] sm:self-auto">
            <RefreshCw className="h-3.5 w-3.5" /> Recharger les variantes
          </button>
        </div>
        {variantsError && (
          <p className="mb-5 rounded-velifa-md px-4 py-3 text-xs" style={{ color: 'var(--velifa-score-average)', background: 'var(--velifa-score-average-bg)' }}>{variantsError}</p>
        )}

        {error && <ErrorNote>{error}</ErrorNote>}

        {loading ? (
          <div className="space-y-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-48 rounded-velifa-lg" />)}</div>
        ) : (
          <div className="space-y-5">
            {codes.map((code) => forms[code] && (
              <Panel key={code} title={<span className="text-base">{LABEL[code] ?? code}</span>}>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {code !== 'free' && (<>
                    {field(code, 'priceMonthly', 'Prix mensuel (USD)', '0.01')}
                    {field(code, 'priceYearly', 'Prix annuel (USD, vide = aucun)', '0.01')}
                    <div><label className={lbl}>Variante mensuelle</label>{variantField(code, 'lemonVariantMonthly', 'month')}</div>
                    <div><label className={lbl}>Variante annuelle</label>{variantField(code, 'lemonVariantYearly', 'year')}</div>
                  </>)}
                  {field(code, 'siteLimit', 'Sites suivis', '1')}
                  {code === 'business' && (<>
                    {field(code, 'apiDailyLimit', 'Audits API / jour', '1')}
                    {field(code, 'widgetDailyLimit', 'Audits widget / jour / agence', '1')}
                  </>)}
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-4">
                  <button type="button" onClick={() => save(code)} disabled={saving === code} className="velifa-btn inline-flex items-center gap-2 disabled:opacity-60">
                    {saving === code ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {saving === code ? 'Enregistrement…' : 'Enregistrer'}
                  </button>
                  {status[code] && (
                    <span className="text-xs" style={{ color: status[code].ok ? 'var(--velifa-score-good)' : 'var(--velifa-score-poor)' }}>
                      {status[code].text}
                    </span>
                  )}
                </div>
              </Panel>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
