# Rapport de sécurité — Étape 0 : correctifs urgents (livraison A)

Date : 2026-10-24 · Branche : `hotfix` (depuis `main` eb54d84) · Commit testé : 4e03ee4 · Environnement testé : local (émulateurs Firebase, projet fictif `demo-jaellejc`). Staging pas encore créé.

## Périmètre

Livraison A de l'étape 0 (la livraison B — filtre « produits en ligne », règle de lecture des brouillons, refus de payer un brouillon — viendra après publication des produits par Jaelle).

- `.gitignore` : `.env.local`, `.firebase/`, `.DS_Store` retirés du suivi git.
- `src/pages/Auth.tsx` : import `useEffect` manquant (page `/login` cassée), formulaire de nouveau mot de passe.
- `src/App.tsx`, `src/pages/createur/Dashboard.tsx` : `/createur` accessible, message si compte non autorisé.
- `storage.rules` : envoi et suppression des photos réservés à l'admin ; JPEG/PNG/WebP, < 10 Mo.
- `firestore.rules` : admin à e-mail vérifié ; `contacts` et `newsletter` en création validée (champs, types, longueurs, horodatage serveur).
- `functions/src/checkout.ts`, `functions/src/index.ts` (`createStripeCheckout`), `src/pages/Checkout.tsx` : le navigateur n'envoie que `productId` + quantité ; prix, stock et livraison relus en base, en centimes ; adresse de retour Stripe choisie par le serveur (`ALLOWED_ORIGINS`, sans valeur par défaut).
- `functions/src/escape.ts`, `functions/src/index.ts` : échappement HTML de tout texte client dans les e-mails ; référence de commande assainie.
- `src/lib/firebase.ts`, `index.html` : Firebase Analytics et gtag seulement après « Tout accepter » ; retrait du script SumUp et de Stripe.js (chargés sur chaque page, inutilisés).
- `src/pages/Contact.tsx` : écrit dans `contacts` (et non plus `messages`).
- Outillage local : émulateurs, données fictives, tests des règles.

## Contrôles effectués

| Contrôle | Cas testé | Résultat | Preuve |
|---|---|---|---|
| 1. Secrets dans le diff | Motifs sk_live/sk_test/rk_/whsec_/xkeysib-/sk-/AIza/clé privée dans `git diff main..hotfix` | OK : seule correspondance = ligne `VITE_FIREBASE_API_KEY` **retirée** (clé web publique) | Recherche `Select-String` sur le diff ; relecture indépendante |
| 1. Secrets dans l'historique | Mêmes motifs sur les 45 commits de toutes les branches | **KO** : 2 clés Brevo distinctes (anomalie #1) | `git grep` sur `git rev-list --all`, empreintes SHA-256 sans affichage des valeurs |
| 2. Dépendances | `npm audit --omit=dev` après `npm audit fix` (sans `--force`) + `overrides` form-data 2.5.6 | Fonctions : 0 critique, 0 élevée. Site : 6 élevées (firebase 10, accepté, anomalie #4) | Commit 2a79147 |
| 3. Autorisations (paiement) | Prix modifié côté client, nom forcé, produit inexistant, archivé | OK | `npm --prefix functions test` (32/32) |
| 4. Règles Firestore/Storage | Voir tableau ci-dessous | OK (39/39) | `npm run test:rules` |
| 5. Entrées | Quantités négative/nulle/décimale/énorme/texte, identifiant avec chemin/HTML/trop long, panier vide/absent/null, >30 lignes, doublons > plafond, e-mail invalide ; contacts/newsletter malformés | OK | `functions/src/checkout.test.ts`, `tests/rules/rules.test.mjs` |
| 6. Échappement | `<script>`, `<img onerror>`, `&`, guillemets, multiligne ; référence de commande réduite à `[A-Z0-9]` | OK | `functions/src/escape.test.ts` ; relecture |
| 7. Prix et stock | Stock insuffisant, absent, NaN, texte, 0, négatif ; prix absent/0/négatif/texte ; livraison relue, gratuite au seuil, refus si forfait absent/invalide | OK | `functions/src/checkout.test.ts` |
| 7. Adresse de retour | Origine non autorisée → origine par défaut du projet | OK | test « adresse de retour » |
| 8. Abus | Contacts/newsletter : champs et tailles limités. App Check, limitation de débit : prévus étape 9 | Partiel (prévu) | règles + tests |
| 9. Traceurs avant consentement | « Continuer sans accepter » : aucun `gtag`, aucune requête Analytics, aucun Stripe.js | OK | Navigateur local, `performance.getEntriesByType` ; build : 0 occurrence `js.stripe.com` |
| 9. Logs | Erreur Stripe : seulement `type`, `code`, `requestId` (plus d'e-mail client) | OK | relecture `functions/src/index.ts` |
| 9. Code local absent du site publié | `127.0.0.1:8080`, `demo-jaellejc` dans `dist/` | OK (0) | `npm run build` + recherche |
| 10. Relecture par un second agent | `git diff main..hotfix` | Go ; 2 Moyennes + 5 Faibles, toutes corrigées (commits 6111d07, 6dc7035) | rapport de relecture, ci-dessous |

## Règles Firestore / Storage testées

Émulateur, `npm run test:rules` : 39 tests, 39 réussis.

| Collection | Appelant | Action | Attendu | Obtenu |
|---|---|---|---|---|
| Storage `produits/` | anonyme | lire | autorisé | autorisé |
| Storage `produits/` | anonyme | envoyer | refusé | refusé |
| Storage `produits/` | client (e-mail vérifié) | envoyer / supprimer | refusé | refusé |
| Storage `produits/` | admin | envoyer JPEG / supprimer | autorisé | autorisé |
| Storage `produits/` | admin | envoyer SVG, HTML, > 10 Mo | refusé | refusé |
| Storage `produits/` | admin e-mail non vérifié | envoyer | refusé | refusé |
| Storage `produits/` | autorisation `actif: false` | envoyer / supprimer | refusé | refusé |
| Storage hors `produits/` | admin | envoyer | refusé | refusé |
| `produits` | anonyme / client | écrire | refusé | refusé |
| `produits` | admin | écrire | autorisé | autorisé |
| `produits`, `settings` | admin e-mail non vérifié | écrire | refusé | refusé |
| `produits` | autorisation `actif: false` | écrire | refusé | refusé |
| `settings` | client | écrire | refusé | refusé |
| `users/{autre}` | client | lire / écrire | refusé | refusé |
| `users/{soi}` | client | lire | autorisé | autorisé |
| `contacts` | anonyme | créer (champs du formulaire) | autorisé | autorisé |
| `contacts` | anonyme | créer : champ en trop, trop long/court, non textuel, e-mail invalide, nom trop long, date client, statut forcé, message absent | refusé | refusé |
| `contacts` | anonyme | lire | refusé | refusé |
| `messages` (ancienne) | anonyme | créer | refusé | refusé |
| `newsletter` | anonyme | créer (pied de page, page dédiée) | autorisé | autorisé |
| `newsletter` | anonyme | créer : e-mail invalide/trop long, source inconnue, champ en trop | refusé | refusé |
| `newsletter` | anonyme | lire | refusé | refusé |
| `orders` | anonyme | créer | refusé | refusé |
| `orders` | client | lire | refusé | refusé |

Non testé à dessein (inchangé, compatibilité avec l'ancien code jusqu'aux étapes 4-5) : création de `orders` par un client connecté, lecture publique de `autorisations`, lecture publique des brouillons (`produits`, livraison B).

## Anomalies

| # | Gravité | Description | Comment la reproduire | Correction | Statut |
|---|---|---|---|---|---|
| 1 | **Critique** (antérieure à la refonte) | Deux clés API Brevo (`xkeysib-…`) présentes dans l'historique git du dépôt **public** (`.env`, `.env.local`, `app.js`, 17 commits, janvier → mars 2026). Entre `09dcae6` (2026-01-13) et `78f35e7` (2026-03-06), la clé était aussi lue par le code du site (`VITE_BREVO_API_KEY`), donc incluse dans le JavaScript public. Retirer le fichier ne suffit pas : l'historique reste lisible. | Historique GitHub public, ou `git grep` sur `git rev-list --all` | Jaelle : créer une nouvelle clé Brevo, la mettre dans le secret Firebase `BREVO_API_KEY` de la production, redéployer les fonctions, puis **supprimer les deux anciennes clés** dans Brevo et vérifier l'activité du compte. Réécrire l'historique git n'est pas nécessaire une fois les clés révoquées. | **Ouverte** — action de Jaelle |
| 2 | Moyenne | Règle admin Firestore sans `email_verified` (relecture #1) | Compte non vérifié à l'adresse d'une admin → écriture `produits` | `email_verified == true` + tests | Corrigée (6111d07) |
| 3 | Moyenne | `contacts` (et `newsletter`) créables sans validation : inondation d'e-mails Brevo, documents de 1 Mo (relecture #2) | `addDoc(contacts, {message: 'x'.repeat(900000)})` | Validation champs/types/longueurs + tests | Corrigée (6111d07) |
| 4 | Élevée — **acceptée** par Jaelle le 2026-10-24 | 6 vulnérabilités élevées dans `firebase` 10 (dépendances `undici`, `@grpc/grpc-js`, `@fastify/busboy`). Correctif = mise à jour majeure. Modules Node absents du site publié (0 occurrence dans `dist/`). | `npm audit --omit=dev` | Passage à une version récente de Firebase à l'étape 1 (Next.js) | Acceptée pour l'étape 0, à traiter à l'étape 1 |
| 5 | Faible | Référence de commande non échappée dans l'e-mail (identifiant choisi par le client) (relecture #3) | `setDoc(orders/'<!--AAAA')` | Réduite à `[A-Z0-9]` | Corrigée (6dc7035) |
| 6 | Faible | Livraison offerte si `settings/delivery` absent ou forfait `NaN` (relecture #4) | Vider le forfait dans le Dashboard | Paiement refusé (`delivery_config`) + tests | Corrigée (6dc7035) |
| 7 | Faible | Erreur Stripe journalisée en entier (e-mail client possible) (relecture #5) | E-mail refusé par Stripe | Journal réduit à `type`/`code`/`requestId` | Corrigée (6dc7035) |
| 8 | Faible | `ALLOWED_ORIGINS` par défaut = production (relecture #6) | Fonctions sur le staging sans fichier d'environnement | Plus de défaut ; `functions/.env.jaellejc` (prod), `.env.demo-jaellejc` (local) ; `.env.jaellejc-staging` à créer avec le staging | Corrigée (6dc7035) |
| 9 | Faible | Tests négatifs manquants (relecture #7) | — | +22 tests de règles, +3 tests fonctions | Corrigée (6111d07, 6dc7035) |
| 10 | Faible | Stripe.js chargé sur chaque page, avant consentement, sans usage | Réseau du navigateur | Retiré | Corrigée (4e03ee4) |

Hors périmètre de la livraison A, non aggravé, suivi : commandes écrites par le navigateur et e-mails de confirmation déclenchables vers n'importe quelle adresse (étape 5, webhook) ; lecture publique de `autorisations` (étape 4) ; brouillons lisibles et vendables (livraison B) ; bandeau cookies plein écran (étape 9) ; `createStripeCheckout` testé par ses fonctions pures, pas de bout en bout (staging).

## Dépendances

Après `npm audit fix` (sans `--force`) et `overrides` `form-data` 2.5.6 :
- Fonctions (production) : 0 critique, 0 élevée, 9 moyennes.
- Site (production) : 0 critique, 6 élevées (firebase 10, anomalie #4), 11 moyennes.
- Outils de développement uniquement (`vite` 4, `firebase-tools` 14) : vulnérabilités restantes, correctif = mise à jour majeure ; non publiés, à mettre à jour à l'étape 1.
- Nouvelles dépendances (développement) : `firebase-tools` (émulateurs), `@firebase/rules-unit-testing` (tests des règles) — exigées par CLAUDE.md §3.

## Décision

Code de la livraison A : aucune anomalie Critique ou Élevée ouverte dans le diff (relecture indépendante : Go).

Recommandation : No-go tant que l'anomalie #1 (clés Brevo exposées, antérieure à la refonte) n'est pas traitée, et après un test sur le staging.

**Décision de Jaelle (2026-10-24) : Go pour la mise en production de la livraison A**, avec l'anomalie #1 reportée (elle a constaté une clé SMTP désactivée ; l'onglet « Clés API » reste à vérifier) et sans passage par le staging. Les points restants sont suivis dans `reports/suivi.md`.
