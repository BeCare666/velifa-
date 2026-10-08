'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import {
  X, Zap, Loader2, ArrowRight, RefreshCw, Eye,
  Sparkles, Clock,
} from 'lucide-react';
import { api } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────
interface CachedInfo { id: string }

interface Props {
  onClose: () => void;
}

// ── Composant ─────────────────────────────────────────────────────────────────
export default function NewAuditModal({ onClose }: Props) {
  const router = useRouter();
  const { getToken, isSignedIn } = useAuth();
  const { user } = useUser();
  const inputRef = useRef<HTMLInputElement>(null);

  const [url, setUrl]               = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [rateLimited, setRateLimited] = useState(false);
  const [cachedInfo, setCachedInfo] = useState<CachedInfo | null>(null);

  const clerkEmail = user?.primaryEmailAddress?.emailAddress ?? undefined;

  // Focus champ URL à l'ouverture
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  // Ferme sur Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent, force = false) {
    e.preventDefault();
    if (!url.trim()) return;
    setError('');
    setRateLimited(false);
    setCachedInfo(null);
    setLoading(true);
    try {
      const authToken = isSignedIn ? await getToken() : undefined;
      const res = await api.createAnalysis({
        url:               url.trim(),
        email:             clerkEmail,
        cfTurnstileToken:  'dev-bypass',
        locale:            'fr',
        force,
      }, authToken);
      const { id, cached } = res.data;
      onClose();
      if (cached) {
        router.push(`/analyse/${id}`);
      } else {
        router.push(`/analyse/loading-page?id=${id}`);
      }
    } catch (err: any) {
      if (err?.statusCode === 429) {
        setRateLimited(true);
      } else {
        setError(err?.message ?? 'Une erreur est survenue. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes modalBackdropIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes modalCardIn {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .modal-backdrop { animation: modalBackdropIn 0.2s ease both; }
        .modal-card     { animation: modalCardIn 0.28s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>

      {/* Backdrop */}
      <div
        className="modal-backdrop fixed inset-0 z-[9999] flex items-center justify-center px-4"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        {/* Carte */}
        <div
          className="modal-card relative w-full max-w-[500px] rounded-[18px] overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, #1c1c1c 0%, #111111 100%)',
            border:     '1px solid rgba(212,175,55,0.22)',
            boxShadow:  '0 32px 80px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.03)',
          }}
        >
          {/* Lueur dorée subtile en haut */}
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.45) 50%, transparent 100%)' }}
          />

          {/* Bouton fermer */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-[8px] transition-all"
            style={{ color: 'rgba(255,255,255,0.35)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="px-8 py-8 space-y-6">
            {/* En-tête */}
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.25)' }}
                >
                  <Zap className="w-4 h-4" style={{ color: '#D4AF37' }} />
                </div>
                <h2
                  className="font-heading font-bold text-lg tracking-tight"
                  style={{ color: 'rgba(255,255,255,0.92)' }}
                >
                  ✦ Nouvel audit
                </h2>
              </div>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.42)', paddingLeft: '2.5rem' }}>
                Analysez les performances de votre site en 30 secondes
              </p>
            </div>

            {/* Formulaire */}
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Champ URL */}
              <div>
                <label
                  className="block text-xs font-semibold tracking-widest uppercase mb-2"
                  style={{ color: 'rgba(255,255,255,0.35)' }}
                >
                  URL du site
                </label>
                <input
                  ref={inputRef}
                  type="url"
                  value={url}
                  onChange={(e) => { setUrl(e.target.value); setError(''); setRateLimited(false); }}
                  placeholder="https://votre-site.com"
                  required
                  disabled={loading}
                  className="w-full px-4 py-3.5 rounded-[12px] text-sm outline-none transition-all disabled:opacity-50"
                  style={{
                    background:  'rgba(255,255,255,0.05)',
                    border:      error ? '1px solid rgba(255,78,66,0.55)' : '1px solid rgba(255,255,255,0.10)',
                    color:       'rgba(255,255,255,0.90)',
                    fontSize:    '0.9375rem',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.border = '1px solid rgba(212,175,55,0.50)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212,175,55,0.08)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.border = error
                      ? '1px solid rgba(255,78,66,0.55)'
                      : '1px solid rgba(255,255,255,0.10)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Rapport en cache */}
              {cachedInfo && (
                <div
                  className="rounded-[12px] p-4 space-y-3"
                  style={{
                    background:   'rgba(212,175,55,0.07)',
                    border:       '1px solid rgba(212,175,55,0.30)',
                  }}
                >
                  <div className="flex items-start gap-2.5">
                    <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#D4AF37' }} />
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>
                        Ce site a déjà été analysé récemment
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                        Un rapport existe (moins de 24h). Voir ou relancer ?
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { onClose(); router.push(`/analyse/${cachedInfo.id}`); }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[8px] text-xs font-semibold transition-all"
                      style={{
                        background: 'rgba(212,175,55,0.15)',
                        border:     '1px solid rgba(212,175,55,0.35)',
                        color:      '#D4AF37',
                      }}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Voir le rapport
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleSubmit(e as unknown as React.FormEvent, true)}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[8px] text-xs font-medium transition-all disabled:opacity-50"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border:     '1px solid rgba(255,255,255,0.12)',
                        color:      'rgba(255,255,255,0.65)',
                      }}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                      Relancer
                    </button>
                  </div>
                </div>
              )}

              {/* Limite 429 */}
              {rateLimited && (
                <div
                  className="rounded-[12px] p-4 space-y-3"
                  style={{
                    background: 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(168,123,30,0.05) 100%)',
                    border:     '1px solid rgba(212,175,55,0.30)',
                  }}
                >
                  <div className="flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#D4AF37' }} />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: '#D4AF37' }}>
                        Limite d&apos;audits atteinte
                      </p>
                      <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.50)' }}>
                        Le plan gratuit est limité à 3 audits par 24h. Passez Pro pour des audits illimités.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { onClose(); router.push('/tarifs'); }}
                    className="flex items-center gap-1.5 text-xs font-semibold py-2 px-3 rounded-[8px] transition-all"
                    style={{
                      background: 'rgba(212,175,55,0.15)',
                      border:     '1px solid rgba(212,175,55,0.35)',
                      color:      '#D4AF37',
                    }}
                  >
                    <Sparkles className="w-3 h-3" />
                    Passer Pro — 9€/mois
                  </button>
                </div>
              )}

              {/* Erreur générique */}
              {error && (
                <p
                  className="text-xs px-1"
                  style={{ color: '#FF4E42' }}
                >
                  {error}
                </p>
              )}

              {/* Bouton submit */}
              {!cachedInfo && !rateLimited && (
                <button
                  type="submit"
                  disabled={loading || !url.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-[12px] text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
                  style={{
                    background:  'linear-gradient(135deg, #D4AF37 0%, #A87B1E 100%)',
                    color:       '#0A0A0A',
                    boxShadow:   loading ? 'none' : '0 6px 20px rgba(212,175,55,0.30)',
                    letterSpacing: '0.01em',
                  }}
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Lancement de l&apos;analyse...</>
                  ) : (
                    <>Analyser maintenant <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              )}
            </form>

            {/* Note discrète */}
            <p
              className="text-center text-[11px]"
              style={{ color: 'rgba(255,255,255,0.22)', marginTop: '0.25rem' }}
            >
              Analyse Lighthouse — résultats en ~30 secondes
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
