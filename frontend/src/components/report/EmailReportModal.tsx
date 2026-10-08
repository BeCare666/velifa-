'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useLocale, useTranslations } from 'next-intl';
import { Mail, X, Loader2, CheckCircle2, Send } from 'lucide-react';
import { api } from '@/lib/api';

const LS_PREFIX = 'velifa_email_sent_';

interface Props {
  analysisId: string;
  siteUrl?: string;
  score?: number;
  reportUrl?: string;
}

// Golfe d'abord (marché prioritaire), puis autres marchés ; '' = saisie libre avec indicatif.
const COUNTRY_CODES = ['+966', '+971', '+974', '+965', '+973', '+968', '+20', '+212', '+33', '+1', '+229', '+225', '+221', ''];
const DEFAULT_CODE: Record<string, string> = { ar: '+966', en: '+971', fr: '+33' };

export default function EmailReportModal({ analysisId, siteUrl, score, reportUrl }: Props) {
  const { user } = useUser();
  const { getToken, isSignedIn } = useAuth();
  const t = useTranslations('emailModal');
  const locale = useLocale();
  const [visible, setVisible]   = useState(false);
  const [email, setEmail]       = useState('');
  const [countryCode, setCountryCode] = useState(DEFAULT_CODE[locale] ?? '+966');
  const [whatsapp, setWhatsapp] = useState('');
  const [sending, setSending]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [sentMessage, setSentMessage] = useState('');
  const [error, setError]       = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Ne pas afficher si déjà envoyé pour ce rapport
    const alreadySent = localStorage.getItem(LS_PREFIX + analysisId) === 'true';
    if (alreadySent) return;

    // Pré-remplir avec l'email Clerk si connecté
    const clerkEmail = user?.primaryEmailAddress?.emailAddress ?? '';
    setEmail(clerkEmail);

    // Délai doux avant d'afficher
    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisId, user]);

  useEffect(() => {
    if (visible) setTimeout(() => inputRef.current?.focus(), 150);
  }, [visible]);

  function dismiss() {
    setVisible(false);
  }

  function buildWhatsappLink(): string | null {
    if (!whatsapp.trim()) return null;

    // Nettoyer le numéro saisi (retirer espaces, points, tirets, parenthèses)
    let digits = whatsapp.trim().replace(/[\s().-]/g, '');

    // Si le numéro commence déjà par un "+" ou par l'indicatif, ne pas le redoubler
    if (digits.startsWith('+')) {
      digits = digits.replace(/^\+/, '');
    } else if (countryCode) {
      const ccDigits = countryCode.replace('+', '');
      if (!digits.startsWith(ccDigits)) {
        digits = ccDigits + digits;
      }
    }

    const reportLink = reportUrl ?? (typeof window !== 'undefined' ? window.location.href : '');

    const message = t('whatsappMessage', { site: siteUrl ?? '', score: score ?? '—', url: reportLink });

    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() && !whatsapp.trim()) return;
    setSending(true);
    setError('');

    let emailOk = false;
    let whatsappOk = false;

    try {
      if (email.trim()) {
        await api.sendReportEmail(analysisId, email.trim(), isSignedIn ? await getToken() : null);
        emailOk = true;
      }

      if (whatsapp.trim()) {
        const link = buildWhatsappLink();
        if (link) {
          window.open(link, '_blank', 'noopener,noreferrer');
          whatsappOk = true;
        }
      }

      if (emailOk && whatsappOk) {
        setSentMessage(t('sentBoth'));
      } else if (emailOk) {
        setSentMessage(t('sentEmail'));
      } else if (whatsappOk) {
        setSentMessage(t('sentWhatsapp'));
      }

      setSent(true);
      localStorage.setItem(LS_PREFIX + analysisId, 'true');
      setTimeout(() => setVisible(false), 2500);
    } catch (err: any) {
      setError(err?.message ?? t('error'));
    } finally {
      setSending(false);
    }
  }

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
        style={{ background: 'rgba(0,0,0,0.70)', backdropFilter: 'blur(4px)' }}
        onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
      >
        {/* Carte modale */}
        <div
          className="relative w-full max-w-md rounded-[16px] overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #1a1a1a 0%, #111111 100%)',
            border: '1px solid rgba(212,175,55,0.25)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.80), 0 0 0 1px rgba(255,255,255,0.04)',
            animation: 'modalIn 0.3s cubic-bezier(0.22,1,0.36,1)',
          }}
        >
          <style>{`
            @keyframes modalIn {
              from { opacity: 0; transform: translateY(16px) scale(0.97); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>

          {/* Bouton fermer */}
          <button
            onClick={dismiss}
            className="absolute top-4 end-4 p-1.5 rounded-[8px] text-text-subtle transition-colors"
            style={{ color: 'rgba(255,255,255,0.40)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.80)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.40)'; }}
            aria-label={t('close')}
          >
            <X className="w-4 h-4" />
          </button>

          <div className="px-7 py-8">
            {sent ? (
              /* ── État envoyé ── */
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(12,206,107,0.15)', border: '1px solid rgba(12,206,107,0.35)' }}
                >
                  <CheckCircle2 className="w-6 h-6" style={{ color: '#0CCE6B' }} />
                </div>
                <div>
                  <p className="font-heading font-bold text-base" style={{ color: '#0CCE6B' }}>
                    {sentMessage || t('sentGeneric')}
                  </p>
                  <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    {t('checkInbox')}
                  </p>
                </div>
              </div>
            ) : (
              /* ── Formulaire ── */
              <form onSubmit={handleSend} className="space-y-5">
                {/* Icône + titre */}
                <div className="flex items-start gap-4">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.25)' }}
                  >
                    <Mail className="w-5 h-5" style={{ color: '#D4AF37' }} />
                  </div>
                  <div>
                    <h2 className="font-heading font-bold text-base" style={{ color: 'rgba(255,255,255,0.92)' }}>
                      {t('title')}
                    </h2>
                    <p className="text-sm mt-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                      {t('subtitle')}
                    </p>
                  </div>
                </div>

                {/* Champs email + whatsapp */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Champ email */}
                  <div>
                    <label className="block text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {t('byEmail')}
                    </label>
                    <input
                      ref={inputRef}
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(''); }}
                      placeholder={t('emailPlaceholder')}
                      dir="ltr"
                      disabled={sending}
                      className="w-full px-4 py-3 rounded-[10px] text-sm outline-none transition-all disabled:opacity-50"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: error ? '1px solid rgba(255,78,66,0.60)' : '1px solid rgba(255,255,255,0.12)',
                        color: 'rgba(255,255,255,0.90)',
                      }}
                      onFocus={(e) => { e.currentTarget.style.border = '1px solid rgba(212,175,55,0.50)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212,175,55,0.08)'; }}
                      onBlur={(e) => { e.currentTarget.style.border = error ? '1px solid rgba(255,78,66,0.60)' : '1px solid rgba(255,255,255,0.12)'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                  </div>

                  {/* Champ WhatsApp */}
                  <div>
                    <label className="block text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {t('byWhatsapp')}
                    </label>
                    <div className="flex gap-1.5" dir="ltr">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        disabled={sending}
                        className="px-2 py-3 rounded-[10px] text-sm outline-none transition-all disabled:opacity-50"
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          color: 'rgba(255,255,255,0.90)',
                          maxWidth: '88px',
                        }}
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={c || 'other'} value={c} style={{ background: '#1a1a1a' }}>
                            {c || t('other')}
                          </option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        value={whatsapp}
                        onChange={(e) => { setWhatsapp(e.target.value); setError(''); }}
                        placeholder={t('phonePlaceholder')}
                        disabled={sending}
                        className="w-full px-4 py-3 rounded-[10px] text-sm outline-none transition-all disabled:opacity-50"
                        style={{
                          background: 'rgba(37,211,102,0.06)',
                          border: '1px solid rgba(37,211,102,0.25)',
                          color: 'rgba(255,255,255,0.90)',
                        }}
                        onFocus={(e) => { e.currentTarget.style.border = '1px solid rgba(37,211,102,0.55)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,211,102,0.10)'; }}
                        onBlur={(e) => { e.currentTarget.style.border = '1px solid rgba(37,211,102,0.25)'; e.currentTarget.style.boxShadow = 'none'; }}
                      />
                    </div>
                  </div>
                </div>

                {error && (
                  <p className="text-xs -mt-2" style={{ color: '#FF4E42' }}>{error}</p>
                )}

                {/* Boutons */}
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <button
                    type="submit"
                    disabled={sending || (!email.trim() && !whatsapp.trim())}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[10px] text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: 'linear-gradient(135deg, #D4AF37 0%, #A87B1E 100%)',
                      color: '#0A0A0A',
                      boxShadow: '0 4px 16px rgba(212,175,55,0.25)',
                    }}
                  >
                    {sending
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('sending')}</>
                      : <><Send className="w-4 h-4" /> {t('send')}</>
                    }
                  </button>
                  <button
                    type="button"
                    onClick={dismiss}
                    disabled={sending}
                    className="flex-1 py-2.5 rounded-[10px] text-sm font-medium transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.10)',
                      color: 'rgba(255,255,255,0.55)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.80)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; }}
                  >
                    {t('noThanks')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
