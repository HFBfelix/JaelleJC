# Rapport QA — Étape 1bis : nouvelle base de données

Date : 2026-10-24, mis à jour le 2026-10-28 · Branche : `refonte-next` · Environnements : local (émulateurs, projet fictif `demo-jaellejc`) et test (`jaellejc-staging`, Firestore europe-west9).

## Périmètre

- Schéma de la nouvelle base (`src/server/db/schema.ts`, Zod) : produits + variantes, catégories à slug, commandes, paniers, contacts, newsletter, réglages, prix en centimes.
- Règles Firestore et Storage réécrites (`firestore.rules`, `storage.rules`) : droit admin par revendication `admin: true`.
- Migration rejouable (`scripts/migrate-v2.ts`, `src/server/migration/*`) avec découpage des anciennes descriptions dans les sous-parties de la fiche (demande de Jaelle du 2026-10-24).
- Outils : copie du catalogue public vers le test, droit admin, publication des règles du test.

Décisions de Jaelle appliquées : migration de la production à la bascule (étape 10) ; projet de test rempli avec le catalogue public et des données fictives.

## Tests automatisés

| Suite | Résultat | Preuve |
|---|---|---|
| Règles Firestore et Storage (émulateur) : 5 appelants × chaque collection, cas positifs et négatifs | 102/102 | `npm run test:rules` (et job `regles` de la CI) |
| Logique (Vitest) : consentement, prix en centimes, slugs, catégories, produits, commandes, livraison, messages, newsletter, profils, articles, découpage des descriptions | 55/55 | `npm test` |
| Types, lint | sans erreur | `npm run typecheck`, `npm run lint` |

## Découpage des descriptions (vrai catalogue, 8 produits)

Proposition vérifiée sur les vraies fiches (rapport `reports/migration/jaellejc-staging-simulation-2026-10-24T21-48-44.md`, lu et approuvé par Jaelle le 2026-10-24 ; textes définitifs à confirmer dans l'espace créatrice) :

| Cas | Résultat | Test |
|---|---|---|
| Coffrets : liste à tirets avec dimensions | Accroche tirée de l'introduction, composition + dimensions dans « Dimensions & détails » | `description.test.ts` « découpage de la description du coffret » |
| Promesse environnementale (« éco-responsable », « durables ») | Phrase écartée et listée pour Jaelle | idem |
| Origine (« Made in France », « fabriqué en France ») | Gardée, conseil : « cousu main dans notre atelier d'Île-de-France » | idem |
| Couvertures et cabas : « Laver à 30° / Ne pas blanchir… » | Rubrique Entretien | « couverture : consignes de lavage… » |
| « gaz de coton & polaire » | Deux matières + conseil d'orthographe | idem |
| Dimensions combinées du cabas | Une ligne par élément | « cabas : dimensions combinées » |
| Vestes : tailles 6-9 m, 9-12 m | Alerte : variante par taille, stock à répartir par Jaelle (non inventé) | `transform.test.ts` « tailles détectées » |
| Aucun mot inventé | Chaque mot de la proposition vient du texte d'origine | « chaque mot de la proposition vient du texte d'origine » |

## Migration sur le projet de test

| Contrôle | Résultat | Preuve |
|---|---|---|
| Simulation : 8 produits, 0 erreur, rien d'écrit | OK | rapport de simulation du 2026-10-24 21:48 |
| Écriture après sauvegarde | OK (sauvegarde `backups/jaellejc-staging-…`, ignorée par git) | rapport `jaellejc-staging-ecriture-2026-10-24T21-51-20.md` |
| Second passage | 0 produit migré, 8 ignorés : aucune réécriture | sortie du second passage |
| Migration du test refaite avec le script corrigé après relecture (2026-10-28) : anciens champs prix/stock supprimés, réglage interne refusé au public | OK | rapport `jaellejc-staging-ecriture-2026-10-28T08-15-37.md` ; `curl` anonyme |
| Produit publié lisible par un visiteur, avec ses variantes | 200 | requête REST anonyme |
| Liste du catalogue sans filtre de statut | 403 | idem |
| Commande, profil, newsletter, contacts, journal d'audit, écriture produit (anonyme) | 403 | idem |
| Commandes converties : centimes, invitée → `userId` null, empreinte de carte supprimée | OK | lecture avec le compte technique |
| Profil : adresse déplacée dans `adresses/principale`, champs restants `createdAt`, `displayName` | OK | idem |
| Journal d'audit : une entrée par produit migré | 8 entrées | idem |

## Anomalies et points à décider

| # | Gravité | Description | Statut |
|---|---|---|---|
| Q1 | Info | Livraison à 0 € (seuil et forfait) en production : livraison gratuite pour toutes les commandes | À confirmer par Jaelle |
| Q2 | Info | Délai de livraison estimé absent de la base | À renseigner (étape 7, réglages) |
| Q3 | Info | Vestes : une seule variante (stock global) ; tailles à créer | Étape 7 (grille de variantes) |
| Q4 | Info | Textes alternatifs des photos vides après migration | Bloquent toute nouvelle publication, pas la vente actuelle (BACKOFFICE.md §6) |
| Q5 | Faible | Stockage des photos non activé sur le test (forfait Blaze requis) | Les photos du test pointent vers celles du site actuel ; activation par Jaelle si besoin |

## Décision

Go pour la vérification par Jaelle. La production n'a pas été modifiée.
