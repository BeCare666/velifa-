# VELIFA — Roadmap

> Document de pilotage. Il décrit **ce qu'il faut construire** pour transformer VELIFA en solution vendable,
> **dans quel ordre**, et **comment on vérifie** que c'est fait. Il est mis à jour à chaque étape.
>
> Règle : rien n'est coché sans preuve (test, build ou vérification décrite dans le Journal).

## Légende

| Symbole | Signification |
|---|---|
| ✅ | Fait et vérifié (preuve dans le Journal) |
| 🔄 | En cours |
| ⬜ | À faire |
| 🔒 | Bloqué : nécessite une action de votre part (compte, clé, accord, validation juridique) |
| ⚠️ | Fait partiellement / limite connue (expliquée) |

---

## 0. Vision et positionnement

**Problème réel visé** : une boutique en ligne lente ou mal configurée perd des ventes, mais le propriétaire
ne sait ni le mesurer ni quoi corriger. Les outils gratuits (PageSpeed Insights, GTmetrix) donnent un score
technique, en anglais, sans plan d'action ni suivi.

**Proposition VELIFA** : mesurer, expliquer (en arabe et en anglais), suivre dans le temps, et aider à corriger,
avec des contrôles que les outils occidentaux ne font pas (plateformes Salla/Zid, version arabe/RTL, traceurs
avant consentement).

**Marché** : Golfe en priorité (Arabie saoudite, Émirats, Qatar). Le produit reste utilisable partout
(interface FR/EN/AR, prix en USD).

### Les trois offres

| Offre | Pour qui | Ce qu'on vend | Rôle |
|---|---|---|---|
| **A — Audit + correction** | Boutiques e-commerce qui ont déjà du chiffre | Un résultat mesuré (avant/après), vendu via WhatsApp | Cash rapide + apprentissage |
| **B — Outil agences (marque blanche)** | Agences web/marketing, tous pays | Rapports PDF AR/EN à leur marque, widget de capture de prospects, suivi et alertes | Revenu récurrent (SaaS) |
| **C — Apps marketplaces** | Marchands Salla, Zid (puis Shopify) | Surveillance + recommandations en arabe, installables en un clic | Distribution à grande échelle |

### Ce qu'on ne fait pas

- Vendre un score que Google donne gratuitement (abonnement 9 € actuel).
- Afficher ou facturer une fonctionnalité qui n'existe pas côté serveur.
- Promettre une « conformité PDPL » : on fournit des **indicateurs**, pas une certification.

---

## 1. État initial (audit du 2026-10-08)

Constaté dans le code avant toute modification (commit `1d7d7d2`) :

| Réf. | Constat | Gravité |
|---|---|---|
| S1 | Clé admin codée en dur (`velifa_admin_internal_2026`) + exposée au navigateur via `NEXT_PUBLIC_ADMIN_API_KEY` | Critique |
| S2 | SSRF : `10.x`, `172.20.x`, `localtest.me`, `[::ffff:7f00:1]` acceptés (testé) | Critique |
| S3 | CAPTCHA : le frontend envoie `dev-bypass`, le backend attend `dev-bypass-token` → en prod soit tout échoue, soit protection inactive | Haute |
| S4 | `POST /analyses/:id/send-email` sans auth ni limite → relais de spam | Haute |
| S5 | `GET /analyses/:id` public renvoie email + IP masquée ; cache 24 h partagé entre utilisateurs | Haute |
| S6 | Route `/api/v1/health` absente alors que `render.yaml` l'utilise | Moyenne |
| S7 | `npm ci` frontend échoue : `next@14.2.3` incompatible avec `@clerk/nextjs@7` | Haute |
| S8 | Middleware : la page rapport `/analyse/[id]` exige une connexion → un prospect ne peut pas ouvrir son rapport | Haute (bloque l'offre A) |
| F1 | Fonctions Business factices : clé API, multi-sites, alertes en `localStorage` ; PDF absent ; aucun audit programmé | Haute (risque commercial) |
| F2 | Emails, message WhatsApp et formulaire forcés en français | Haute (bloque le Golfe) |
| F3 | Schéma Prisma désynchronisé ; tables créées par `ALTER` au démarrage | Moyenne |
| F4 | Données terrain (CrUX `loadingExperience`) renvoyées par Google mais ignorées | Moyenne |
| F5 | Aucun test automatisé, Jest non configuré | Moyenne |

---

## Phase 0 — Fondations : sécurité, build, honnêteté du produit

**Objectif** : une base déployable, sûre, qui ne promet que ce qu'elle fait. Pré-requis pour A, B et C.

| ID | Tâche | Critère d'acceptation | Statut |
|---|---|---|---|
| 0.1 | Initialiser git + commit de référence | `git log` montre le commit initial | ✅ |
| 0.2 | Configurer Jest côté backend | `npm test` s'exécute | ✅ |
| 0.3 | **S1** Supprimer la clé admin par défaut ; accès admin uniquement via Clerk + email admin ; clé interne optionnelle côté serveur seulement ; exports CSV via requête authentifiée | Aucune occurrence de la clé dans le code ; test : requête avec l'ancienne clé → 401/403 | ✅ |
| 0.4 | **S2** Protection SSRF : résolution DNS + blocage des plages privées/réservées (IPv4/IPv6), appliquée aussi aux redirections | Tests unitaires : toutes les URL internes du test initial bloquées, `https://example.com` acceptée | ✅ |
| 0.5 | **S3** CAPTCHA cohérent : widget Turnstile réel si clé configurée ; contournement seulement hors production sans clé ; échec fermé en production | Tests unitaires des 4 cas (dev sans clé, prod sans clé, jeton invalide, jeton valide simulé) | ✅ |
| 0.6 | **S4** Envoi d'email : limite stricte + interdiction d'envoyer le rapport d'un autre utilisateur | Tests unitaires | ✅ |
| 0.7 | **S5** Réponse publique d'une analyse sans données personnelles (email, IP, user-agent) | Test unitaire sur la fonction de sérialisation | ✅ |
| 0.8 | **S6** Route `GET /api/v1/health` (BDD + Redis) | Test unitaire du contrôleur | ✅ |
| 0.9 | **S7** Résoudre le conflit Next/Clerk (montée de version de Next compatible) | `npm ci` sans `--legacy-peer-deps` + `next build` OK | ✅ |
| 0.10 | **S8** Rendre publiques les pages rapport et chargement | Route matcher mis à jour ; build OK | ✅ |
| 0.11 | **F1** Retirer/étiqueter « Bientôt » les fonctions factices ; aligner la page tarifs sur ce qui existe | Aucune promesse tarifaire sans implémentation serveur | ✅ |
| 0.12 | **F2** Langue de l'utilisateur transmise à l'audit ; email + message WhatsApp en AR/EN/FR | Tests unitaires des gabarits (3 langues, `dir="rtl"` en arabe) | ✅ |
| 0.13 | `.env.example` complets et documentés (backend + frontend) | Toutes les variables lues par le code sont listées | ✅ |
| 0.14 | Résiliation : accès conservé jusqu'à la fin de la période payée (`subscription_cancelled` ≠ `subscription_expired`) | Tests `entitlements.spec.ts` | ✅ |
| 0.15 | Page rapport `/analyse/[id]` entièrement traduite (aujourd'hui textes FR en dur) | Build + revue des 3 langues | ✅ (via 1.5) |

---

## Phase 1 — Offre A : moteur de prospection + rapport qui convainc

**Objectif** : auditer des centaines de boutiques du Golfe et envoyer à chaque propriétaire un rapport
compréhensible en arabe, avec un argument chiffré et un contact WhatsApp.

| ID | Tâche | Critère d'acceptation | Statut |
|---|---|---|---|
| 1.1 | Détection plateformes : Salla, Zid, WooCommerce, Magento, BigCommerce (signatures vérifiées sur de vrais sites) | Tests unitaires avec des extraits HTML réels | ✅ |
| 1.2 | Contrôles arabe/bilingue : `lang`, `dir`, `hreflang`, liens de version alternative | Tests unitaires | ✅ |
| 1.3 | Indicateurs confidentialité : traceurs présents dans le HTML initial, présence d'un outil de consentement connu, lien politique de confidentialité | Tests unitaires ; libellé « indicateur, pas un avis juridique » | ✅ (libellés : 1.5) |
| 1.4 | Données terrain CrUX (vrais visiteurs) extraites de la réponse PageSpeed et stockées | Test unitaire du parseur | ✅ |
| 1.5 | Recommandations priorisées et traduites (AR/EN/FR) à partir des audits Lighthouse | Tests unitaires | ✅ |
| 1.6 | Estimation d'impact business (référence Deloitte/Google, présentée comme corrélation) | Texte sourcé dans le rapport | ✅ |
| 1.7 | Audit en lot (admin) : import CSV d'URL → file d'attente à débit limité → table `prospects` | Test unitaire du parseur CSV + du service | ✅ |
| 1.8 | Export prospects (CSV) avec lien WhatsApp pré-rempli en arabe par prospect | Test unitaire | ✅ |
| 1.9 | Comparaison avant/après de deux audits d'une même URL | Test unitaire + page rapport | ✅ |
| 1.10 | Capture de contact sur le rapport (« Je veux corriger ») → table `leads` + notification admin | Test unitaire | ✅ |
| 1.11 | Migrations SQL versionnées remplaçant les `ALTER` au démarrage (**F3**) | Script de migration idempotent | ✅ |
| 1.12 | 🔒 Clés de production (PageSpeed, Browserless, Brevo, Clerk, TiDB, Redis, Turnstile) et déploiement | Vous fournissez les clés | 🔒 |

---

## Phase 2 — Offre B : SaaS agences (marque blanche)

**Objectif** : un abonnement récurrent pour agences, vendable dans tous les pays.
Repère de prix vérifié : SEOptimer marque blanche ≈ 39–59 $/mois.

| ID | Tâche | Critère d'acceptation | Statut |
|---|---|---|---|
| 2.1 | Modèle `workspaces` (agence) : nom, logo, couleur, langue par défaut, membres | Migration + tests service | ✅ |
| 2.2 | Sites suivis en base (remplace `localStorage`), limites par plan appliquées côté serveur | Tests | ✅ (limites chiffrées : hypothèse à valider) |
| 2.3 | Audits programmés (BullMQ répétable) + alertes email en cas de baisse sous un seuil | Tests du planificateur et de la règle d'alerte | ✅ |
| 2.4 | Rapport PDF à la marque de l'agence, AR/EN (rendu HTML → PDF via Browserless) | Test du gabarit HTML ; PDF généré en environnement configuré | ⚠️ gabarit ✅, Browserless réel → 1.12 |
| 2.5 | Widget d'audit intégrable (script) sur le site de l'agence → prospect enregistré pour l'agence | Test du endpoint public + domaine autorisé | ✅ |
| 2.6 | Vraies clés API (hachées en base) + API publique v1 (créer/consulter un audit) | Tests auth par clé | ✅ |
| 2.7 | Plans et prix en USD (Lemon Squeezy), limites appliquées côté serveur | Tests des limites | ⬜ |
| 2.8 | 🔒 Créer les produits/variantes Lemon Squeezy en USD ; vérifier versement vers votre pays | Action de votre part | 🔒 |
| 2.9 | Préférences de notification enregistrées côté serveur et respectées par le worker (section retirée en 0.11 car sans effet) | Tests | ⬜ |

---

## Phase 3 — Offre C : applications marketplaces

**Objectif** : distribution directe auprès des marchands.

| ID | Tâche | Critère d'acceptation | Statut |
|---|---|---|---|
| 3.1 | 🔒 Compte partenaire Salla + accord ; compte partenaire Zid + accord | Action de votre part | 🔒 |
| 3.2 | App Salla : OAuth, webhooks d'installation/désinstallation, création automatique du site suivi | Tests avec charges utiles de la doc Salla ; test réel sur boutique de démo | ⬜ |
| 3.3 | App Zid : même périmètre | Idem | ⬜ |
| 3.4 | Tableau de bord intégré marchand (AR d'abord) | Build + revue | ⬜ |
| 3.5 | Shopify App (marché mondial) | Après validation des apps Salla/Zid | ⬜ |

---

## Phase 4 — Commercial (hors code)

| ID | Tâche | Responsable | Statut |
|---|---|---|---|
| 4.1 | Scripts de prospection WhatsApp AR/EN + objections | Claude (rédaction) | ⬜ |
| 4.2 | Grille de prix à tester (3 niveaux, SAR/AED/QAR/USD), marquée « hypothèse » | Claude (proposition) / vous (validation) | ⬜ |
| 4.3 | Liste de 200 boutiques cibles du Golfe | Vous (ou outil d'annuaire) | 🔒 |
| 4.4 | Validation juridique des indicateurs PDPL et des mentions légales | Juriste local | 🔒 |
| 4.5 | Points de décision : 5 clients A payants ; 2 agences prêtes à payer B | Vous | ⬜ |

---

## Actions requises de votre part (récapitulatif)

1. Clés de service de production (Phase 1.12).
2. Produits Lemon Squeezy en USD + vérification des versements (2.8).
   Valider le nombre de sites suivis par plan (2.2, actuellement hypothèse `free:1, pro:5, business:30`, réglable par `PLAN_SITE_LIMITS`)
   et le plafond quotidien du widget agence (2.5, hypothèse 50 audits/jour/agence, `WIDGET_DAILY_LIMIT`)
   et de l'API (2.6, hypothèse 200 audits/jour/compte, `API_DAILY_LIMIT`).
3. Comptes partenaires Salla et Zid (3.1).
4. Liste de cibles et prospection (4.3), validation juridique (4.4).

---

## Journal

Chaque entrée : date, tâche, ce qui a été fait, **preuve** (commande + résultat).

### 2026-10-08 — Audit initial
- Installation backend : OK. Compilation backend (`tsc`, `nest build`) : OK.
- Installation frontend `npm ci` : **échec** (S7) ; installée avec `--legacy-peer-deps` pour l'analyse ; `tsc --noEmit` : OK.
- Test SSRF (script) : 5 URL internes acceptées sur 8 (S2).
- 0.1 ✅ `git init` + commit de référence.

### 2026-10-08 — Secrets trouvés dans le projet (action requise)
- `backend/env` et `frontend/env.local` (sans point initial, donc non ignorés par `.gitignore`) contiennent de
  **vraies clés** : TiDB, Redis, PageSpeed, Browserless, Cloudinary, Clerk (`sk_test_…`), Lemon Squeezy, Brevo, Turnstile.
- Fait : ajoutés au `.gitignore`, retirés du commit de référence, historique local purgé
  (`git log --all -p | Select-String 'sk_test_7juc'` → 0 résultat). Les fichiers restent sur le disque.
- ⚠️ Ces noms de fichiers ne sont **pas lus** par NestJS/Next.js (qui lisent `.env` / `.env.local`).
- 🔒 **Recommandé** : si ces fichiers ont déjà été partagés ou poussés sur GitHub, régénérer toutes ces clés.
- ⚠️ `backend/env` contient `NODE_TLS_REJECT_UNAUTHORIZED=0` : désactive la vérification TLS de **toutes**
  les connexions sortantes. À supprimer. Le pool MySQL a aussi `ssl.rejectUnauthorized: false`
  (`database.service.ts`) : à passer à `true` **après test** sur votre base TiDB (non testé, pas d'accès BDD).
- ⚠️ `ADMIN_API_KEY` y fait 26 caractères : désormais **désactivée** (minimum 32). Accès admin via Clerk.

### 2026-10-08 — Phase 0 backend (commit `b0af393`)
- 0.2 ✅ Jest configuré (`package.json`, ts-jest) + `@types/jest`.
- 0.3 ✅ `admin/admin-auth.ts` : plus de valeur par défaut, comparaison à temps constant, emails **vérifiés** Clerk,
  exports CSV par `fetch` + jeton (frontend `lib/api.ts`). Tests : `admin-auth.spec.ts` (ancienne clé → 401).
- 0.4 ✅ `url.validator.ts` : `BlockList` IPv4/IPv6, IPv6 mappées, DNS (`assertPublicHost`), `safeLookup`
  sur les agents HTTP du détecteur (couvre les redirections). Tests : `url.validator.spec.ts`.
  Bug corrigé au passage : l'ancienne normalisation mettait le **chemin** en minuscules (mauvaise page auditée).
- 0.5 ✅ `common/security/turnstile.ts` (9 cas testés). CAPTCHA exigé pour les anonymes uniquement.
  Frontend : `hooks/useCaptcha.tsx` (widget réel si `NEXT_PUBLIC_TURNSTILE_SITE_KEY`).
  Bug corrigé : « Relancer » dans *Mes audits* envoyait un jeton vide → toujours 400.
- 0.6 ✅ `analyses/analysis-access.ts` `checkEmailSend` + `@Throttle` 3/h. Rapport anonyme → une seule adresse (capturée).
- 0.7 ✅ `toPublicAnalysis` ; cache 24 h restreint au même propriétaire (`clerk_user_id <=> ?`).
- 0.8 ✅ `health/health.controller.ts` (BDD + Redis, 503 si dégradé).
- Bonus : « Vider le cache » admin faisait `flushdb` (supprimait les audits en attente) → remplacé par `queue.clean` des tâches terminées/échouées.
- Preuve : `npx jest` → **5 suites, 75 tests réussis** ; `npx tsc --noEmit` → exit 0.

### 2026-10-08 — Phase 0 terminée
- 0.9 ✅ `next` 14.2.3 → **15.5.26** (compatible `@clerk/nextjs@7` ; version choisie ≥ 2 semaines d'ancienneté).
  `npm install` **sans** `--legacy-peer-deps` → OK. Page rapport migrée vers `params` asynchrone (Next 15).
  Bug de build préexistant corrigé : `className` multi-lignes dans `settings/page.tsx` (chaîne non terminée après styled-jsx).
- 0.10 ✅ `middleware.ts` inversé : seules `dashboard`, `audits`, `billing`, `settings` exigent une connexion
  (avec ou sans préfixe de langue). Avant, `/tarifs` ou `/analyse/:id` sans préfixe renvoyaient vers la connexion.
- 0.11 ✅ Tableau de bord : sections multi-sites / alertes / clé API (localStorage) remplacées par un encart « Bientôt ».
  Tarifs FR/EN/AR : fonctions Business inexistantes marquées « Bientôt ». Textes corrigés : « rapport PDF par email »
  (faux, c'est du HTML), « FID » (remplacé par INP chez Google en 2024 ; l'outil mesure TBT),
  « centaines de sites optimisés » (invérifiable), FAQ support. Préférences de notification sans effet retirées (→ 2.9).
  Bouton admin « email de test » : utilisait un audit client et une adresse codés en dur → route `/admin/test-email`.
- 0.12 ✅ `i18n/report-texts.ts` + `brevo/report-email.template.ts` : email et WhatsApp FR/EN/AR, `dir="rtl"`,
  lien de rapport préfixé par la langue, URL du site échappée (injection HTML possible avant), liens non http(s) refusés.
  Bloc réseaux sociaux retiré de l'email (comptes non vérifiés).
- 0.13 ✅ `.env.example` backend et frontend réécrits (toutes les variables lues par le code, avertissements secrets/TLS).
  `useCaptcha` ignore une clé d'exemple non conforme.
- 0.14 ✅ `payments/entitlements.ts` : `subscription_cancelled` garde l'accès, `subscription_expired` le retire ;
  `GET /payments/me` renvoie `has_access` utilisé par le frontend.
- Preuves : backend `npx jest` → **7 suites, 97 tests réussis**, `tsc` exit 0 ;
  frontend `tsc --noEmit` exit 0, **`next build` exit 0** (Next 15.5.26, toutes les routes générées).
- Limite : aucun test de bout en bout (pas de BDD/Redis locaux ; vos clés réelles ne sont pas utilisées sans votre accord).

### 2026-10-08 — Phase 1 : détection, contrôles Golfe, données terrain
- 1.1 ✅ Signatures vérifiées sur **27 boutiques réelles** (classements StoreLeads SA/AE) via le service compilé :
  Salla 5/5, Zid 5/5, WooCommerce 4/4, Magento 3/3, BigCommerce 5/5, Shopify 5/5 → **27/27**.
  - Magento « headless » (nahdionline.com, alsaifgallery.com : façade Next.js) non détectable depuis le HTML → attendu, Next.js affiché.
  - Faux positif corrigé : boutique Salla réelle (3saf.com) hébergeant des images sur `cdn.shopify.com` → une seule plateforme retenue (priorité).
  - **Bug corrigé** : l'ancien détecteur échouait sur toute page > 500 Ko (`maxContentLength`) ; 2 boutiques Zid sur 5
    pèsent 2,1 Mo et 11 Mo. Lecture en flux limitée à 1,5 Mo désormais.
  - Pixels du Golfe ajoutés : Snapchat, TikTok, Meta. Signatures trop larges retirées (`/wordpress/i`, `G-[A-Z0-9]{10}`, `wix\.com`).
- 1.2 / 1.3 ✅ `site-checks/site-checks.ts` : langue, RTL (attribut, classe, `rtl.css`), hreflang, liens de langue,
  traceurs, outils de consentement connus (Cookiebot, OneTrust, CookieYes, Didomi, Usercentrics…), lien de politique.
  Vérifié sur 10 boutiques Salla/Zid réelles ; 3 faux positifs trouvés et corrigés :
  page anti-robot 403 (2 boutiques), RTL par classe sur `<body>` (dkhoonemirates.com), page tronquée (lien en pied de page).
  Constat : 7 boutiques sur 8 accessibles chargent des traceurs sans outil de consentement reconnu dans le HTML initial.
- 1.4 ✅ Appel réel PageSpeed (amazon.sa, clé du projet, 1 requête) : structure CrUX confirmée (`percentile`, `category`,
  CLS × 100, repli `originLoadingExperience`). **Bug majeur trouvé** : Lighthouse 13.5 a supprimé
  `uses-optimized-images` et `render-blocking-resources` → la section « Opportunités » des rapports était **toujours vide**.
  `pagespeed/lighthouse-parse.ts` lit `image-delivery-insight` / `render-blocking-insight` (repli sur les anciens).
  Échantillon réel réduit enregistré : `pagespeed/__fixtures__/psi-amazon-sa-mobile.json`.
- 1.5 (calcul) ✅ `parseRecommendations` : audits actionnables uniquement, triés par impact et gain estimé, 8 max.
- Base : colonnes `platform`, `field_data`, `recommendations`, `site_checks` (ALTER au démarrage, comme l'existant ; → 1.11).
- Preuves : `npx jest` → **10 suites, 142 tests réussis** ; `tsc` exit 0 ; scripts de vérification réelle (27/27, 10/10).

### 2026-10-08 — 1.5 affichage traduit (+ 0.15) et 1.6 impact business
- 1.5 ✅ Page rapport `/analyse/[id]` entièrement traduite (espace `reportPage`, FR/EN/AR, 228 clés chacune) :
  données terrain CrUX, recommandations priorisées (titre + « comment corriger » pour les 24 identifiants),
  conseils adaptés aux plateformes hébergées (Salla, Zid, Shopify, BigCommerce), contrôles Golfe, mesures labo.
  - Backend : doublons supprimés (`layout-shifts`/`cls-culprits-insight` affichaient deux fois le même problème) ;
    impact basé sur le gain mesuré (avant : 8 recommandations sur 8 « fort » sur la réponse réelle amazon.sa).
  - `<html lang dir>` rendu par langue (`[locale]/layout.tsx`, polices dans `app/fonts.ts`, layout `(auth)` pour Clerk) :
    la page arabe est réellement en RTL ; en-tête/pied du site vitrine masqués dans le rapport (`appSections.ts`).
  - Corrigé à la revue : « : » codé en dur (« Overall assessment : » en anglais) → ponctuation dans les traductions ;
    infobulle « Disponible prochainement » en dur dans `ReportProFeatures` → traduite.
  - Constat hors périmètre : clés `audits.scoreExcellent/Improve/Critical` absentes en EN mais utilisées nulle part.
- 0.15 ✅ couverte par 1.5.
- 1.6 ✅ Bloc « Pourquoi la vitesse compte » : étude « Milliseconds Make Millions » (Deloitte/55, commandée par Google,
  37 marques, 0,1 s sur mobile → +8,4 % de conversions en commerce de détail), présentée comme une **corrélation**
  et non une garantie, lien vers la source. Chiffres vérifiés sur web.dev/case-studies/milliseconds-make-millions.
- Preuves :
  - backend `npx jest` → **10 suites, 144 tests réussis** ;
  - script de cohérence i18n : 0 clé `reportPage` manquante, mêmes paramètres `{…}` dans les 3 langues,
    traduction présente pour les 24 identifiants de recommandation et les 7 codes de contrôle ;
  - frontend `tsc --noEmit` sans erreur dans `src/`, **`next build` exit 0** (72 pages) ;
  - rendu réel (`next start` + API simulée servant les parseurs backend appliqués à la fixture PageSpeed réelle) :
    `/fr|en|ar/analyse/demo` → 200, `<html dir="rtl">` en arabe, aucune clé brute ni identifiant technique affiché ;
    variante sans données terrain → message « pas assez de visites réelles » dans les 3 langues.

### 2026-10-08 — 1.7 Audit en lot (admin)
- `prospects/prospect-csv.ts` : en-têtes FR/EN/AR (ordre libre) ou sans en-tête (url, nom, téléphone, pays),
  séparateur `,` `;` (Excel FR) ou tabulation, guillemets RFC 4180, BOM, 500 lignes max, doublons détectés.
  URL sans schéma → `https://` puis `validateUrl` (mêmes règles anti-SSRF que l'audit public).
  Téléphones → format international wa.me : `+`/`00`, « 0 » national pour SA/AE, numéros à 8 chiffres pour QA/KW/BH/OM ;
  numéro local sans pays → refusé (ligne gardée sans téléphone, signalée) plutôt que deviné.
- `prospects/prospects.service.ts` : boutiques déjà importées ignorées (`url_hash` unique), contrôle DNS
  `assertPublicHost` (10 en parallèle), un audit `source='prospect'` **sans email** par boutique, ligne `prospects` liée.
  **Débit limité** : audits espacés par `delay` Bull (`PROSPECT_AUDIT_INTERVAL_MS`, 30 s par défaut, min 5 s) ;
  un nouvel import se place après les audits de prospects encore programmés. Les audits clients ne sont jamais
  bloqués derrière un lot (une seule tâche de prospect prête à la fois).
- Routes : `POST /admin/prospects/import` (`{ csv, locale }`), `GET /admin/prospects?batch=&page=&limit=` (Clerk admin).
- Table `prospects` créée au démarrage (comme l'existant → 1.11). Page admin `/admin/prospects` (import fichier ou
  collage, langue des rapports, résultat ligne par ligne, liste avec statut, score, plateforme, points Golfe, lien rapport).
- Preuves :
  - `npx jest` → **12 suites, 174 tests réussis** (+30 : parseur 21, service 9) ; `tsc` exit 0 ; `next build` exit 0 ;
  - Bull 4.16.5 vérifié dans `node_modules` : `job.timestamp` + `opts.delay` = heure d'exécution utilisée ;
  - API réelle démarrée (`node dist/main`, sans vraies clés) : sans jeton / mauvaise clé → 401 ; csv absent,
    langue `de`, champ inconnu, en-tête sans URL → 400 avec message explicite.
- ⚠️ Limite : requêtes SQL et file Redis non exécutées sur une vraie base (pas de MySQL/Redis/Docker en local) ;
  à vérifier au premier import en environnement configuré (1.12).

### 2026-10-08 — 1.8 Export prospects avec lien WhatsApp
- `prospects/prospect-export.ts` : message de premier contact dans la langue de l'import (arabe par défaut) :
  nom du prospect, site, score **mesuré** (« قياس Google Lighthouse »), lien du rapport gratuit, et une phrase
  permettant de refuser les messages. Lien `wa.me/<numéro du prospect>?text=…` uniquement pour les audits terminés ;
  vide sans téléphone ou si l'audit n'est pas terminé (aucun message avec un score inexistant).
- CSV : BOM UTF-8 (arabe lisible dans Excel), colonnes url, nom, téléphone, pays, langue, statut, score, plateforme,
  codes des points Golfe, lien rapport, lien WhatsApp, date. **Protection contre l'injection de formules** :
  cellules commençant par `= + - @` préfixées (noms issus de fichiers externes), nombres purs intacts.
- Route `GET /admin/prospects/export?batch=` (5000 lignes max) ; bouton « Exporter CSV » sur `/admin/prospects`.
- Preuves : `npx jest` → **13 suites, 190 tests réussis** (+16) — dont décodage du lien `wa.me` identique au message
  d'origine et relecture du CSV produit par le parseur ; `tsc` exit 0 ; `next build` exit 0 ;
  API réelle : `/admin/prospects/export` sans jeton → 401 ; avec clé admin → 500 (pas de base locale, attendu).

### 2026-10-08 — 1.9 Comparaison avant/après
- `analyses/compare.ts` : scores (4), mesures labo (LCP, CLS, TBT, FCP), données terrain CrUX (LCP, INP, CLS),
  recommandations et points Golfe (« n'apparaissent plus » / nouveaux / toujours présents). Le plus ancien = « avant ».
  - **Honnêteté de mesure** : une variation Lighthouse n'est pas une amélioration. Seuils retenus : < 5 points de score,
    ou < max(seuil absolu, 10 %) sur une mesure (LCP/FCP/TTFB 100 ms, TBT 50 ms, INP 25 ms, CLS 0,01) → « stable ».
  - Pas de « corrigé » trompeur : si un audit a une page bloquée ou pas de contrôles/recommandations (audit ancien),
    la comparaison de ces listes est `null` (« comparaison impossible ») au lieu de tout marquer comme résolu.
  - Libellé prudent « n'apparaissent plus » (la liste est limitée aux 8 recommandations principales).
- `GET /analyses/:id/compare/:otherId` : deux audits terminés de la **même URL** (sinon 400), aucun champ personnel.
  Accès par identifiants d'audit, comme le rapport public.
- Page `/[locale]/analyse/[id]/compare/[otherId]` (FR/EN/AR, espace `comparePage`) avec note sur la variabilité
  et sur la moyenne glissante de 28 jours des données terrain. Bouton « Comparer » dans *Mes audits* quand la même URL
  a un audit plus ancien.
- Preuves : `npx jest` → **14 suites, 204 tests réussis** (+14) ; `tsc` exit 0 ; `next build` exit 0 ;
  rendu réel (`next start` + API simulée appelant `compareAnalyses` sur la fixture PageSpeed réelle) :
  `/fr|en|ar/analyse/after/compare/demo` → 200, `dir="rtl"` en arabe, aucune clé brute ; URL différente → message d'erreur.

### 2026-10-09 — 1.10 « Je veux corriger » (leads)
- `POST /analyses/:id/lead` : rapport terminé uniquement ; nom, email et/ou WhatsApp, message ; au moins un contact.
  WhatsApp **international obligatoire** (+/00) : un numéro local sans pays n'est pas deviné (erreur explicite).
  CAPTCHA Turnstile pour les anonymes (fermé en production sans clé), **5 demandes/h/IP**, IP masquée comme pour les audits.
  Même contact sur le même rapport en 24 h → pas de doublon. Échec de la notification → la demande reste enregistrée.
- Table `leads` (au démarrage → 1.11) ; notification admin de type `lead` ; page admin `/admin/leads`
  (contact cliquable email / WhatsApp, score, plateforme, lien rapport).
- Rapport : bloc « Vous voulez corriger ces points ? » (FR/EN/AR) avec indicatif pays (Golfe d'abord, 0 national retiré)
  et mention « coordonnées utilisées uniquement pour vous recontacter au sujet de ce rapport ».
- Preuves :
  - `npx jest` → **15 suites, 214 tests réussis** (+10) ; `tsc` exit 0 ; `next build` exit 0 (78 pages) ;
  - API réelle (`NODE_ENV=production`, sans clés) : email invalide, champ inconnu, message > 1000 → 400 ;
    anonyme sans CAPTCHA configuré → 503 (échec fermé) ; 6ᵉ requête dans l'heure → 429 ;
  - rendu du rapport FR/EN/AR : bloc et bouton traduits ; conversion du numéro testée sur le code du composant (6/6).
- ⚠️ Limite : envoi du formulaire non testé au clic dans un navigateur (extension Chrome non connectée) ;
  SQL non exécuté sur une vraie base (comme 1.7).

### 2026-10-09 — 1.11 Migrations SQL versionnées (F3)
- `backend/migrations/001_baseline.sql` : schéma complet (analyses, users, admin_notifications, prospects, leads),
  uniquement des instructions idempotentes (`CREATE TABLE/INDEX IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`) :
  crée tout sur une base vide, n'ajoute que le manquant sur la base existante.
  Syntaxe vérifiée dans la grammaire officielle TiDB (`ADD COLUMN 'IF NOT EXISTS'?`, `CREATE INDEX IfNotExists`).
- **Trouvé** : un script manuel `migrations/001_add_clerk_user_id.sql` (juin, jamais suivi par un outil) expliquait
  `clerk_user_id VARCHAR(64)` + `idx_analyses_clerk_user_id` en production. Repris **à l'identique** dans la baseline
  (aucun index en double) puis retiré (reste dans l'historique git).
- `prisma/migrator.ts` : table `schema_migrations` (version, nom, SHA-256, date) ; application dans l'ordre ;
  migration déjà appliquée puis modifiée → refus ; échec → version non enregistrée (relançable).
  Les `ALTER` de `DatabaseService.onModuleInit` sont supprimés et remplacés par le migrateur.
  **Changement de comportement** : en production, un échec de migration arrête le démarrage (avant : erreur ignorée,
  API lancée sur un schéma incomplet) ; en développement, erreur journalisée et démarrage quand même.
- `npm run migrate` (`dist/prisma/migrate.js`) pour appliquer manuellement. `render.yaml` inchangé (migrations au démarrage).
- `schema.prisma` : client Prisma jamais utilisé (tout passe par `mysql2`) → avertissement en tête du fichier.
- Preuves :
  - `npx jest` → **16 suites, 225 tests réussis** (+11) : idempotence (2ᵉ passage = 0 instruction), ajout incrémental,
    refus d'une migration modifiée, échec au milieu, empreinte identique CRLF/LF, versions consécutives,
    toutes les instructions en `IF NOT EXISTS`, et **toutes les colonnes lues/écrites par le code présentes dans le
    schéma** (test vérifié par mutation : retirer `site_checks` le fait échouer) ;
  - `node dist/main` sans base : production → arrêt (exit 1), développement → erreur journalisée + API démarrée ;
    `npm run migrate` sans base → exit 1 avec message.
- ⚠️ Limite : jamais exécuté sur la vraie base TiDB (pas d'accès). Au premier démarrage configuré (1.12), vérifier
  dans les journaux « Migrations : 1 appliquée(s) » puis « 0 appliquée(s), 1 déjà en place » au redémarrage.

### 2026-10-09 — 2.1 Espaces agence (workspaces)
- Migration `002_workspaces.sql` : `workspaces` (nom, logo https, couleur #RRGGBB, langue par défaut ar/en/fr,
  propriétaire) et `workspace_members` (rôle `owner`/`member`). Idempotente, appliquée par le migrateur 1.11.
- `workspaces/workspaces.service.ts` + routes `/workspaces` (Clerk obligatoire, limitées en débit) :
  créer, lister ses espaces, détail avec membres (email affiché, au mieux), modifier la marque (**propriétaire seul**),
  ajouter un membre **par email d'un compte VELIFA existant** (recherche Clerk ; sinon message explicite, pas
  d'invitation fictive), retirer un membre / quitter. Propriétaire jamais retirable ; 10 membres max ;
  un non-membre reçoit 404 (l'existence de l'espace n'est pas révélée).
  Logo : https uniquement (`javascript:`, `data:`, `http:` refusés).
- Paramètres → section « Mon agence » (FR/EN/AR) : création, aperçu de la marque, édition, membres.
- Limites de plan (nombre d'espaces, membres payants) : non appliquées ici → 2.7.
- Preuves : `npx jest` → **17 suites, 235 tests réussis** (+10 service espaces, migrations 001→002 consécutives,
  colonnes `workspaces` couvertes) ; `tsc` exit 0 ; `next build` exit 0 ;
  API réelle : `/workspaces` sans jeton → 401 (GET, POST, DELETE) ; champ `ownerClerkUserId` injecté → 400.
- ⚠️ Limite : parcours complet non testé avec un vrai compte Clerk (clés de test non utilisées sans accord) ni sur la vraie base.

### 2026-10-09 — 2.2 Sites suivis en base
- Migration `003_tracked_sites.sql` : site personnel (`scope = user:<id>`) ou d'un espace agence ; unique par scope.
- `sites/sites.service.ts` + routes `/sites` (GET, POST, DELETE ; Clerk obligatoire, limitées en débit) :
  URL validée comme un audit (syntaxe + DNS anti-SSRF) ; membres d'un espace : ajout/retrait ; non-membre → 404.
  Chaque site renvoie son **dernier audit terminé** (lancé par le titulaire ou un membre de l'espace).
- **Limite par plan côté serveur** (`payments/plan-limits.ts`) : comptée sur le **titulaire** de l'abonnement, tous
  espaces confondus (créer plusieurs espaces ne la contourne pas) ; abonnement expiré → limite « free ».
  ⚠️ Les nombres (`free:1, pro:5, business:30`) sont une **hypothèse** : la page Tarifs n'annonce encore aucune limite.
  Réglables sans code (`PLAN_SITE_LIMITS`) ; à valider avec la grille de prix (4.2, 2.7).
- Tableau de bord : bloc « Sites suivis » (FR/EN/AR) — usage `n / limite`, choix personnel / agence, dernier score,
  rapport, relancer un audit, retirer ; « Suivi multi-sites » retiré de l'encart « Bientôt ».
- Preuves : `npx jest` → **18 suites, 246 tests réussis** (+11) ; `tsc` exit 0 ; `next build` exit 0 ;
  API réelle : `/sites` sans jeton → 401 (GET, POST, DELETE) ; URL absente → 400 ; `ownerClerkUserId` injecté → 400.

### 2026-10-09 — 2.3 Audits programmés et alertes
- Migration `004_site_monitoring.sql` : par site suivi, fréquence (`off`/`daily`/`weekly`), seuil d'alerte (1–100),
  langue de l'alerte, dernier passage, dernier score de référence, dernier audit, date de la dernière alerte.
- **Planificateur** (`sites/monitoring.service.ts` + `monitoring.processor.ts`) : une tâche Bull **répétée toutes les
  heures** (cron `0 * * * *`, dédoublonnée par Bull) sélectionne au plus 50 sites dus (1 h de tolérance pour ne pas
  dériver), crée un audit `source='scheduled'` sans email au nom du titulaire, espacé (30 s) dans la file.
  Plan **Business** requis (annoncé sur la page Tarifs) : contrôlé au réglage **et** à chaque passage
  (abonnement expiré → plus d'audit, site marqué pour ne pas réessayer chaque heure).
- **Règle d'alerte** : email quand le score **passe sous** le seuil (pas à chaque audit sous le seuil) ; email FR/EN/AR
  (RTL), avant → après, liens rapport et **comparaison avant/après** (1.9), rappel sur la variabilité Lighthouse.
  Envoi en échec ou titulaire sans email vérifié → l'ancien score de référence est conservé pour retenter.
- `PATCH /sites/:id/monitoring` (membres de l'espace ; plan du titulaire) ; réglages dans « Sites suivis » ;
  textes Tarifs et tableau de bord mis à jour : multi-sites, audits programmés et alertes ne sont plus « bientôt »
  (PDF et API le restent).
- **Corrigé avant livraison** : l'enregistrement de la tâche horaire attendait Redis au démarrage → sans Redis l'API ne
  démarrait jamais. Rendu non bloquant ; vérifié : API démarrée sans Redis.
- Preuves : `npx jest` → **19 suites, 274 tests réussis** (+28 : échéances, règle d'alerte (8 cas), planificateur,
  envoi/échec d'alerte, gabarit email échappé, réglages) ; `tsc` exit 0 ; `next build` exit 0 ;
  API réelle : PATCH sans jeton → 401, fréquence invalide / seuil 500 → 400.
- ⚠️ Limite : passage horaire réel non observé (pas de Redis local) ; à vérifier en environnement configuré
  (journal « Planificateur des audits programmés enregistré »).

### 2026-10-09 — 2.4 Rapport PDF à la marque de l'agence
- `reports/pdf-report.template.ts` : HTML A4 autonome, **marque blanche** (nom, logo, couleur de l'agence, aucune
  mention VELIFA), arabe en RTL avec police Noto Sans Arabic, FR/EN : score, données terrain, mesures labo,
  6 recommandations principales, points Golfe + avertissement juridique, scores Lighthouse, sources des mesures.
  Toute donnée variable échappée ; couleur et logo revalidés (pas d'injection CSS / `javascript:`).
- Textes partagés avec le rapport web : `scripts/sync-report-texts.js` (`npm run i18n:sync`) génère
  `i18n/report-messages.generated.ts` depuis `frontend/src/messages` ; un test échoue si la copie n'est plus à jour.
- `GET /reports/:analysisId/pdf?workspaceId=&locale=` : membre de l'espace, **plan Business** du titulaire
  (annoncé sur la page Tarifs), audit terminé ; rendu par l'API `/pdf` de Browserless (`html`, format A4 — vérifié
  dans la documentation Browserless) ; 10 PDF/min ; Browserless non configuré → 503 explicite.
- Rapport web : bouton « PDF à votre marque » visible pour les membres d'un espace agence (FR/EN/AR).
  Tarifs / tableau de bord : le PDF n'est plus « bientôt » (l'API le reste).
- Preuves :
  - `npx jest` → **20 suites, 282 tests réussis** (+8 : RTL, marque blanche, échappement, contenu, accès, plan, 503) ;
    `tsc` exit 0 ; `next build` exit 0 ; API réelle : `/reports/c1/pdf` sans jeton → 401 ;
  - **PDF réellement imprimé** à partir de la fixture PageSpeed réelle avec le moteur Chromium local (Edge headless,
    profil temporaire) en arabe et en anglais : 2 pages A4, arabe correctement rendu (RTL, ligatures), marque de
    l'agence. Corrigé à la relecture : « Date : » à la française dans toutes les langues ; section Golfe coupée
    entre deux pages (désormais insécable).
- ⚠️ Limite : appel Browserless réel non effectué (clé de production non utilisée sans accord) → à vérifier en 1.12,
  notamment le chargement de la police arabe par le Chrome de Browserless.

### 2026-10-09 — 2.5 Widget d'audit pour les sites d'agences
- Migration `005_widget.sql` : clé publique du widget et domaines autorisés par espace ; table `workspace_prospects`.
- Configuration (`PUT /workspaces/:id/widget`, propriétaire, **plan Business**) : 1 à 5 domaines https normalisés,
  clé de 32 caractères hexadécimaux créée une fois, renouvelable (désactive l'ancien code).
- Routes publiques `/widget/:key/{config,audit,analyses/:id}` : **origine du navigateur comparée exactement** aux
  domaines déclarés (sous-domaine, http ou domaine piégé refusés), titulaire Business, email ou WhatsApp international
  obligatoire, URL validée comme un audit (anti-SSRF), 3 audits/h/IP et **plafond quotidien par agence**
  (`WIDGET_DAILY_LIMIT`, 50 par défaut, hypothèse) — pas de CAPTCHA possible sur les domaines des agences.
  Audit au nom du titulaire, **sans email VELIFA** ; le statut n'est lisible que pour les audits de ce widget.
- **CORS par route** (`common/security/cors.ts`) : `/widget/*` ouvert à toute origine **sans cookies ni
  Authorization** ; le reste de l'API reste limité au frontend VELIFA.
- `frontend/public/widget.js` : sans dépendance, Shadow DOM (CSS de l'agence sans effet), FR/EN/AR (RTL), nom et
  couleur de l'agence, score affiché dans le widget (marque blanche : aucun lien vers VELIFA).
  « Mon agence » : domaines, code à copier, prospects reçus.
- Preuves :
  - `npx jest` → **21 suites, 301 tests réussis** (+19) ; `tsc` exit 0 ; `next build` exit 0 ;
  - **navigateur réel** (Edge headless) : page « agence » sur une autre origine → formulaire arabe affiché, soumission,
    requêtes cross-origin correctes, score 47/100 affiché (captures vérifiées) ;
  - **backend réel** : préflight `/widget/…` depuis `https://agence.ae` → autorisé, en-têtes limités à `Content-Type` ;
    préflight `/workspaces` depuis ce domaine → refusé ; depuis le frontend → autorisé avec identifiants ;
    clé mal formée → 404 ; configuration sans jeton → 401.

### 2026-10-09 — 2.6 Clés API et API publique v1
- Migration `006_api_keys.sql` : clés par titulaire ; **seule l'empreinte SHA-256** est stockée (+ préfixe affichable).
- Clés `vlf_` + 40 hex (160 bits), affichées **une seule fois** ; 5 actives max ; révocation ; dernière utilisation.
  Gestion : `GET/POST/DELETE /api-keys` (Clerk). Création et **chaque appel** : plan Business du titulaire
  (abonnement expiré → 403 immédiat, sans révoquer la clé).
- API publique v1 : `POST /api/v1/public/audits` `{ url, locale? }` → 202 + audit en file ;
  `GET /api/v1/public/audits/:id` → statut puis scores, mesures, données terrain, recommandations, contrôles,
  lien du rapport. Clé via `Authorization: Bearer vlf_…` ou `X-API-Key`. Un titulaire ne lit que **ses** audits
  (404 sinon). URL validée (anti-SSRF), 30 requêtes/min, plafond quotidien (`API_DAILY_LIMIT`, hypothèse 200).
- Paramètres → « Clés API » (FR/EN/AR) avec exemple `curl`. Tableau de bord : encart « Bientôt » retiré
  (plus aucune fonction annoncée sans implémentation) ; Tarifs : l'API n'est plus « bientôt ».
- Preuves : `npx jest` → **22 suites, 311 tests réussis** (+10 : format/empreinte, en-têtes, révocation, plan,
  plafond, propriété des audits, aucune donnée personnelle) ; `tsc` exit 0 ; `next build` exit 0 ;
  API réelle : sans clé, jeton Clerk à la place d'une clé, clé mal formée → 401 ; `/api-keys` sans jeton → 401.

