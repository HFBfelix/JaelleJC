# Rapport de sécurité — Étape 7 : espace créatrice

Date : 2026-10-30 · Branche : `refonte-next` · Environnement testé : local (`next start` construit, émulateurs Firestore, Authentication, Storage ; faux serveurs Stripe et IA ; clés de test aléatoires hors du dépôt). Aucune donnée ni clé de production.

## Périmètre

- `src/server/createur/` : règles pures (`logic.ts`), produits, variantes, photos, publication, journal (`products.ts`), brouillon IA (`ai.ts`), commandes et stocks (`orders.ts`), tableau de bord, catégories, réglages, messages (`site.ts`), Server Actions (`actions.ts`, `orders-actions.ts`, `site-actions.ts`).
- `src/server/firebase/storage.ts` (Admin SDK) ; route `src/app/api/createur/photos` (envoi de photo).
- Pages `src/app/createur/(espace)/**` (layout avec `requireAdmin`) et `src/app/createur/apercu/[id]` ; composants `src/components/createur/**` ; `src/lib/resize-image.ts`.
- `ProductDetail.tsx` (corps de la fiche publique partagé) ; `SiteLayout.tsx` (pas de gabarit du site pour l'espace créatrice).
- Nouvelles collections serveur : `aiQuota` (quota du brouillon IA, TTL `expiresAt`) ; `auditLog` désormais alimenté. Nouveau champ produit `usages`. Aucune dépendance ajoutée (OpenAI appelé par `fetch`).
- `functions/src/index.ts` : `onProductAdded` retirée.

## Contrôles effectués

| Contrôle | Cas testé | Résultat | Preuve |
|---|---|---|---|
| 1. Secrets | Motifs de clés dans le diff ; clés de test générées à l'exécution, hors du dépôt | OK (0) | `git diff \| grep -E …` ; gitleaks en CI |
| 2. Dépendances | `npm audit --omit=dev` | 0 vulnérabilité ; aucune dépendance ajoutée | commande exécutée |
| 3. Anonyme, cliente, droit retiré | Pages et aperçu → connexion dédiée ; 20 Server Actions → « connexion » sans toucher la base ; route photo → 401 | OK | `createur/*.test.ts` ; `createur-*.spec.ts` |
| 3. Administratrice | Droit relu sur le compte à chaque page et chaque action (revendication, e-mail vérifié, compte actif) ; autrice = uid de la session | OK | `session.ts` ; `actions.test.ts` |
| 4. Règles | Aucune écriture du navigateur dans `produits`/`variantes`, admin comprise ; `aiQuota`, `auditLog`, `checkouts`, `stripeCustomers` fermés à tous | OK (109/109) | `tests/rules/rules.test.mjs` |
| 5. Entrées | Zod strict partout (`strictObject`) : statut « publié » forcé, stock dans la fiche, prix ou stock négatifs, identifiants avec `/` ou `..`, numéro de suivi piégé, lien non https refusés | OK | `logic.test.ts`, `actions.test.ts`, `orders.test.ts`, `site.test.ts` |
| 5. Photos | Type réel lu dans les premiers octets (JPEG, PNG, WebP ; SVG, HTML, PDF refusés), 4 Mo au plus, nom aléatoire, type fixé par le serveur, 12 au plus (en transaction), GPS retiré par le réencodage ; suppression seulement sous `produits/<id>/` | OK | `logic.test.ts` ; « fiche guidée » ; relecture |
| 6. Échappement | Textes rendus par React (aucun HTML injecté) ; lien de suivi https vérifié à la saisie et à l'affichage ; export CSV : formules neutralisées (`= + - @`, tabulation, retour chariot) | OK | `site.test.ts` ; `createur-site.spec.ts` |
| 7. Prix | Prix et frais de livraison en centimes entiers bornés ; changement de prix d'une pièce en ligne et des frais de livraison journalisés (avant/après) | OK | « réglages » ; `auditLog` |
| 7. Stock | Stock attendu comparé dans la même transaction que l'écriture : une vente (webhook) n'est jamais écrasée ; variante retirée désactivée, jamais supprimée | OK | « stock » (fiche et tableau) |
| 7. Publication | Liste de contrôle et schéma public rejoués côté serveur **dans la transaction** de publication ; pièce en ligne jamais rendue incomplète (champs, dernière photo, texte alternatif) | OK | « fiche guidée » ; relecture |
| 7. Commandes | Transitions en transaction, sans retour en arrière ; « expédiée » seulement avec un suivi valide ; aucun remboursement ni création de commande ici | OK | `orders.test.ts` ; `createur-commandes.spec.ts` |
| 8. Abus | Brouillon IA : clic seulement, quota de 10 par heure en transaction, faits seuls (aucune donnée de compte envoyée), réponse validée ; route photo : même origine exigée, taille contrôlée avant lecture | OK | « fiche guidée » ; route |
| 9. Corps des requêtes | Limite des Server Actions laissée à 1 Mo pour tout le site ; seule la route photo accepte 4 Mo | OK | `next.config.ts` ; route |
| 9. Journaux | Libellés fixes, aucun contenu saisi | OK | `actions.test.ts` « journal sans contenu » |
| 9. Faux serveurs | IA et Storage de test refusés sur Vercel ou sans émulateurs | OK | `ai.ts`, `storage.ts` |
| 10. Relecture indépendante | Diff relu par un second agent (lecture seule) | 0 Critique, 0 Élevée, 0 Moyenne ; 4 Faibles (corrigées), 4 Info | relecture du 2026-10-30, ci-dessous |

## Règles Firestore / Storage testées

| Collection | Appelant | Action | Attendu | Obtenu |
|---|---|---|---|---|
| `produits`, `produits/*/variantes` | tous, admin comprise | création, modification, suppression | refusé | refusé |
| `aiQuota`, `auditLog` | tous | lecture, écriture | refusé | refusé |
| `settings/delivery` | tous | modification | refusé | refusé |
| Storage `produits/` | non-admins | envoi, suppression | refusé | refusé (tests de l'étape 1bis) |

## Anomalies

| # | Gravité | Description | Comment la reproduire | Correction | Statut |
|---|---|---|---|---|---|
| F1 | Faible | Limite de corps des Server Actions relevée à 4,4 Mo pour tout le site (formulaires publics compris) | Envoyer 4 Mo à une action publique | Limite globale laissée à 1 Mo ; envoi de photo par une route admin dédiée (même origine, taille contrôlée) | Corrigé, testé |
| F2 | Faible | Publication : lecture puis écriture hors transaction (photo retirée dans un autre onglet entre les deux) | Deux onglets | Liste de contrôle rejouée dans la transaction | Corrigé |
| F3 | Faible | Catégories : contrôle « famille utilisée » limité aux 10 premières familles retirées | Retirer plus de 10 familles d'un coup | Contrôle par paquets de 10 | Corrigé |
| F4 | Faible | CSV : retour chariot isolé non aplati, ni neutralisé en tête de cellule | Message commençant par `\r` | Aplati et neutralisé | Corrigé, testé |
| I1 | Info | Un anonyme reçoit « invalide » ou « connexion » selon la forme de sa requête | — | Accepté (aucune donnée exposée) | Accepté |
| I2 | Info | Photos d'un brouillon lisibles par quiconque a leur adresse (UUID et jeton non devinables), conforme à la lecture publique de `produits/` | — | Accepté | Accepté |
| I3 | Info | PNG ou WebP envoyés hors de l'espace créatrice (qui réencode) gardés tels quels | Admin seulement | Accepté (réencodage serveur = nouvelle dépendance) | Accepté |
| I4 | Info | Purge de `aiQuota` : politique TTL à créer | — | Console, projet de test puis production | Ouvert → Jaelle |
| — | Critique (héritée) | Clés Brevo dans l'historique public (étape 0, #1) | — | Révocation dans Brevo par Jaelle | Ouvert |

## Dépendances

`npm audit --omit=dev` : 0 vulnérabilité. Aucune dépendance ajoutée.

## Décision

**Go en local et sur le projet de test.** Aucune anomalie Critique, Élevée ou Moyenne propre à l'étape. Vérifié après corrections : `npm run typecheck`, `npm run lint`, `npm test` (303), règles 109/109, parcours 175 réussis / 62 ignorés (+ 19/19 relancés après une mise en veille), `npm run test:visual` 24/24. Reste à faire par Jaelle : vérification de bout en bout sur le projet de test (Q1), stockage Firebase du test (Blaze), clé OpenAI de l'aperçu, TTL `aiQuota`.
