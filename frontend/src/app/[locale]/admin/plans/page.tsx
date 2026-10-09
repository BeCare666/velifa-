'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Save, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';

/** Messages des erreurs renvoyées par PUT /admin/plans/:code. */
const ERRORS: Record<string, string> = {
  price_invalid: 'Prix invalide (nombre positif, 2 décimales maximum ; un plan payant ne peut pas être à 0).',
  variant_invalid: 'Variante Lemon Squeezy invalide (identifiant numérique, mensuelle et annuelle différentes).',
  limit_invalid: 'Limite invalide (nombre entier positif).',
  plan_not_found: 'Plan inconnu.',
};

const LABEL: Record<string, string> = { free: 'Gratuit', pro: 'Pro', business: 'Business (agence)' };

const box = { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 20 } as const;
const inp = { width: '100%', height: 34, padding: '0 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 8, color: 'rgba(255,255,255,0.85)', fontSize: 13, boxSizing: 'border-box' } as const;
const lbl = { display: 'block', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.40)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 } as const;

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
  const [status, setStatus]     = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const token = await getToken().catch(() => null);
    const res = await api.admin.getPlanPricing(token);
    const list = res?.data ?? res;
    setCodes(list.map((p: any) => p.code));
    setForms(Object.fromEntries(list.map((p: any) => [p.code, toForm(p)])));
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
    setStatus((s) => ({ ...s, [code]: 'Enregistrement…' }));
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
      setStatus((s) => ({ ...s, [code]: 'Enregistré ✓ (appliqué sous 1 minute)' }));
    } catch (e: any) {
      const msg = Array.isArray(e.message) ? e.message.join(', ') : ERRORS[e.message] ?? e.message;
      setStatus((s) => ({ ...s, [code]: `⚠️ ${msg}` }));
    }
  }

  const variantField = (code: string, key: 'lemonVariantMonthly' | 'lemonVariantYearly', interval: 'month' | 'year') => {
    const options = (variants ?? []).filter((v) => !v.interval || v.interval === interval);
    return options.length > 0 ? (
      <select style={inp} value={forms[code][key]} onChange={(e) => set(code, key, e.target.value)}>
        <option value="">— aucune —</option>
        {options.map((v) => (
          <option key={v.id} value={v.id}>
            {v.product} · {v.name} · ${(v.priceCents ?? 0) / 100}{v.interval ? `/${v.interval}` : ''}{v.testMode ? ' (test)' : ''} — #{v.id}
          </option>
        ))}
      </select>
    ) : (
      <input style={inp} dir="ltr" placeholder="ID de variante" value={forms[code][key]} onChange={(e) => set(code, key, e.target.value)} />
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d0d', padding: '32px 32px 64px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.90)', margin: 0 }}>Plans et prix</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.40)', marginTop: 4, marginBottom: 8, lineHeight: 1.6 }}>
          Prix en USD affichés sur la page Tarifs, variantes Lemon Squeezy utilisées au paiement, et limites appliquées par le serveur.
          Les fonctions réservées au plan Business (audits programmés, PDF, widget, API) ne se modifient pas ici.
        </p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.40)', marginBottom: 24 }}>
          Le prix affiché doit correspondre au prix de la variante Lemon Squeezy choisie (c’est elle qui est facturée).
          Les produits se créent dans le tableau de bord Lemon Squeezy (l’API ne permet que de les lire).
          <button type="button" onClick={loadVariants} style={{ marginLeft: 8, background: 'none', border: 'none', color: '#D4AF37', cursor: 'pointer', fontSize: 12 }}>
            <RefreshCw style={{ width: 11, height: 11, display: 'inline' }} /> Recharger les variantes
          </button>
        </p>
        {variantsError && <p style={{ fontSize: 12, color: '#f59e0b', marginBottom: 16 }}>{variantsError}</p>}

        <div style={{ display: 'grid', gap: 16 }}>
          {codes.map((code) => forms[code] && (
            <div key={code} style={box}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#D4AF37', margin: '0 0 14px' }}>{LABEL[code] ?? code}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                {code !== 'free' && (<>
                  <div><label style={lbl}>Prix mensuel (USD)</label><input style={inp} type="number" min={0} step="0.01" value={forms[code].priceMonthly} onChange={(e) => set(code, 'priceMonthly', e.target.value)} /></div>
                  <div><label style={lbl}>Prix annuel (USD, vide = aucun)</label><input style={inp} type="number" min={0} step="0.01" value={forms[code].priceYearly} onChange={(e) => set(code, 'priceYearly', e.target.value)} /></div>
                  <div><label style={lbl}>Variante mensuelle</label>{variantField(code, 'lemonVariantMonthly', 'month')}</div>
                  <div><label style={lbl}>Variante annuelle</label>{variantField(code, 'lemonVariantYearly', 'year')}</div>
                </>)}
                <div><label style={lbl}>Sites suivis</label><input style={inp} type="number" min={0} step={1} value={forms[code].siteLimit} onChange={(e) => set(code, 'siteLimit', e.target.value)} /></div>
                {code === 'business' && (<>
                  <div><label style={lbl}>Audits API / jour</label><input style={inp} type="number" min={0} step={1} value={forms[code].apiDailyLimit} onChange={(e) => set(code, 'apiDailyLimit', e.target.value)} /></div>
                  <div><label style={lbl}>Audits widget / jour / agence</label><input style={inp} type="number" min={0} step={1} value={forms[code].widgetDailyLimit} onChange={(e) => set(code, 'widgetDailyLimit', e.target.value)} /></div>
                </>)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
                <button type="button" onClick={() => save(code)}
                  style={{ height: 34, padding: '0 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.35)', color: '#D4AF37' }}>
                  <Save style={{ width: 13, height: 13 }} /> Enregistrer
                </button>
                {status[code] && <span style={{ fontSize: 12, color: status[code].startsWith('⚠️') ? '#ef4444' : 'rgba(255,255,255,0.55)' }}>{status[code]}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
