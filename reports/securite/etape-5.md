# Rapport de sécurité — Étape 5 : checkout, Stripe, commandes

Date : 2026-10-29 · Branche : `refonte-next` · Environnement testé : local (`next start` construit, émulateurs Firestore et Authentication, faux serveur Stripe `tests/e2e/fake-stripe.ts`, clés de test tirées au hasard hors du dépôt). Aucun appel à Stripe, aucune vraie clé.

## Périmètre

- `src/server/checkout/` : règles pures (`logic.ts`), création de la session Stripe (`service.ts`), Server Action « Payer » (`actions.ts`).
- `src/server/payments/stripe.ts` : client Stripe serveur, garde-fous (clés de test seulement hors production ; faux serveur seulement en local avec émulateurs).
- `src/server/orders/` : création des commandes par le webhook (`fulfil.ts`), e-mails (`notify.ts`), lecture pour la confirmation (`repository.ts`).
- `src/server/emails/` : modèles (échappement), expéditeur non branché (décision de Jaelle).
- Route `src/app/api/stripe/webhook/route.ts`, page `/commande/confirmation` (noindex, exclue de `robots.txt`).
- Nouvelles collections serveur : `checkouts` (instantané du panier), `stripeEvents` (événements traités). Dépendance ajoutée : `stripe` 20.4.0 (même version que les fonctions actuelles, `npm audit --omit=dev` : 0). CI : faux Stripe et clés aléatoires pour les parcours.

Règles Firestore inchangées : `orders` lisibles par la propriétaire ou l'admin, aucune écriture client ; `checkouts`, `stripeEvents`, `carts` refusés par la règle par défaut (testée en CI, `tests/rules/rules.test.mjs`).

## Contrôles effectués

| Contrôle | Cas testé | Résultat | Preuve |
|---|---|---|---|
| 1. Secrets | Motifs Stripe (`sk_`, `rk_`, `whsec_`), Brevo, Google, JWT dans le diff ; clés CI générées à l'exécution | OK (0) | `grep -E` ; gitleaks en CI |
| 2. Dépendances | `npm audit --omit=dev` ; `--audit-level=high` | 0 ; 0 élevée (5 moyennes, outils de développement) | commandes exécutées |
| 3. Anonyme | « Payer » refusé sans appel à Stripe ; confirmation → connexion | OK | `checkout/actions.test.ts` ; `paiement.spec.ts` « confirmation » |
| 3. Autre cliente | Confirmation d'une commande d'une autre cliente : 404, rien n'est révélé | OK | `paiement.spec.ts` « confirmation » |
| 3. Webhook | Signature absente, fausse, corps modifié : 400 ; événement de production hors production : ignoré | OK | `paiement.spec.ts` |
| 4. Règles | `orders` : aucune écriture client ; `checkouts`/`stripeEvents` refusés | OK | `firestore.rules` ; `rules.test.mjs` (CI) |
| 5. Entrées | Prix, total, lignes ou champs en trop refusés ; message cadeau > 300 refusé ; identifiant de session vérifié | OK | `checkout/logic.test.ts`, `checkout/actions.test.ts` |
| 6. Échappement | Tout texte (noms, adresse, message, téléphone) échappé dans les e-mails ; objet sur une ligne ; message affiché par React | OK | `emails/templates.test.ts` ; `paiement.spec.ts` (`<b>` affiché tel quel) |
| 7. Prix | Stripe reçoit le prix de la base, même modifié après l'ajout ; montant payé vérifié contre l'instantané (montant, devise, cliente) → sinon remboursement | OK | `paiement.spec.ts` « prix modifié », « montant différent » |
| 7. Stock | Vérifié au clic « Payer » (pas de session si une pièce manque) ; décrémenté en transaction, tout ou rien ; dernière pièce payée deux fois → seconde remboursée | OK | `paiement.spec.ts` ; `checkout/logic.test.ts` (`allocate`) |
| 7. Rejeu | Même événement deux fois, ou deux événements pour une session : une commande, un décompte | OK | `paiement.spec.ts` « webhook rejoué » |
| 7. Remboursement | Clé d'idempotence `refund-{session}` ; un seul remboursement ; « déjà remboursé » traité comme fait | OK | `paiement.spec.ts` « dernière pièce » (un remboursement) ; `fulfil.ts` |
| 7. Paiement sans commande | Carte seulement (pas de moyen différé) ; instantané absent → paiement remboursé, anomalie gardée | OK | `paiement.spec.ts` « carte seulement », « sans instantané » |
| 9. Clés | Hors production, clés `sk_test_`/`rk_test_` seulement ; faux serveur refusé sur Vercel ou sans émulateur | OK | `payments/stripe.ts` (relecture) |
| 9. Adresse de retour | Production : `NEXT_PUBLIC_SITE_URL` ; aperçu : `VERCEL_URL` ; local : hôte local seulement (jamais l'en-tête Host en ligne) | OK | `checkout/service.ts` (relecture) |
| 9. Webhook | Taille contrôlée (en-tête puis octets, 512 Ko) avant traitement | OK | `route.ts` |
| 9. Journaux | Messages fixes (type d'événement, nom d'erreur), aucune donnée cliente | OK | `grep console.` |
| 10. Relecture indépendante | Diff relu par un second agent (lecture seule) | 0 Critique, 0 Élevée ; 1 Moyenne, 5 Faibles, 4 Info | relecture du 2026-10-29, ci-dessous |

## Anomalies

| # | Gravité | Description | Comment la reproduire | Correction | Statut |
|---|---|---|---|---|---|
| M1 | Moyenne | Moyens de paiement différés possibles (selon le tableau de bord Stripe) : confirmation après la suppression de l'instantané → paiement encaissé sans commande ni remboursement | Prélèvement SEPA confirmé après 7 jours | Carte seulement ; instantané absent → remboursement automatique et anomalie enregistrée | Corrigé, testé |
| F1 | Faible | Garde-fou « clé de production » limité à `sk_live_` (`rk_live_` passait) | Clé restreinte live hors production | Hors production, clés de test exigées | Corrigé |
| F2 | Faible | Adresses de retour Stripe construites depuis l'en-tête `Host` | — | Adresse fixe (production), `VERCEL_URL` (aperçu), hôte local seulement | Corrigé |
| F3 | Faible | Taille du corps du webhook vérifiée après lecture, en caractères | Gros corps | `content-length` puis octets | Corrigé |
| F4 | Faible | Remboursement fait mais `refund.id` non enregistré : réessai au-delà de 24 h en erreur | Panne entre Stripe et Firestore | « Déjà remboursé » traité comme fait ; marqueur visible dans le back-office | Corrigé ; marqueur → étape 7 |
| F5 | Faible | « Votre paiement est bien reçu » affiché pour une session non payée ou expirée | Ouvrir l'adresse de confirmation sans payer | Texte neutre ; session expirée → 404 | Corrigé, testé |
| I1 | Info | Commande remboursée pour montant : message « pièce trouvé preneur » | — | Texte selon le motif | Corrigé, testé |
| I2 | Info | E-mails non envoyés (expéditeur non choisi) : ni excuses ni alerte boutique ; double envoi possible une fois branché (deux webhooks simultanés) | — | Décision de Jaelle ; réserver chaque e-mail en transaction avant de brancher l'envoi | Ouvert → choix de l'expéditeur |
| I3 | Info | Événement de production hors production non filtré | — | Ignoré si `livemode` ne correspond pas à l'environnement | Corrigé, testé |
| I4 | Info | Retour de Stripe sans session : la référence de la session est perdue (renvoi vers le compte) | — | Accepté (le parcours exige déjà une connexion) ; à revoir à l'étape 6 (liste des commandes) | Ouvert → étape 6 |
| — | Moyenne (étapes 3 et 4) | TTL `carts`, `checkouts` ; réglages Authentication ; App Check | — | Jaelle (console) ; étape 9 | Ouvert |
| — | Critique (héritée) | Clés Brevo dans l'historique public (étape 0, #1) — à traiter avant de brancher Brevo | — | Révocation dans Brevo par Jaelle | Ouvert |

## Dépendances

`npm audit --omit=dev` : 0 vulnérabilité. `npm audit --audit-level=high` : 0 élevée, 5 moyennes (outils de développement, déjà consignées). Ajout justifié : `stripe` 20.4.0 (SDK officiel, même version que `functions/`), indispensable à la création des sessions, à la vérification de signature et aux remboursements.

## Décision

**Go en local et sur le projet de test (mode test Stripe).** Aucune anomalie Critique ou Élevée propre à l'étape. Restent ouverts : envoi des e-mails (I2, choix de l'expéditeur, après révocation des clés Brevo exposées), paiement réel par carte de test (aperçu Vercel ou Stripe CLI), marqueur des remboursements à vérifier (étape 7). Vérifié après corrections : `npm run typecheck`, `npm run lint`, `npm test` (198), parcours 154 réussis / 32 ignorés (mobile, ordinateur, Safari iPhone), parcours de paiement répétés ×3 : 42/42, `npm run test:visual` 24/24.
