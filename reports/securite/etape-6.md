# Rapport de sécurité — Étape 6 : espace client

Date : 2026-10-30 · Branche : `refonte-next` · Environnement testé : local (`next start` construit, émulateurs Firestore et Authentication, faux serveur Stripe `tests/e2e/fake-stripe.ts`, clés de test tirées au hasard hors du dépôt). Aucun appel à Stripe, aucune vraie clé, aucune donnée de production.

## Périmètre

- `src/server/account/` : règles pures (`logic.ts`), carnet d'adresses (`addresses.ts`), export et suppression du compte (`data.ts`), Server Actions (`actions.ts`).
- `src/server/orders/view.ts` (présentation, pure) et `history.ts` (lecture des commandes de la seule propriétaire).
- `src/server/payments/customers.ts` : client Stripe du compte (adresse préremplie), suppression chez Stripe.
- `src/server/checkout/` : nouvelle entrée `addressId` (identifiant seulement, adresse relue en base chez la cliente).
- Pages `/compte`, `/compte/commandes/[id]`, `/compte/supprime` (noindex) ; `/panier` (choix de l'adresse) ; `/connexion?info=reconnexion` (correction de l'étape 4).
- Nouvelle collection serveur `stripeCustomers/{uid}` (identifiant du client Stripe). Aucune nouvelle dépendance. `firestore.rules` : adresses en lecture seule pour le navigateur (M1).

## Contrôles effectués

| Contrôle | Cas testé | Résultat | Preuve |
|---|---|---|---|
| 1. Secrets | Motifs Stripe, Brevo, Google, JWT, clé privée dans le diff | OK (0) | `git diff \| grep -E …` ; gitleaks en CI |
| 2. Dépendances | `npm audit --omit=dev` ; `--audit-level=high` | 0 ; 0 élevée (5 moyennes, outils de dév., déjà consignées) | commandes exécutées |
| 3. Anonyme | Les 4 actions refusées sans toucher la base ; `/compte` et le détail → connexion | OK | `account/actions.test.ts` « anonyme » ; `compte.spec.ts` « anonyme » |
| 3. Autre cliente | Détail d'une commande d'une autre cliente, inconnue ou identifiant piégé (`../..`) : 404 identique ; liste et export sans ses commandes | OK | `compte.spec.ts` « commandes », « export » |
| 3. Autre cliente (adresses) | uid toujours lu dans la session ; `uid` ou `../` dans l'entrée refusés ; adresse de paiement relue sous `users/{uid}` de la session | OK | `account/actions.test.ts`, `account/logic.test.ts`, `checkout/actions.test.ts` |
| 3. Administratrice | Aucune action nouvelle réservée à l'admin ; l'admin passe par les mêmes règles que toute cliente pour son propre compte | — | relecture |
| 4. Règles | `checkouts` et `stripeCustomers` refusés à tous (propriétaire comprise) ; `orders`, `users`, `adresses` : tests existants | OK (102/102) | `tests/rules/rules.test.mjs` |
| 5. Entrées | Adresse : code postal, longueurs, champ inconnu, pays imposé par le navigateur, identifiants hors format ; suppression sans confirmation | OK | `account/logic.test.ts`, `account/actions.test.ts` |
| 6. Échappement | Textes affichés par React ; lien de suivi : `https:` seulement (`javascript:` et `http:` retirés), `rel="noopener noreferrer"` | OK | `orders/view.test.ts` |
| 7. Prix | Avec une adresse choisie, Stripe reçoit toujours le prix de la base ; aucun prix venant du navigateur | OK | `compte.spec.ts` « préremplissage » |
| 7. Paiement et suppression | Suppression refusée si une commande est payée, en préparation ou expédiée, ou si un paiement a moins de 30 minutes ; instantanés non traités gardés (webhook tardif) | OK | `account/logic.test.ts` ; `compte.spec.ts` « suppression refusée », « préremplissage » |
| 8. Abus | 5 adresses au plus (transaction ; écriture du navigateur fermée par les règles) ; client Stripe unique par compte (doublon supprimé aussitôt) | OK | `compte.spec.ts` « 5 au plus » ; `rules.test.mjs` ; `customers.ts` (relecture) |
| 9. Sessions | Suppression : connexion de moins de 10 minutes ; cookie retiré ; compte supprimé → toutes les sessions refusées (`verifySessionCookie` avec révocation) | OK | `account/actions.test.ts` ; `compte.spec.ts` « suppression » (retour à la connexion) |
| 9. Reconnexion | `info=reconnexion` n'affiche qu'un message fixe ; retour toujours filtré par la liste fermée `safeReturn` (pas de redirection ouverte) | OK | `compte.spec.ts` « reconnexion » ; `auth/policy.test.ts` |
| 9. Journaux | Messages fixes, sans e-mail ni adresse | OK | `grep console.` |
| 9. CSRF | Server Actions (contrôle d'origine de Next), cookie SameSite=Lax ; export rendu par une action, pas par une adresse GET | OK | relecture |
| RGPD | Export : compte, profil, adresses, commandes (avec e-mail et téléphone gardés), messages, newsletter ; suppression : client Stripe, adresses, profil, panier, compte ; commandes détachées (`userId`, `customer.uid`, `legacy.userId`) | OK | `compte.spec.ts` « export », « suppression », « préremplissage » |
| 10. Relecture indépendante | Diff relu par un second agent (lecture seule) | 0 Critique, 0 Élevée ; 1 Moyenne, 3 Faibles, 3 Info | relecture du 2026-10-30, ci-dessous |

## Règles Firestore / Storage testées

| Collection | Appelant | Action | Attendu | Obtenu |
|---|---|---|---|---|
| `stripeCustomers` | anonyme, cliente propriétaire, autre cliente, fausse admin, admin | lecture, écriture | refusé | refusé |
| `checkouts` | idem | lecture, écriture | refusé | refusé |
| `users/{uid}/adresses` | cliente propriétaire | lecture | permis | permis |
| `users/{uid}/adresses` | anonyme, autre cliente, fausse admin | lecture | refusé | refusé |
| `users/{uid}/adresses` | tous, propriétaire et admin compris | création, modification, suppression | refusé | refusé |
| `orders`, `users` | tests existants (étape 1bis) | — | inchangé | OK |

## Anomalies

| # | Gravité | Description | Comment la reproduire | Correction | Statut |
|---|---|---|---|---|---|
| M1 | Moyenne | Les règles laissent la propriétaire écrire directement dans `users/{uid}/adresses` (SDK client ou API REST avec son jeton) : plafond et validation Zod contournés ; pendant ~1 h après la suppression du compte, le jeton encore valable permet de recréer des adresses orphelines | Écrire 600 adresses avec le SDK client | Code : suppression par lots successifs, sans limite de nombre (`bulkWriter`), compte supprimé seulement si tout a réussi. Règles : fermer l'écriture client sur `adresses` (tout passe déjà par le serveur) et adapter les tests — règles : adresses lues par la propriétaire, `allow write: if false` (feu vert de Jaelle, 2026-10-30), publiées sur le projet de test | Corrigé, testé (`rules.test.mjs` 109/109) |
| F1 | Faible | Webhook en retard (> 30 min) : l'instantané effacé à la suppression du compte → paiement remboursé sans explication | Paiement à la 29e minute, webhook en échec, suppression | Seuls les instantanés `traite` ou `expire` sont effacés ; les autres disparaissent par TTL (7 jours) | Corrigé |
| F2 | Faible | Deux « Payer » simultanés : deux clients Stripe, le premier resterait chez Stripe après la suppression du compte | Double clic dans deux onglets | Réservation en transaction : le doublon est supprimé chez Stripe aussitôt | Corrigé |
| F3 | Faible | Paiement lancé pendant la suppression (même cliente) : client Stripe recréé après | Suppression et paiement dans deux onglets | Client Stripe purgé de nouveau après la suppression du compte | Corrigé |
| I1 | Info | Export sans l'e-mail ni le téléphone gardés dans les commandes | — | Ajoutés (`contact`) | Corrigé, testé |
| I2 | Info | Contacts et newsletter : recherche sur l'e-mail en minuscules (anciens documents en casse mixte absents de l'export) ; gardés à la suppression du compte (la newsletter a son propre consentement) | — | Choix à confirmer par Jaelle ; normalisation à la migration | Ouvert → Jaelle |
| I3 | Info | Au-delà de 200 commandes, certaines resteraient rattachées à l'uid supprimé | — | Accepté (irréaliste pour la boutique) | Accepté |
| I4 (étape 5) | Info | Retour de Stripe sans session : la commande se retrouve maintenant dans « Mes commandes » | — | Liste des commandes | Corrigé |
| — | Critique (héritée) | Clés Brevo dans l'historique public (étape 0, #1) | — | Révocation dans Brevo par Jaelle | Ouvert |

## Dépendances

`npm audit --omit=dev` : 0 vulnérabilité. `npm audit --audit-level=high` : 0 élevée, 5 moyennes (outils de développement, déjà consignées). Aucune dépendance ajoutée.

## Décision

**Go en local et sur le projet de test.** Aucune anomalie Critique ou Élevée propre à l'étape. Reste ouvert : I2 (choix pour les contacts et la newsletter). Vérifié après corrections : `npm run typecheck`, `npm run lint`, `npm test` (239), règles 109/109, parcours 169 réussis / 41 ignorés / 0 échec (mobile, ordinateur, Safari iPhone), `npm run test:visual` 24/24.
