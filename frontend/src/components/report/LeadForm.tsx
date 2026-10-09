'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useLocale, useTranslations } from 'next-intl';
import { Wrench, Loader2, CheckCircle2, Send } from 'lucide-react';
import { api } from '@/lib/api';
import { useCaptcha } from '@/hooks/useCaptcha';

// Golfe d'abord (marché prioritaire) ; '' = numéro saisi avec son indicatif.
const COUNTRY_CODES = ['+966', '+971', '+974', '+965', '+973', '+968', '+20', '+212', '+33', '+1', ''];
const DEFAULT_CODE: Record<string, string> = { ar: '+966', en: '+971', fr: '+33' };

/** Numéro international « +… » à partir de l'indicatif choisi et du numéro saisi (0 national retiré). */
export function toInternational(countryCode: string, raw: string): string {
  const digits = raw.trim().replace(/[\s().-]/g, '');
  if (!digits) return '';
  if (digits.startsWith('+') || digits.startsWith('00')) return digits;
  return countryCode ? `${countryCode}${digits.replace(/^0+/, '')}` : digits;
}

const ERROR_KEYS = ['contact_required', 'phone_international', 'phone_invalid'] as const;

export default function LeadForm({ analysisId }: { analysisId: string }) {
  const t = useTranslations('reportPage.lead');
  const locale = useLocale();
  const { getToken, isSignedIn } = useAuth();
  const captcha = useCaptcha(!isSignedIn, locale);

  const [open, setOpen]       = useState(false);
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [code, setCode]       = useState(DEFAULT_CODE[locale] ?? '+966');
  const [phone, setPhone]     = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email.trim() && !phone.trim()) { setError(t('errors.contact_required')); return; }
    setSending(true);
    try {
      const token = isSignedIn ? await getToken() : null;
      await api.createLead(analysisId, {
        name: name || undefined,
        email: email || undefined,
        phone: phone ? toInternational(code, phone) : undefined,
        message: message || undefined,
        cfTurnstileToken: captcha.token ?? undefined,
      }, token);
      setDone(true);
    } catch (err: any) {
      const key = ERROR_KEYS.find((k) => err?.message === k);
      setError(key ? t(`errors.${key}`) : err?.statusCode === 429 ? t('errors.tooMany') : t('errors.generic'));
      captcha.reset();
    } finally {
      setSending(false);
    }
  }

  const input = 'w-full rounded-velifa-md border border-border bg-transparent px-3 py-2 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:border-accent';

  return (
    <div className="velifa-card" style={{ borderColor: 'rgba(212,175,55,0.35)' }}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h2 className="font-heading font-semibold text-text flex items-center gap-2">
            <Wrench className="w-4 h-4 text-accent" /> {t('title')}
          </h2>
          <p className="text-sm text-text-muted mt-1">{t('subtitle')}</p>
        </div>
        {!open && !done && (
          <button type="button" className="velifa-btn flex-shrink-0" onClick={() => setOpen(true)}>{t('cta')}</button>
        )}
      </div>

      {done ? (
        <p className="mt-4 text-sm score-good flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> {t('success')}</p>
      ) : open && (
        <form onSubmit={submit} className="mt-5 space-y-3" noValidate>
          <div className="grid sm:grid-cols-2 gap-3">
            <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('name')} maxLength={120} aria-label={t('name')} />
            <input className={input} type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('email')} maxLength={255} aria-label={t('email')} />
          </div>
          <div className="flex gap-2" dir="ltr">
            <select className={`${input} w-28 flex-shrink-0`} value={code} onChange={(e) => setCode(e.target.value)} aria-label={t('countryCode')}>
              {COUNTRY_CODES.map((c) => <option key={c || 'other'} value={c}>{c || t('otherCode')}</option>)}
            </select>
            <input className={input} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t('phone')} maxLength={32} aria-label={t('phone')} />
          </div>
          <textarea className={input} rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t('message')} maxLength={1000} aria-label={t('message')} />
          {captcha.widget}
          {error && <p className="text-sm score-poor">{error}</p>}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <p className="text-[11px] text-text-subtle">{t('privacy')}</p>
            <button type="submit" className="velifa-btn flex-shrink-0" disabled={sending || !captcha.ready}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} {t('submit')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
