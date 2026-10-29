# Rapport QA — Étape 5 : checkout, Stripe, commandes

Date : 2026-10-29 · Branche : `refonte-next` · Environnement : local (Windows 11, `next start` construit, émulateurs Firestore et Authentication, **faux serveur Stripe local** `tests/e2e/fake-stripe.ts` ; clés de test tirées au hasard pour la session, hors du dépôt). Aucun appel n'est parti chez Stripe.

## Périmètre

- « Confirmer et payer » (page panier, cliente connectée) : le serveur relit panier, prix, stock et livraison ; stock insuffisant → paiement refusé, panier corrigé, message ; sinon session Stripe Checkout (prix lus en base, adresse en France et téléphone demandés par Stripe, livraison selon `settings/delivery`), instantané `checkouts/{session}` pour le webhook.
- Option **Emballage cadeau** (gratuite, décision de Jaelle du 2026-10-29) et **Un mot pour la naissance (optionnel)**, 300 caractères.
- Webhook `/api/stripe/webhook` : signature vérifiée sur le corps brut ; commande créée seulement à `checkout.session.completed` (ou `async_payment_succeeded`) payée ; idempotent (événements traités + identifiant de commande = session) ; stock décrémenté en transaction, tout ou rien ; panier du compte vidé des pièces achetées ; stock insuffisant ou montant inattendu → commande « remboursée », remboursement Stripe automatique (clé d'idempotence).
- Page `/commande/confirmation` : lit la commande, ne crée rien ; « Merci. Votre pièce est en préparation. », référence `JJC-AAMMJJ-XXXX` ; en attente du webhook : « Votre paiement est bien reçu… » ; remboursée : excuses.
- E-mails préparés (confirmation, excuses, alerte boutique à contact@jaellejc.com) mais **pas envoyés** : expéditeur à choisir par Jaelle ; chaque commande garde ses e-mails « en_attente ».

## Changements visibles voulus

| # | Changement | Raison |
|---|---|---|
| V1 | Page panier : case « Emballage cadeau », champ « Un mot pour la naissance (optionnel) », bouton « Confirmer et payer » actif, « Paiement sécurisé par Stripe » | PLAN.md étape 5, EDITORIAL.md §5 |
| V2 | Tiroir : « Confirmer et payer » mène à la page panier (option cadeau) | Une seule page de paiement |
| V3 | Page de confirmation | Lecture de la commande en base |

Captures : `reports/qa/etape-5/` (page panier avec l'option cadeau, mobile et ordinateur). Pages existantes : `npm run test:visual` **24/24**.

## Parcours testés (ordinateur ; ils décomptent le stock du jeu partagé, un seul navigateur)

| Parcours | Résultat | Preuve |
|---|---|---|
| Paiement réussi : Stripe reçoit le prix de la base, l'e-mail et l'identifiant de la cliente, l'identifiant du panier ; aucune commande avant le webhook ; commande créée (adresse, cadeau, référence), stock −1, panier vidé, confirmation affichée, badge à 0 | OK | `tests/e2e/paiement.spec.ts` |
| Webhook rejoué, ou second événement pour la même session : une seule commande, stock décompté une fois | OK | idem |
| Signature absente, fausse, corps modifié : 400, rien n'est créé | OK | idem |
| Paiement non abouti (`unpaid`) : aucune commande ; la confirmation attend | OK | idem |
| Montant payé différent du panier : commande remboursée automatiquement, stock intact, « Votre commande n'a pas pu aboutir. » | OK | idem |
| Carte seulement : aucun moyen de paiement différé proposé | OK | idem |
| Paiement sans instantané du panier : aucune commande inventée, paiement remboursé, anomalie gardée | OK | idem |
| Événement de production reçu hors production : ignoré | OK | idem |
| Session expirée : plus de page d'attente (404) | OK | idem |
| Dernière pièce payée par deux clientes : la première a sa commande, la seconde est remboursée (un seul remboursement, clé d'idempotence) et voit « Votre pièce a trouvé preneur. » | OK | idem |
| Pièce vendue pendant que la page panier est ouverte : paiement refusé au clic, message, aucune session Stripe créée, panier corrigé | OK | idem |
| Prix modifié en base après l'ajout : Stripe reçoit le nouveau prix | OK | idem |
| Livraison : forfait du réglage sous le seuil, offerte sinon | OK | idem |
| Confirmation d'une autre cliente : 404 ; anonyme : renvoyée à la connexion | OK | idem |
| Parcours des étapes 1 à 4 (catalogue, consentement, socle, panier, connexion), Chrome mobile, Chrome ordinateur, Safari iPhone | OK | `tests/e2e/*.spec.ts` |

Commandes : suite complète sur trois navigateurs → **154 réussis**, 32 ignorés (paiement et panier limités à « ordinateur »), après les corrections de la relecture de sécurité ; parcours de paiement répétés ×3 (un à la fois) → **42/42**. Firefox : CI.

Anomalies trouvées par les tests et corrigées : (1) pièce vendue entre l'affichage du panier et le clic « Payer » : le message affiché était « Votre sélection est vide. » au lieu de « Cette pièce vient de trouver preneur… » ; (2) ce message pouvait disparaître quand le panier se vidait (il est désormais porté par le panier).

## Tests unitaires

`npm test` : **198** tests, tous verts, dont `src/server/checkout/logic.test.ts` (entrée « Payer » : prix, lignes ou champs en trop refusés ; contrôle du stock ; montants ; lignes Stripe ; décompte tout ou rien ; panier après achat ; commande figée ; montant, devise et cliente vérifiés), `src/server/checkout/actions.test.ts` (anonyme refusé ; entrée trafiquée refusée sans appel à Stripe) et `src/server/emails/templates.test.ts` (échappement de tout texte, objet sur une ligne, motifs d'excuses).

## Points ouverts

| # | Sujet | Suite |
|---|---|---|
| Q1 | Envoi des e-mails : expéditeur à choisir (Brevo après remplacement des clés exposées, ou autre) ; les commandes gardent leurs e-mails « en_attente » pour un envoi ultérieur | Jaelle |
| Q2 | Paiement réel avec une carte de test Stripe : impossible sans clés de test Stripe et sans réception des webhooks (aperçu Vercel ou Stripe CLI) ; testé ici avec un faux serveur Stripe et des événements signés | Après l'aperçu Vercel |
| Q3 | Politique TTL sur `checkouts.expiresAt` (comme `carts.expiresAt`) | Jaelle, console Google |
| Q4 | Case à cocher native (coins légèrement arrondis selon le navigateur) | Étape 9 (finitions) si gênant |
| Q5 | Délai de livraison et durée du lien (« [à confirmer] » dans EDITORIAL.md) non affichés | Étape 8 |
