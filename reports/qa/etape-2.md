# Rapport QA — Étape 2 : catalogue rendu côté serveur

Date : 2026-10-28 · Branche : `refonte-next` · Environnement : local (Windows 11, `next start` branché sur l'émulateur Firestore : catalogue réel copié depuis l'API publique puis migré ; ancien site lancé depuis `legacy/` sur le même catalogue au format d'origine).

## Périmètre

- Pages rendues côté serveur (contenu dans le HTML initial) : accueil, collections (avec filtres), fiche produit `/produits/[slug]`, journal et articles `/blog/[slug]`.
- Lecture du catalogue publié par l'Admin SDK (`src/server/catalog/*`) ; menu et catégories lus en base.
- Redirections 301 : `/product/:id` → `/produits/[slug]`, `/blog/1…4` → adresses lisibles ; `?category=<nom>` → `?category=<slug>`.
- Métadonnées uniques, URL canonique, Open Graph ; JSON-LD `Organization`, `Product` + `Offer`, `BreadcrumbList`, `Article` ; plan du site et `robots.txt` dynamiques ; pages 404 et erreur.
- Fiche produit : descriptions réparties (accroche en citation ; rubriques Description, Matières & Entretien, Dimensions & détails, Livraison & Retours), demande de Jaelle du 2026-10-24.

## Changements visibles voulus

| # | Changement | Raison |
|---|---|---|
| V1 | Fiche produit mobile : accroche et rubriques affichées sous le bouton (l'ancienne fiche mobile n'affichait ni description ni rubriques) | Demande de Jaelle (informations mieux réparties) |
| V2 | Rubriques sans contenu non affichées (plus de « Matières nobles sélectionnées par l'Atelier », « Dimensions ajustées pour un porté idéal ») | Aucune affirmation sans preuve (CLAUDE.md §5, EDITORIAL.md §1) |
| V3 | Image de l'article « jersey » dans la liste du journal : la vraie photo au lieu d'une image de remplacement (lien cassé) | Correction |
| V4 | Adresse inconnue : page « Cette page n'existe pas » (l'ancien site affichait l'accueil) | SEO (CLAUDE.md §5) |

Retiré sans effet visible : bloc invisible « coton Oeko-Tex » de la grille d'accueil (label non prouvé, EDITORIAL.md §1).

## Comparaison visuelle avec l'ancien site

Références prises sur l'ancien site avec les règles Firestore de production (`tests/visual/charger-regles.mjs anciennes`) et le même catalogue ; Chromium, iPhone 13 et ordinateur 1440 × 900.

| Page | Mobile | Ordinateur | Zones masquées |
|---|---|---|---|
| Accueil | OK | OK | diaporama (animation continue) |
| Collections | OK | OK | — |
| Collection Coffrets | OK | OK | — |
| Fiche produit | OK (galerie et « Résonances » comparées séparément, V1) | OK | colonne d'informations (V1, V2) |
| Journal | OK | OK | image « jersey » (V3) |
| Article | OK | OK | — |
| Layout de l'étape 1 (6 zones) | OK | OK | — |

`npm run test:visual` : 24/24 (tolérance 1 %). Écart réel mesuré avec une tolérance nulle : au plus 2 226 pixels par page (moins de 0,1 %), dû à la recompression des photos par `next/image`.

## Parcours testés

| Parcours | Chrome mobile | Chrome ordinateur | Safari iPhone (WebKit) | Firefox | Preuve |
|---|---|---|---|---|---|
| Fiche : nom, prix, rubriques, JSON-LD `Product`/`Offer`/`BreadcrumbList` dans le HTML initial, une seule `<h1>`, canonique | OK | OK | OK | CI | `tests/e2e/catalogue.spec.ts` |
| Fiche épuisée : « Épuisé », `OutOfStock` ; une variante inactive ne rend pas disponible | OK | OK | OK | CI | idem |
| Brouillon, archive, prix invalide : 404 partout (fiche, ancienne adresse, accueil, collection, plan du site) | OK | OK | OK | CI | idem |
| Redirections 301 (`/product/:id`, `/blog/1`) et catégorie par nom → slug | OK | OK | OK | CI | idem |
| Identifiant malformé ou très long : 404 | OK | OK | OK | CI | idem |
| Texte piégé (`</script>`, `<img onerror>`) : affiché comme texte, jamais exécuté, JSON-LD intact | OK | OK | OK | CI | idem |
| Plan du site, `robots.txt` (aperçu : rien d'indexé), journal (JSON-LD `Article`), 404 | OK | OK | OK | CI | idem |
| Parcours de l'étape 1 (consentement, en-têtes, menu, catégories) | OK | OK | OK | CI | `tests/e2e/consentement.spec.ts`, `socle.spec.ts` |

`npx playwright test` (3 navigateurs locaux) : 66/66 (dont, après relecture : aucun champ interne dans le HTML, adresses anormales en 404). Jeu de données fictif ajouté avant et retiré après (`tests/e2e/global-setup.ts`). Firefox : exécuté par la CI (Linux), ne démarre pas sur ce poste.
Tests unitaires : `npm test` 69/69 (dont `mapping.test.ts` : documents non conformes jamais affichés, stock des variantes actives ; `jsonld.test.ts` : sérialisation sûre).

## Lighthouse (mobile, local)

| Page | Performance | Accessibilité | Bonnes pratiques | SEO (aperçu) | SEO (mode production) |
|---|---|---|---|---|---|
| Accueil | 92 | 91 | 100 | 66 | **100** |
| Fiche produit | 88 | 91 | 96 | 69 | **100** |
| Collections | 88 | 91 | 96 | 69 | **100** |
| Article | 92 | 90 | 100 | 69 | **100** |

- SEO en aperçu : seul critère en échec, « indexable », volontaire (`robots.txt` interdit l'indexation hors production). Mesure refaite avec `VERCEL_ENV=production` : 100 partout. Objectif « SEO ≥ 95 » atteint.
- Points liés au design système (non modifiable, CLAUDE.md §2), à arbitrer à l'étape 9 : texte de 8 à 10 px (« taille de police lisible »), gris clairs sur blanc (contraste), petites zones cliquables.
- Performance mesurée sur un poste local avec émulateur : indicative ; à mesurer sur l'aperçu Vercel (étape 9, objectif ≥ 90).

## Anomalies

| # | Gravité | Description | Statut |
|---|---|---|---|
| Q1 | Moyenne | Une ancienne adresse `/product/:id` d'un produit « publié » mais non conforme redirigeait vers une fiche 404 | Corrigé (même validation que la fiche), testé |
| Q2 | Faible | Ancien site : la recherche de l'accueil n'était pas reprise par la page Collections | Corrigé (`?search=`) |
| Q3 | Info | Aperçu Vercel : le catalogue s'affichera quand la clé d'accès au projet de test sera saisie dans Vercel (« Preview ») ; d'ici là, page « L'atelier est momentanément indisponible » | Action de Jaelle (console Google bloquée quelques jours) |
| Q4 | Info | Pages Notre promesse, Contact, mentions légales, CGV : liens du menu en 404 | Hors périmètre (étapes 8 et 9) |
| Q5 | Info | Boutons « Ajouter à la sélection », compte : visibles, inactifs | Étapes 3 et 4 |

## Contrôles

- Types (`npm run typecheck`) et lint (`npm run lint`) : sans erreur. Construction (`npm run build`) : réussie.

## Décision

Go pour la vérification par Jaelle sur l'aperçu Vercel, dès le branchement du projet de test.
