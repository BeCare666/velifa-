# Grille de prix VELIFA — proposition (ROADMAP 4.2)

> **Statut : HYPOTHÈSE À TESTER.** Les montants sont dérivés des prix concurrents relevés ci-dessous (2026-10-09).
> Ils seront **modifiables par l'admin dans le backoffice** (ROADMAP 2.7), sans redéploiement.
> Paiement en **USD** (Lemon Squeezy) ; les montants en SAR / AED / QAR sont **indicatifs** (parités fixes).

---

## 1. Prix concurrents relevés

### Outils SaaS (offre B — agences)

| Concurrent | Plan | Prix / mois | Ce qui est inclus (pertinent pour VELIFA) | Source et fiabilité |
|---|---|---|---|---|
| SEOptimer | Starter | **29 $** | Audits SEO, 1 site ; **pas** de PDF marque blanche, **pas** de widget | Page officielle seoptimer.com/pricing — **lue le 2026-10-09** |
| SEOptimer | Pro | **39 $** | **PDF marque blanche**, 3 sites suivis, 3 utilisateurs, 10 rapports programmés ; pas de widget | idem |
| SEOptimer | Max | **59 $** | PDF marque blanche + **widget de capture de prospects**, 10 sites suivis, 6 utilisateurs, 50 rapports programmés | idem |
| SEOptimer | Annuel | −25 % | Starter 261 $/an, Pro 351 $/an, Max 531 $/an | idem |
| Calibre | Starter | **75 $** | Surveillance de performance, 5 000 tests/mois, 3 utilisateurs | Page officielle calibreapp.com/pricing — **lue le 2026-10-09** |
| Calibre | Team | **150 $** | 15 000 tests/mois, 10 utilisateurs | idem |
| GTmetrix PRO | Solo / Starter / Growth | 14,50 $ / 28 $ / 55,50 $ | Tests et surveillance de performance | Annonce officielle GTmetrix de **décembre 2023** (via recherche) ; page actuelle inaccessible (403) → **non revérifié** |
| DebugBear | Entrée | ≈ 79 $ (selon plusieurs annuaires) | Surveillance de performance | Sources tierces **contradictoires** ; page officielle non lisible → **non retenu** |

### Services de correction (offre A — boutiques Salla / Zid)

| Prestataire (Khamsat) | Prix | Périmètre | Fiabilité |
|---|---|---|---|
| « تحسين وتسريع متاجر سلة » | **25 $** (1 jour) | **Page d'accueil seulement** ; rapport PageSpeed avant/après ; options : page produit +25 $, ouverture depuis les réseaux sociaux +30 $, script d'images +50 $ | Page du service **lue le 2026-10-09** ; 4 avis |
| « تسريع متجر سلة او زد بإستخدام أداة ريبارو » | 10 $ (4 jours) | Page d'accueil ; options 25 / 50 / 100 pages : 25 $ / 50 $ / 100 $ | Page lue le 2026-10-09 ; **service suspendu** ; 4 avis |

Constat : aucune application de vitesse avec prix mensuel n'a été trouvée dans l'App Store Salla (recherche du
2026-10-09) ; les services existants sont des prestations ponctuelles à bas prix, limitées à la page d'accueil.

### Parités monétaires (fixes)

1 USD = **3,75 SAR** (depuis 1986) · **3,6725 AED** (depuis 1997) · **3,64 QAR** (depuis 2001) — parités officielles
rapportées par plusieurs sources de presse ; à confirmer auprès de SAMA / CBUAE / QCB avant affichage contractuel.

---

## 2. Grille proposée

### Offre B — abonnements (prix calés sur les concurrents à périmètre comparable)

| Plan VELIFA | Prix / mois | Annuel (−25 %, comme SEOptimer) | Référence concurrente | Inclus aujourd'hui dans le code |
|---|---|---|---|---|
| Gratuit | 0 $ | — | — | 3 audits / 24 h (compte), 1 site suivi |
| **Pro** | **29 $** | **261 $ / an** | SEOptimer Starter 29 $ ; GTmetrix Starter 28 $ (2023) | Audits illimités, historique, comparaison avant/après, 5 sites suivis |
| **Business (agence)** | **59 $** | **531 $ / an** | SEOptimer Max 59 $ (PDF marque blanche **+ widget**) ; sous Calibre Starter 75 $ | Espaces agence, 30 sites, audits programmés + alertes, **PDF marque blanche**, **widget**, **API** |

Montants indicatifs : Pro ≈ **108,75 SAR / 106,50 AED / 105,56 QAR** ; Business ≈ **221,25 SAR / 216,68 AED / 214,76 QAR**.

Justification : VELIFA Business réunit ce que SEOptimer répartit entre Pro (PDF marque blanche) et Max (widget) ;
au même prix que Max, avec en plus les contrôles propres au Golfe (Salla/Zid, arabe RTL, indicateurs PDPL)
qu'aucun concurrent relevé ne propose.

### Offre A — audit + correction (prestation ponctuelle)

| Forfait | Prix | Dérivation à partir des prix relevés | Contenu |
|---|---|---|---|
| **Essentiel** | **49 $** (≈ 183,75 SAR) | Khamsat : accueil 25 $ + page produit 25 $ = 50 $ | Accueil + page produit, rapport avant/après mesuré (1.9) en arabe |
| **Complet** | **149 $** (≈ 558,75 SAR) | Khamsat : 25 + 25 + 30 + 50 = 130 $ + suivi | Accueil, produit, catégorie, ouverture depuis les réseaux sociaux, images ; avant/après ; 30 jours de suivi programmé |

⚠️ Hypothèse la plus fragile : les références Khamsat ont peu d'avis (4) et un service est suspendu.
À tester sur les 5 premiers clients (point de décision 4.5).

### Limites par plan (déjà configurables)

| Limite | Valeur actuelle | Repère concurrent | Recommandation |
|---|---|---|---|
| Sites suivis (`PLAN_SITE_LIMITS`) | free 1, pro 5, business 30 | SEOptimer : Pro 3, Max 10 ; GTmetrix (non revérifié) : 3 / 6 / 12 | Garder ; ajustable par l'admin (2.7) |
| Audits API / jour (`API_DAILY_LIMIT`) | 200 | SEOptimer Pro/Max : quota API de 50 | **Baisser à 50** pour aligner et limiter le coût PageSpeed / Browserless |
| Widget / jour / agence (`WIDGET_DAILY_LIMIT`) | 50 | Pas de repère chiffré public | Garder, surveiller |

---

## 3. À faire ensuite

1. Vous validez (ou ajustez) ces montants — ils restent modifiables dans le backoffice (2.7).
2. Créer dans Lemon Squeezy les produits / variantes correspondants en USD (2.8) — l'API Lemon Squeezy permet de
   **lire** les variantes ; leur création se fait dans le tableau de bord Lemon Squeezy (à vérifier en 2.8).
3. Mettre à jour la page Tarifs à partir des plans enregistrés (2.7) — fin des prix en euros codés en dur.
