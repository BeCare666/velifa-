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
| 0.2 | Configurer Jest côté backend | `npm test` s'exécute | ⬜ |
| 0.3 | **S1** Supprimer la clé admin par défaut ; accès admin uniquement via Clerk + email admin ; clé interne optionnelle côté serveur seulement ; exports CSV via requête authentifiée | Aucune occurrence de la clé dans le code ; test : requête avec l'ancienne clé → 401/403 | ⬜ |
| 0.4 | **S2** Protection SSRF : résolution DNS + blocage des plages privées/réservées (IPv4/IPv6), appliquée aussi aux redirections | Tests unitaires : toutes les URL internes du test initial bloquées, `https://example.com` acceptée | ⬜ |
| 0.5 | **S3** CAPTCHA cohérent : widget Turnstile réel si clé configurée ; contournement seulement hors production sans clé ; échec fermé en production | Tests unitaires des 4 cas (dev sans clé, prod sans clé, jeton invalide, jeton valide simulé) | ⬜ |
| 0.6 | **S4** Envoi d'email : limite stricte + interdiction d'envoyer le rapport d'un autre utilisateur | Tests unitaires | ⬜ |
| 0.7 | **S5** Réponse publique d'une analyse sans données personnelles (email, IP, user-agent) | Test unitaire sur la fonction de sérialisation | ⬜ |
| 0.8 | **S6** Route `GET /api/v1/health` (BDD + Redis) | Test unitaire du contrôleur | ⬜ |
| 0.9 | **S7** Résoudre le conflit Next/Clerk (montée de version de Next compatible) | `npm ci` sans `--legacy-peer-deps` + `next build` OK | ⬜ |
| 0.10 | **S8** Rendre publiques les pages rapport et chargement | Route matcher mis à jour ; build OK | ⬜ |
| 0.11 | **F1** Retirer/étiqueter « Bientôt » les fonctions factices ; aligner la page tarifs sur ce qui existe | Aucune promesse tarifaire sans implémentation serveur | ⬜ |
| 0.12 | **F2** Langue de l'utilisateur transmise à l'audit ; email + message WhatsApp en AR/EN/FR | Tests unitaires des gabarits (3 langues, `dir="rtl"` en arabe) | ⬜ |
| 0.13 | `.env.example` complets et documentés (backend + frontend) | Toutes les variables lues par le code sont listées | ⬜ |

---

## Phase 1 — Offre A : moteur de prospection + rapport qui convainc

**Objectif** : auditer des centaines de boutiques du Golfe et envoyer à chaque propriétaire un rapport
compréhensible en arabe, avec un argument chiffré et un contact WhatsApp.

| ID | Tâche | Critère d'acceptation | Statut |
|---|---|---|---|
| 1.1 | Détection plateformes : Salla, Zid, WooCommerce, Magento, BigCommerce (signatures vérifiées sur de vrais sites) | Tests unitaires avec des extraits HTML réels | ⬜ |
| 1.2 | Contrôles arabe/bilingue : `lang`, `dir`, `hreflang`, liens de version alternative | Tests unitaires | ⬜ |
| 1.3 | Indicateurs confidentialité : traceurs présents dans le HTML initial, présence d'un outil de consentement connu, lien politique de confidentialité | Tests unitaires ; libellé « indicateur, pas un avis juridique » | ⬜ |
| 1.4 | Données terrain CrUX (vrais visiteurs) extraites de la réponse PageSpeed et stockées | Test unitaire du parseur | ⬜ |
| 1.5 | Recommandations priorisées et traduites (AR/EN/FR) à partir des audits Lighthouse | Tests unitaires | ⬜ |
| 1.6 | Estimation d'impact business (référence Deloitte/Google, présentée comme corrélation) | Texte sourcé dans le rapport | ⬜ |
| 1.7 | Audit en lot (admin) : import CSV d'URL → file d'attente à débit limité → table `prospects` | Test unitaire du parseur CSV + du service | ⬜ |
| 1.8 | Export prospects (CSV) avec lien WhatsApp pré-rempli en arabe par prospect | Test unitaire | ⬜ |
| 1.9 | Comparaison avant/après de deux audits d'une même URL | Test unitaire + page rapport | ⬜ |
| 1.10 | Capture de contact sur le rapport (« Je veux corriger ») → table `leads` + notification admin | Test unitaire | ⬜ |
| 1.11 | Migrations SQL versionnées remplaçant les `ALTER` au démarrage (**F3**) | Script de migration idempotent | ⬜ |
| 1.12 | 🔒 Clés de production (PageSpeed, Browserless, Brevo, Clerk, TiDB, Redis, Turnstile) et déploiement | Vous fournissez les clés | 🔒 |

---

## Phase 2 — Offre B : SaaS agences (marque blanche)

**Objectif** : un abonnement récurrent pour agences, vendable dans tous les pays.
Repère de prix vérifié : SEOptimer marque blanche ≈ 39–59 $/mois.

| ID | Tâche | Critère d'acceptation | Statut |
|---|---|---|---|
| 2.1 | Modèle `workspaces` (agence) : nom, logo, couleur, langue par défaut, membres | Migration + tests service | ⬜ |
| 2.2 | Sites suivis en base (remplace `localStorage`), limites par plan appliquées côté serveur | Tests | ⬜ |
| 2.3 | Audits programmés (BullMQ répétable) + alertes email en cas de baisse sous un seuil | Tests du planificateur et de la règle d'alerte | ⬜ |
| 2.4 | Rapport PDF à la marque de l'agence, AR/EN (rendu HTML → PDF via Browserless) | Test du gabarit HTML ; PDF généré en environnement configuré | ⬜ |
| 2.5 | Widget d'audit intégrable (script) sur le site de l'agence → prospect enregistré pour l'agence | Test du endpoint public + domaine autorisé | ⬜ |
| 2.6 | Vraies clés API (hachées en base) + API publique v1 (créer/consulter un audit) | Tests auth par clé | ⬜ |
| 2.7 | Plans et prix en USD (Lemon Squeezy), limites appliquées côté serveur | Tests des limites | ⬜ |
| 2.8 | 🔒 Créer les produits/variantes Lemon Squeezy en USD ; vérifier versement vers votre pays | Action de votre part | 🔒 |

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
3. Comptes partenaires Salla et Zid (3.1).
4. Liste de cibles et prospection (4.3), validation juridique (4.4).

---

## Journal

Chaque entrée : date, tâche, ce qui a été fait, **preuve** (commande + résultat).

### 2026-10-08 — Audit initial
- Installation backend : OK. Compilation backend (`tsc`, `nest build`) : OK.
- Installation frontend `npm ci` : **échec** (S7) ; installée avec `--legacy-peer-deps` pour l'analyse ; `tsc --noEmit` : OK.
- Test SSRF (script) : 5 URL internes acceptées sur 8 (S2).
- 0.1 ✅ `git init` + commit `1d7d7d2` (état d'origine).
