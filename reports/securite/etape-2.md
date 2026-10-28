# Rapport de sécurité — Étape 2 : catalogue rendu côté serveur

Date : 2026-10-28 · Branche : `refonte-next` · Environnement testé : local (`next start` sur l'émulateur Firestore, catalogue réel migré + jeu fictif des tests). Aperçu Vercel : en attente de la clé d'accès au projet de test.

## Périmètre

- Lecture du catalogue publié côté serveur (`src/server/firebase/admin.ts`, `src/server/catalog/*`), pages accueil, collections, fiche, journal.
- Redirections 301, plan du site, `robots.txt`, données structurées (`src/server/seo/jsonld.ts`, `src/components/seo/JsonLd.tsx`), pages 404 et erreur.
- `next.config.ts` : optimiseur d'images limité aux buckets de la boutique, redirections.
- Nouvelle dépendance : `framer-motion` 12.35.0, épinglée, même version que l'ancien site, pour le diaporama de l'accueil repris à l'identique.

Aucune règle Firestore/Storage, route d'écriture, action ni collection ajoutée : le site public ne fait que lire, côté serveur.

## Contrôles effectués

| Contrôle | Cas testé | Résultat | Preuve |
|---|---|---|---|
| 1. Secrets | Motifs de clés dans `git diff 793693a..HEAD` | OK (0) | recherche `grep -E` ; relecture indépendante |
| 1. Clé du compte de service | Lue uniquement côté serveur ; JSON illisible → message sans extrait ; forme validée (Zod) | OK | `src/server/firebase/admin.ts` ; relecture |
| 2. Dépendances | `npm audit --omit=dev` ; `npm audit --audit-level=high` | 0 ; 0 élevée (5 moyennes, outils de développement) | commandes exécutées |
| 3. Autorisations (lecture publique) | Brouillon, archive, document non conforme : absents des pages, du plan du site, des redirections, des produits similaires | OK | `tests/e2e/catalogue.spec.ts` (3 cas × 6 adresses) ; `mapping.test.ts` |
| 3. Code serveur dans le navigateur | Aucun composant `'use client'` n'importe la base ; `server-only` sur `admin.ts` et `repository.ts` | OK | recherche `grep` ; construction réussie |
| 3. Données transmises au navigateur | Pas de stock exact, de dates internes, de `legacy`, `aiDraft`, `tags`, `histoire` dans le HTML | OK | test « aucun champ interne dans le HTML envoyé » ; `mapping.test.ts` |
| 5. Entrées | Slug très long, majuscules, script, tirets doubles → 404 sans lecture ; identifiant d'ancienne adresse malformé ou de 300 caractères → 404 | OK | tests e2e « adresse de fiche anormale », « identifiant malformé » |
| 6. Échappement | Texte piégé (`</script>`, `<img onerror>`) dans accroche et description : affiché comme texte, non exécuté ; JSON-LD sans balise | OK | test e2e « texte piégé » ; `jsonld.test.ts` |
| 6. Redirections ouvertes | `/product/%2F%2Fevil.com`, en-têtes `Host` / `X-Forwarded-Host` falsifiés, `?category=//evil.com` | Aucune redirection externe | relecture indépendante (curl) |
| 6. Optimiseur d'images (SSRF) | Image d'un autre domaine ou d'un autre bucket | Refus (400) | relecture indépendante (curl) |
| 7. Prix et stock | Prix lus en base en centimes ; prix nul, négatif, décimal ou texte → produit non affiché ; disponibilité = variante active avec stock | OK | `mapping.test.ts` ; test e2e « fiche épuisée » |
| 8. Abus | Pages lues à chaque requête (catalogue petit) ; pas de limitation de débit | Faible, consigné (F4) | relecture |
| 9. En-têtes, cookies, logs | En-têtes de l'étape 1 présents ; aucun cookie ; un seul journal serveur, sans donnée personnelle ; erreur 500 sans détail technique au public | OK | `curl -I` ; `grep console.` ; test sans base |
| 9. Indexation | Hors production : `Disallow: /` ; production : espaces privés exclus | OK | test e2e ; `robots.txt` en mode production |
| 10. Relecture indépendante | `git diff 793693a..HEAD` | 0 Critique, 0 Élevée ; 2 Moyennes, 6 Faibles | rapport de relecture du 2026-10-28 |

## Anomalies

| # | Gravité | Description | Correction | Statut |
|---|---|---|---|---|
| M1 | Moyenne | Stock exact et dates internes présents dans le HTML (données passées entières aux composants du navigateur) | Textes de la fiche calculés côté serveur ; `stock`, `updatedAt`, `createdAtMs` retirés des vues | Corrigé, testé |
| M2 | Moyenne | Adresse de fiche très longue → erreur 500 (Firestore refuse la requête) | Forme du slug vérifiée avant toute lecture | Corrigé, testé |
| F1 | Faible | `FIREBASE_SERVICE_ACCOUNT` mal formé : l'erreur pouvait recopier un extrait de la clé dans les journaux | Message neutre, validation Zod | Corrigé |
| F2 | Faible | Rien n'empêchait d'importer la base depuis un composant du navigateur | `import 'server-only'` (fourni par Next.js, sans nouvelle dépendance) | Corrigé |
| F3 | Faible | `FIRESTORE_EMULATOR_HOST` défini par erreur sur Vercel : lecture silencieuse d'un émulateur | Refus sur Vercel | Corrigé |
| F4 | Faible | Chaque requête relit le catalogue (coût de lecture en cas de robot insistant) | Cache court avec invalidation par l'espace créatrice | Ouvert → étape 7 ou 9 |
| F5 | Faible | Une photo hors des buckets autorisés faisait échouer toute la page | Photo ignorée | Corrigé, testé |
| F6 | Faible | L'optimiseur d'images de production accepte aussi le bucket du test | Accepté : les produits du test pointent vers les photos de production ; à resserrer à la bascule | Ouvert → étape 10 |
| R1 | Info | Disponibilité des cartes = champ `inStock` du produit ; fiche = variantes | À unifier quand le stock sera géré par l'espace créatrice (étape 7) | Ouvert |
| — | Critique (héritée) | Clés Brevo dans l'historique public (étape 0, #1) | Révocation dans Brevo par Jaelle | Ouvert |

## Décision

**Go.** Aucune anomalie Critique ou Élevée propre à l'étape. Points ouverts : F4, F6, R1 (étapes 7, 9, 10).
