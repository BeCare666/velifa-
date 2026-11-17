# VELIFA — Construire une application haut de gamme

> Document de construction. Il part **de ce qui existe dans le code** (constats avec fichier et ligne), puis décrit
> ce qu'il faut construire pour que VELIFA soit crédible auprès de clients exigeants : boutiques qui font déjà du
> chiffre, agences, marchands Salla/Zid.
>
> Règles reprises de `ROADMAP.md` : rien n'est affiché ni facturé sans implémentation serveur ; aucun chiffre
> inventé ; chaque chantier a un critère d'acceptation vérifiable. Les chantiers marqués **(proposition)** ne
> sont pas encore validés par le propriétaire.

---

## 1. Ce que « haut de gamme » veut dire ici (critères mesurables)

Un client premium ne juge pas sur une couleur, il juge sur des détails qui ne mentent pas :

| Critère | Mesure |
|---|---|
| **Fiabilité** | Un audit lancé aboutit toujours (rapport ou message d'échec clair) ; aucun bouton bloqué sans explication |
| **Vérité** | Chaque chiffre affiché vient d'une mesure réelle ou d'une source citée ; aucune progression simulée |
| **Langue** | 0 texte en dur dans l'interface : AR (RTL), EN, FR complets sur toutes les pages |
| **Cohérence** | Aucune fonction « Bientôt » à côté de la même fonction déjà disponible |
| **Exemplarité** | Le site VELIFA lui-même obtient ≥ 90 en performance et en accessibilité (Lighthouse mobile) : un outil de performance lent n'est pas crédible |
| **Retenue visuelle** | L'or reste un accent (titres clés, état actif, score) ; le fond, la typographie et l'espace portent le luxe |

---

## 2. Constats dans le code (2026-11-17)

### Corrigés le 2026-11-17

| Réf. | Constat | Correction |
|---|---|---|
| P1 | Accueil : bouton « Analyser » grisé en permanence pour un visiteur anonyme si le widget Turnstile échoue (ex. domaine Vercel non autorisé pour la clé) ; connecté, le CAPTCHA n'est pas demandé → impression qu'un compte est obligatoire (`useCaptcha.tsx`, `page.tsx`) | État `pending` / `failed` exposé ; message et bouton « Réessayer » ; libellé « Vérification anti-robot… » pendant l'attente |
| P2 | Suivi en direct cassé : le backend envoie des événements SSE **nommés** `analysis-update` (`analyses.controller.ts`), le frontend n'écoutait que `onmessage` → aucune mise à jour en direct ; si l'audit finissait avant l'ouverture du flux, la page attendait indéfiniment (`useAnalysisStatus.ts`) | `addEventListener('analysis-update')` + interrogation périodique permanente en filet de sécurité |
| P3 | Écran d'attente générique, étapes fictives (« Étape 3 » jamais atteinte : le worker n'envoyait que `processing`) | Le worker envoie ses **étapes réelles** (`performance`, `inspection`, `report`) ; écran plein écran (domaine audité, chrono, étapes réelles, contrôles réellement faits) |

### À corriger

| Réf. | Constat | Fichier |
|---|---|---|
| P4 | **Redis absent en production** (base Upstash supprimée, journal 1.12) : la file BullMQ ne tourne pas → un audit reste « en attente » | `REDIS_URL` sur Render |
| P5 | Bouton PDF désactivé « Bientôt » alors que `PdfDownloadButton` (2.4, vérifié) est sur la même page | `components/report/ReportProFeatures.tsx:447-470` |
| P6 | Textes français en dur (visibles en AR/EN) : « Évolution du score de performance », « Lancez plus d'audits… », libellés de score | `app/[locale]/dashboard/page.tsx:66, 259, 278` |
| P7 | Idem dans le rapport Pro : « Core Web Vitals & Métriques », « Opportunités d'optimisation » | `components/report/ReportProFeatures.tsx:196, 233` |
| P8 | Message d'erreur d'analyse renvoyé par l'API en français uniquement (« Limite quotidienne atteinte… ») | `backend/src/analyses/analyses.service.ts:84` |
| P9 | Même risque de bouton grisé sans explication (CAPTCHA) dans le formulaire « Je veux corriger » et la fenêtre « Nouvel audit » | `components/report/LeadForm.tsx:99`, `components/audit/NewAuditModal.tsx:300` |

---

## 3. Chantiers

Ordre imposé par les dépendances : **fiabilité → vérité/langue → expérience → fonctions premium**.

### Lot 1 — Fiabilité (sans cela rien d'autre ne compte)

| ID | Chantier | Critère d'acceptation |
|---|---|---|
| H1.1 | Redis de production (P4) | `/api/v1/health` → 200 sur Render ; un audit réel de bout en bout depuis le site Vercel |
| H1.2 | Domaine Vercel autorisé dans Cloudflare Turnstile (P1) | Visiteur anonyme : widget validé, audit lancé sans compte |
| H1.3 | Message d'échec CAPTCHA aussi dans `LeadForm` et `NewAuditModal` (P9) | Build + revue des 3 langues |
| H1.4 | Messages d'erreur API traduits (P8) : code d'erreur renvoyé, texte choisi côté frontend | Tests unitaires backend + revue frontend |

### Lot 2 — Vérité et langue

| ID | Chantier | Critère d'acceptation |
|---|---|---|
| H2.1 | Retirer le faux bouton PDF « Bientôt » (P5) | Une seule entrée PDF dans le rapport |
| H2.2 | Extraire tous les textes en dur (P6, P7, et recherche systématique) | Recherche des caractères accentués hors commentaires = 0 dans `src/app` et `src/components` ; revue AR RTL |
| H2.3 | Vérification automatique des clés de traduction (mêmes clés dans `ar/en/fr.json`) | Test qui échoue si une clé manque dans une langue |

### Lot 3 — Expérience premium

| ID | Chantier | Critère d'acceptation |
|---|---|---|
| H3.1 | Écran d'audit plein écran avec étapes réelles | ✅ fait le 2026-11-17 (voir constats P2, P3) |
| H3.2 | Rapport : ouverture par un **résumé exécutif** (score, 3 priorités, impact estimé, capture du site) avant le détail technique — tout existe déjà en base (`recommendations`, `screenshotUrl`, impact 1.6) | Revue sur un audit réel, 3 langues |
| H3.3 | Hiérarchie visuelle : l'or réservé aux accents (score, état actif, CTA principal) ; fonds, typographie, espacements unifiés via `velifa-design-system.css` (aucune couleur en dur dans les pages) | Recherche `rgba(212,175,55` hors design system = 0 |
| H3.4 | Exemplarité : Lighthouse mobile du site VELIFA (accueil, rapport) | ≥ 90 performance et accessibilité, résultat consigné dans le Journal |
| H3.5 | États vides, chargements et erreurs soignés sur tableau de bord, audits, réglages (squelettes, messages utiles) | Revue page par page |

### Lot 4 — Fonctions pour clients exigeants (proposition)

Chaque fonction s'appuie sur des données déjà collectées ; à valider avant de coder.

| ID | Chantier | Données existantes utilisées | Pour qui |
|---|---|---|---|
| H4.1 | Historique par site suivi : courbe du score + Core Web Vitals, marqueurs d'alerte | Audits programmés (2.3), sites suivis (2.2) | Agences (B), Salla/Zid (C) |
| H4.2 | Comparaison avant/après partageable en un lien, intégrée au PDF | Comparaison (1.9), PDF (2.4) | Offre A (preuve du résultat vendu) |
| H4.3 | Portefeuille agence : vue de tous les sites clients, tri par score / baisse récente | Espaces agence (2.1), sites suivis | Agences (B) |
| H4.4 | Rapport PDF mensuel automatique à la marque de l'agence, envoyé à son client | PDF marque blanche (2.4), audits programmés (2.3), Brevo | Agences (B) |
| H4.5 | Données terrain (CrUX) mises en avant face aux mesures de laboratoire, avec explication | `fieldData` (1.4) | Tous |

---

## 4. Ce que ce document ne fait pas

- Il ne change pas les prix ni les plans (voir `docs/commercial/grille-prix.md`, validation 2.7).
- Il n'ajoute aucune promesse de conformité PDPL (indicateurs seulement, validation juridique 4.4).
- Il ne remplace pas `ROADMAP.md` : chaque chantier validé y est reporté avec sa preuve dans le Journal.
