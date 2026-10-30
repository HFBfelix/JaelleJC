# Rapport QA — Étape 6 : espace client

Date : 2026-10-30 · Branche : `refonte-next` · Environnement : local (Windows 11, `next start` construit, émulateurs Firestore et Authentication, **faux serveur Stripe local** `tests/e2e/fake-stripe.ts`, clés de test tirées au hasard pour la session, hors du dépôt). Aucun appel n'est parti chez Stripe.

## Ce qui a été livré

- **Mes commandes** (`/compte`) : liste de la plus récente à la plus ancienne (référence, statut, première pièce +N, date, total) ; anciennes commandes migrées affichées avec les 8 premiers caractères de leur identifiant, comme sur l'ancien site.
- **Détail d'une commande** (`/compte/commandes/[id]`) : pièces, montants, emballage cadeau, adresse, suivi du colis (lien https seulement). Commande d'une autre cliente ou inconnue : page introuvable (404).
- **Mes adresses** : ajout, modification, suppression (France, code postal à 5 chiffres, 10 adresses au plus). Enregistrées seulement à la demande de la cliente, jamais après un paiement (décision de Jaelle, 2026-10-30).
- **Préremplissage du paiement** : sur `/panier`, « Livrer à » propose les adresses complètes (la première par défaut) et « Une autre adresse (saisie au paiement) ». L'adresse choisie est portée par un client Stripe du compte, que la page Stripe préremplit (toujours modifiable).
- **Mes données** : « Télécharger mes données » (fichier JSON : compte, profil, adresses, commandes, messages de contact et newsletter liés à l'e-mail) ; « Supprimer mon compte » (case de confirmation, connexion de moins de 10 minutes).
- **Suppression du compte** : client Stripe, adresses, profil, panier et compte supprimés ; commandes gardées (obligation comptable de 10 ans) mais détachées du compte (décision de Jaelle, 2026-10-30). Refusée si une commande est payée, en préparation ou expédiée, ou si un paiement a été ouvert il y a moins de 30 minutes. Page `/compte/supprime`.
- Correction de l'étape 4 : le lien « Me reconnecter » renvoyait au compte sans redemander la connexion (la page de connexion redirigeait toute session ouverte). Nouveau mode `/connexion?info=reconnexion`.

Textes : `EDITORIAL.md` ne prévoit rien pour le compte ; textes sobres écrits pour l'étape, **à relire par Jaelle** (liste ci-dessous).

## Vérification visuelle

| # | Page | Capture |
|---|---|---|
| V1 | Mon compte (commandes, adresses, mot de passe, mes données) | `reports/qa/etape-6/compte-ordinateur.png`, `compte-mobile.png` |
| V2 | Détail d'une commande expédiée avec suivi | `commande-ordinateur.png`, `commande-mobile.png` |
| V3 | Panier avec « Livrer à » | `panier-adresse-ordinateur.png`, `panier-adresse-mobile.png` |

Pages existantes : `npm run test:visual` **24/24** (aucun changement visuel). Typographie Atelier, aucun texte sous 11 px, aucune italique, lignes de 0,5 px, aucune couleur ajoutée.

## Parcours testés (`tests/e2e/compte.spec.ts`, mobile et ordinateur)

| Parcours | Résultat | Preuve |
|---|---|---|
| Anonyme : `/compte` et le détail d'une commande renvoient à la connexion | OK | « anonyme » |
| La cliente voit ses commandes (ancienne comprise), la plus récente d'abord, jamais celle d'une autre ; détail avec lignes et lien de suivi ; commande d'une autre, inconnue ou identifiant piégé (`../..`) → 404 | OK | « commandes » |
| Adresse ajoutée, modifiée, supprimée ; rangée sous `users/{uid}/adresses` avec exactement les champs prévus (`country: 'FR'` imposé par le serveur) | OK | « adresses » |
| `/connexion?info=reconnexion` s'affiche avec une session ouverte ; sans ce mode, retour direct au compte | OK | « reconnexion » |
| Export : fichier `mes-donnees-jaelle-jc.json` avec le compte, les adresses et les seules commandes de la cliente | OK | « export » |
| Suppression refusée avec une commande en préparation ; le compte existe toujours | OK | « suppression refusée » |
| Suppression : compte, profil, adresses, panier effacés ; commande gardée avec `userId: null` et `customer.uid: null` ; session fermée | OK | « suppression » |
| Adresse choisie → session Stripe avec `customer` (pas d'e-mail en double), client Stripe prérempli (nom, rue, code postal, ville, pays, uid en métadonnée), prix toujours lu en base ; deuxième paiement → même client mis à jour ; « Une autre adresse » → aucun client, e-mail seulement ; suppression refusée tant qu'un paiement a moins de 30 minutes, puis client Stripe supprimé | OK | « préremplissage » (ordinateur) |

Commandes : `npx playwright test tests/e2e/compte.spec.ts --project=ordinateur --project=mobile` → **15 réussis**, 1 ignoré (préremplissage limité à « ordinateur »). Suite complète sur trois navigateurs (mobile, ordinateur, Safari iPhone) → **169 réussis**, 41 ignorés, 0 échec. Firefox : CI.

## Tests automatiques

`npm test` : **239** tests, tous verts, dont `src/server/account/logic.test.ts` (adresses invalides : code postal, champ inconnu, pays imposé, identifiant de chemin, uid fourni ; conditions de suppression), `src/server/account/actions.test.ts` (anonyme refusé partout ; entrée trafiquée refusée avant la base ; uid lu dans la session ; reconnexion exigée ; cookie retiré après suppression) et `src/server/orders/view.test.ts` (ancienne commande, statut inconnu, montants non entiers, liens de suivi `javascript:`/`http:` retirés). `npm run typecheck` et `npm run lint` : propres.

Règles : `tests/rules/rules.test.mjs` **102/102** (nouveaux cas : `checkouts` et `stripeCustomers` inaccessibles à tous les appelants, propriétaire comprise), lancé sur un projet d'émulateur distinct pour ne pas vider les données locales.

## Textes à relire par Jaelle

« Mes commandes », « Aucune commande pour le moment. », statuts (Payée, En préparation, Expédiée, Livrée, Remboursée, Annulée), « Mes adresses », « Ajouter une adresse », « Nom de l'adresse (optionnel) — Par exemple : Maison, Grands-parents. », « Livraison en France uniquement. », « Livrer à », « Une autre adresse (saisie au paiement) », « Mes données », « Téléchargez tout ce que nous gardons sur vous : compte, adresses, commandes, messages. », « Télécharger mes données », « Supprimer mon compte » et son avertissement, « Votre compte est supprimé. », messages d'erreur (session expirée, commande en cours, paiement commencé).

## Points ouverts

| # | Point | Qui |
|---|---|---|
| Q1 | Relire les textes ci-dessus | Jaelle |
| Q2 | Vérifier l'espace client sur l'aperçu Vercel (bloqué tant que `FIREBASE_SERVICE_ACCOUNT` n'est pas posé dans Vercel Preview) | Jaelle |
| Q3 | Préremplissage avec la vraie page Stripe (mode test) : à voir sur l'aperçu, le faux Stripe ne montre pas la page | Jaelle / étape 9 |
