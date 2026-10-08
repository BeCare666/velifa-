'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  HelpCircle, Mail, MessageCircle, BookOpen,
  ChevronDown, ChevronUp, Gem, Sparkles, Zap,
} from 'lucide-react';
import { useSubscription } from '@/context/SubscriptionContext';

// ── FAQ ──────────────────────────────────────────────────────────────────────
const FAQ = [
  {
    q: 'Comment fonctionne un audit Velifa ?',
    a: "Velifa analyse votre URL avec Lighthouse (Google) et extrait les métriques de performance (LCP, CLS, FID), le score SEO, les technologies détectées et les recommandations d'amélioration. L'analyse prend généralement 20 à 40 secondes.",
  },
  {
    q: 'Quelle est la différence entre les plans Gratuit, Pro et Business ?',
    a: 'Le plan Gratuit donne accès à 3 audits et un historique limité. Le plan Pro offre des audits illimités, l\'historique complet et les rapports détaillés. Le plan Business ajoute le suivi multi-sites, les alertes de performance et l\'accès API.',
  },
  {
    q: 'Mes données sont-elles sécurisées ?',
    a: 'Oui. Velifa utilise Clerk pour l\'authentification et ne stocke jamais vos mots de passe. Les URLs que vous auditez sont uniquement utilisées pour générer le rapport Lighthouse.',
  },
  {
    q: 'Puis-je relancer un audit sur la même URL ?',
    a: 'Absolument. Depuis la page "Mes Audits", cliquez sur le bouton "Relancer" à côté de n\'importe quel audit pour obtenir une analyse fraîche de la même URL.',
  },
  {
    q: 'Comment annuler mon abonnement ?',
    a: 'Rendez-vous dans la section "Abonnement" de votre dashboard et cliquez sur "Contacter le support". Notre équipe traitera votre demande sous 24h et vous conserverez l\'accès jusqu\'à la fin de la période en cours.',
  },
];

// ── Accordéon ────────────────────────────────────────────────────────────────
function Accordion({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="transition-all duration-200"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-4 py-4 text-start"
      >
        <span className="text-sm font-medium text-text">{q}</span>
        {open
          ? <ChevronUp className="w-4 h-4 text-accent flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-text-subtle flex-shrink-0" />
        }
      </button>
      {open && (
        <p className="text-sm text-text-muted pb-4 leading-relaxed">{a}</p>
      )}
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, icon: Icon, children }: {
  title: string; icon: React.ElementType; children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-[var(--velifa-radius-lg)] overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.45)' }}
    >
      <div
        className="flex items-center gap-2 px-6 py-4"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <Icon className="w-4 h-4 text-accent" strokeWidth={1.75} />
        <h2 className="font-heading font-semibold text-sm text-text tracking-wide">{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function SupportPage() {
  const { plan } = useSubscription();
  const isBusiness = plan === 'business';
  const isPro = plan === 'pro';

  return (
    <>
      <style jsx>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>

      <div className="min-h-screen bg-bg">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-10 sm:py-16 space-y-6">

          {/* Header + badge plan */}
          <div className="fade-up">
            
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="font-heading font-bold text-3xl sm:text-4xl text-text tracking-tight">
                Support
              </h1>
              {isBusiness && (
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase"
                  style={{ background: 'rgba(200,200,200,0.12)', border: '1px solid rgba(200,200,200,0.35)', color: '#E8E8E8' }}
                >
                  <Gem className="w-3 h-3" />
                  Support prioritaire 💎
                </span>
              )}
              {isPro && (
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase"
                  style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.35)', color: 'var(--accent)' }}
                >
                  <Sparkles className="w-3 h-3" />
                  Pro
                </span>
              )}
            </div>
            <p className="text-text-muted text-sm">
              {isBusiness
                ? 'En tant que client Business, vous bénéficiez d\'un support prioritaire avec réponse sous 4h.'
                : isPro
                  ? 'Support inclus dans votre plan Pro — réponse sous 24h.'
                  : 'Trouvez des réponses ou contactez notre équipe.'}
            </p>
          </div>

          {/* FAQ */}
          <div className="fade-up" style={{ animationDelay: '60ms' }}>
            <Section title="FAQ rapide" icon={HelpCircle}>
              <div>
                {FAQ.map((item, i) => (
                  <Accordion key={i} q={item.q} a={item.a} />
                ))}
              </div>
            </Section>
          </div>

          {/* Contact */}
          <div className="fade-up" style={{ animationDelay: '100ms' }}>
            <Section title="Nous contacter" icon={Mail}>
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Email */}
                <a
                  href="mailto:support@velifa.com"
                  className="flex items-center gap-3 p-4 rounded-[var(--velifa-radius-md)] transition-all hover:-translate-y-0.5"
                  style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)' }}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.25)' }}
                  >
                    <Mail className="w-4 h-4 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text">Email</p>
                    <p className="text-xs text-text-muted">support@velifa.com</p>
                  </div>
                </a>

                {/* WhatsApp placeholder */}
                <div
                  className="flex items-center gap-3 p-4 rounded-[var(--velifa-radius-md)] opacity-50 cursor-not-allowed"
                  style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)' }}
                  title="Disponible prochainement"
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(37,211,102,0.10)', border: '1px solid rgba(37,211,102,0.20)' }}
                  >
                    <MessageCircle className="w-4 h-4" style={{ color: '#25D366' }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text">WhatsApp</p>
                    <p className="text-xs text-text-muted">Disponible prochainement</p>
                  </div>
                </div>
              </div>

              {isBusiness && (
                <div
                  className="mt-4 flex items-center gap-2 px-4 py-3 rounded-[var(--velifa-radius-md)] text-xs"
                  style={{
                    background: 'rgba(200,200,200,0.06)',
                    border: '1px solid rgba(200,200,200,0.25)',
                    color: '#C8C8C8',
                  }}
                >
                  <Gem className="w-3.5 h-3.5 flex-shrink-0" />
                  En tant que client Business, mentionnez "BUSINESS" en objet pour un traitement prioritaire.
                </div>
              )}
            </Section>
          </div>

          {/* Documentation */}
          <div className="fade-up" style={{ animationDelay: '140ms' }}>
            <Section title="Documentation & liens utiles" icon={BookOpen}>
              <div className="space-y-2">
                {[
                  { label: 'Fonctionnalités', href: '/#features',   desc: 'Découvrez ce que Velifa peut faire pour vous.' },
                  { label: 'Tarifs',           href: '/tarifs',      desc: 'Comparez les plans et choisissez le vôtre.' },
                  { label: 'À propos',         href: '/#about',      desc: 'Notre mission et notre équipe.' },
                ].map(({ label, href, desc }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-3 p-4 rounded-[var(--velifa-radius-md)] transition-all hover:-translate-y-0.5 group"
                    style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)' }}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.18)' }}
                    >
                      <Zap className="w-3.5 h-3.5 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text group-hover:text-accent transition-colors">{label}</p>
                      <p className="text-xs text-text-muted truncate">{desc}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </Section>
          </div>

        </div>
      </div>
    </>
  );
}
