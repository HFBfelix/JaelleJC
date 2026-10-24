# Rapport QA — Étape 1 : socle Next.js

Date : 2026-10-24 · Branche : `refonte-next` (depuis `main` d18ae81) · Environnement : local (Windows 11, Next.js `next start` sur le site construit ; ancien site lancé depuis `legacy/` avec les émulateurs et les données fictives). Staging pas encore créé : la vérification en ligne se fait sur l'aperçu Vercel de la branche.

## Périmètre

Squelette du nouveau site : en-tête (menu, recherche, logo, compte, panier), barre des catégories, menu plein écran, bloc newsletter, pied de page, bandeau cookies (repris tel quel, décision de Jaelle), Google Analytics après consentement. Les pages (accueil, collection, fiches) arrivent à l'étape 2.

Volontairement inactifs à ce stade : bouton panier (étape 3), bouton compte (étape 4), formulaire newsletter (étape 1bis : écriture serveur validée), lien « Rechercher » et liens de catégories (pages créées à l'étape 2).

## Comparaison visuelle avec l'ancien site

Références prises sur l'ancien site (`legacy/`, émulateurs, données fictives), puis comparaison avec le nouveau, Chromium, iPhone 13 (390 × 664) et ordinateur (1440 × 900). Le contenu de page est masqué pour la newsletter et le pied de page (il diffère : accueil complet / squelette).

| Zone | Mobile | Ordinateur | Preuve |
|---|---|---|---|
| En-tête | Identique (0 pixel d'écart) | Identique (0) | `npm run test:visual`, tolérance ramenée à 0 pixel |
| Barre des catégories (Bébé, Coffrets, Femmes) | Identique (0) | Identique (0) | idem |
| Menu ouvert | Identique (0) | Identique (0) | idem |
| Bloc newsletter | Identique (0) | Identique (0) | idem |
| Pied de page | Identique (0) | Identique (0) | idem |
| Bandeau cookies | Identique (0) | Identique (0) | idem |

Références : `tests/visual/reference/{mobile,ordinateur}/*.png` (12 images). Stabilité : deux passes successives sur l'ancien site identiques.
`tailwind.config.ts` et la feuille de style de base sont strictement identiques à l'ancien site (`git diff --no-index legacy/tailwind.config.ts tailwind.config.ts` : aucune différence).

## Parcours testés

| Parcours | Chrome mobile | Chrome ordinateur | Safari iPhone (WebKit) | Firefox | Preuve |
|---|---|---|---|---|---|
| Premier passage : bandeau affiché, aucun traceur | OK | OK | OK | CI | `tests/e2e/consentement.spec.ts` |
| « Continuer sans accepter » : aucun traceur, même après rechargement | OK | OK | OK | CI | idem |
| « Tout accepter » : Analytics chargé (G-BHFEM85RCJ), bandeau masqué | OK | OK | OK | CI | idem |
| Valeur trafiquée dans le stockage : bandeau réaffiché, aucun traceur | OK | OK | OK | CI | idem |
| Menu : ouverture, fermeture | OK | OK | OK | CI | `tests/e2e/socle.spec.ts` |
| Liens de catégories | OK | OK | OK | CI | idem |
| HTML initial : Layout présent sans JavaScript, une seule `<h1>`, `lang="fr"`, titre d'`EDITORIAL.md` | OK | OK | OK | CI | idem |
| En-têtes de sécurité | OK | OK | OK | CI | idem |

`npx playwright test --project mobile --project ordinateur --project iphone-safari` : 24/24 réussis en local (8 tests × 3 navigateurs). Firefox ne se lance pas sur ce poste Windows (`browserType.launch: spawn UNKNOWN`, blocage du système, pas du site) : il est exécuté par la vérification GitHub (Linux).

Tests unitaires : `npm test` (Vitest), 7/7 (lecture, écriture et validation du choix de consentement, stockage bloqué).
Non-régression des règles de l'étape 0 avec Firebase 13 : 39/39 (`tests/rules/rules.test.mjs` sur les émulateurs).

## Anomalies

| # | Gravité | Description | Statut |
|---|---|---|---|
| Q1 | Faible | Les boutons à icône de l'ancien site n'avaient pas de nom lisible par les lecteurs d'écran | Corrigé (`aria-label`, invisible) |
| Q2 | Faible | Bandeau cookies plein écran, alors que `CLAUDE.md` le veut non bloquant | Conservé : décision de Jaelle (2026-10-24) |
| Q3 | Info | Firefox non testable en local | Exécuté en CI |

## Contrôles

- Types : `npm run typecheck` sans erreur. Lint : `npm run lint` sans erreur ni avertissement.
- Construction : `npm run build` réussie (pages `/` et `/_not-found`, statiques).

## Décision

Go pour la vérification de Jaelle sur l'aperçu Vercel.
