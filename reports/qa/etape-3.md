# Rapport QA — Étape 3 : panier persistant côté serveur

Date : 2026-10-29 · Branche : `refonte-next` · Environnement : local (Windows 11, `next start` construit, branché sur l'émulateur Firestore : catalogue réel migré + jeu fictif des tests de parcours).

## Périmètre

- Panier côté serveur : collection `carts`, document identifié par l'empreinte SHA-256 d'un jeton aléatoire ; cookie `cart_token` (HttpOnly, SameSite=Lax, Secure hors poste de développement), 7 jours renouvelés à chaque visite (`src/proxy.ts`) ; `expiresAt` vérifié à chaque lecture.
- Logique (`src/server/cart/`) : ajout (+1, +2…), quantité, retrait, plafond au stock de la variante (et à 99), 30 lignes au plus, pièces dépubliées ou épuisées retirées avec message, prix et livraison relus en base à chaque calcul (centimes).
- Server Actions validées avec Zod (identifiants et quantité seulement) ; aucun prix accepté du navigateur.
- Interface : bouton « Ajouter à la sélection » branché, tiroir « Votre sélection » (porté de l'ancien site, typographie Atelier), badge du header lu côté serveur, page `/panier` (non indexée).
- Fiche produit : variantes actives transmises (identifiant, libellé, disponible ou non ; jamais le stock exact). Choix du modèle affiché seulement si un produit a plusieurs variantes (aucun aujourd'hui).

## Changements visibles voulus

| # | Changement | Raison |
|---|---|---|
| V1 | Tiroir : textes à 11 px au moins, capitales espacées à 0,12 em, plus d'italique ; « Votre panier est vide » → « Votre sélection est vide. » + « Découvrir les cadeaux de naissance » | Typographie Atelier (CLAUDE.md §2), EDITORIAL.md §5 |
| V2 | Tiroir : coche verte de « livraison offerte » retirée | Aucune couleur ajoutée (CLAUDE.md §2) |
| V3 | Bouton « Confirmer et payer » inactif, « Paiement en ligne bientôt disponible » | Paiement branché à l'étape 5 |
| V4 | Lien « Voir le détail » vers la nouvelle page `/panier` | PLAN.md étape 3 (page panier) |
| V5 | Ombre du tiroir seulement quand il est ouvert | Le tiroir fermé laissait une ombre sur le bord droit de l'écran |
| V6 | « Connexion requise pour payer » retiré | Parcours sans compte au clic « Payer » (étape 4) |

Captures du nouveau tiroir et de la page panier, mobile et ordinateur : `reports/qa/etape-3/` (prises avec le catalogue réel, 3 pièces). Pas de capture du tiroir de l'ancien site : il faudrait relancer l'ancien site sur l'ancien format de données ; comparaison faite sur le code (`legacy/src/components/cart/CartDrawer.tsx` : mêmes dimensions, marges, ordre des blocs).

## Comparaison visuelle (pages existantes)

`npm run test:visual` (BASE_URL du site construit) : **24/24** — accueil, collections, fiche, journal, article, Layout, mobile et ordinateur : inchangés.

## Parcours testés

| Parcours | Chrome mobile | Chrome ordinateur | Safari iPhone (WebKit) | Firefox | Preuve |
|---|---|---|---|---|---|
| 3 pièces ajoutées, navigateur fermé (nouveau contexte, cookies seuls), retour : badge 3, page panier 179 € | OK | OK | OK | CI | `tests/e2e/panier.spec.ts` |
| HTML initial : badge et lignes sans JavaScript ; `/panier` en `noindex, nofollow` | OK | OK | OK | CI | idem |
| Plafond au stock (2 en stock, 3 clics) : 2, message, bouton + inactif | OK | OK | OK | CI | idem |
| +1, −1, retrait depuis le tiroir, panier vide | OK | OK | OK | CI | idem |
| Cookie HttpOnly, SameSite=Lax, Max-Age 7 jours, illisible par `document.cookie` ; en base : empreinte seule, `productId` + `variantId` + `quantity` | OK | OK | OK | CI | idem |
| Panier expiré (`expiresAt` passé) : vide au retour | OK | OK | OK | CI | idem |
| Cookie inventé ou trafiqué : page 200, panier vide | OK | OK | OK | CI | idem |
| Autre visiteur : ne voit pas le panier ; aucun cookie sans ajout | OK | OK | OK | CI | idem |
| Lecture et écriture de `carts` depuis le navigateur (API Firestore, anonyme) : 403 | OK | OK | OK | CI | idem |
| Prix modifié en base après l'ajout : le panier affiche le nouveau prix | — | OK | — | — | idem (un seul navigateur : modifie le jeu partagé) |
| Pièce repassée en brouillon : retirée du panier, message « Cette pièce vient de trouver preneur… », base nettoyée | — | OK | — | — | idem |
| Parcours des étapes 1 et 2 (catalogue, consentement, socle) | OK | OK | OK | CI | `tests/e2e/*.spec.ts` |

Commande : `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 BASE_URL=http://localhost:3317 npx playwright test --project=mobile --project=ordinateur --project=iphone-safari` → 95 réussis, 4 ignorés (tests limités à « ordinateur »), après les corrections de la relecture de sécurité. Répétition ×3 des tests panier (mobile, ordinateur) : 54/54, aucun test instable. Firefox ne démarre pas sur ce poste (`spawn UNKNOWN`, problème du poste, déjà le cas aux étapes précédentes) : couvert par la CI.

## Tests unitaires

`npm test` : 132 tests, tous verts, dont `src/server/cart/logic.test.ts` (ajout, plafond, 99, lignes max., variantes, remise en accord, montants, livraison, expiration), `offers.test.ts` (brouillon, archive, prix invalide, variante inactive ou absente ; jeton) et `actions.test.ts` (entrées refusées : prix, nom, quantité nulle/négative/décimale/énorme/texte, identifiant chemin/vide/trop long).

## Points ouverts

| # | Sujet | Suite |
|---|---|---|
| Q1 | Politique TTL Firestore sur `carts.expiresAt` (suppression automatique) à activer sur le projet de test, puis en production à la bascule. En attendant, un panier expiré est refusé par le code. | Jaelle, console Google depuis son Chrome (étape 10 pour la production) |
| Q2 | Libellé « Modèle » du choix de variante et « Paiement en ligne bientôt disponible » : absents d'`EDITORIAL.md` | À valider par Jaelle (le second disparaît à l'étape 5) |
| Q3 | Fusion du panier visiteur dans celui du compte | Étape 4 |
| Q4 | Badge du header : chiffre à 11 px dans une pastille de 12 px (repris de l'ancien site) | Inchangé ; à revoir avec Jaelle si gênant |
