# Rapport QA — Étape 0 : correctifs urgents (livraison A)

Date : 2026-10-24 · Branche : `hotfix` · Commit : 4e03ee4 · Environnement : local, `npm run emulateurs` + `npm run seed:emulateur` + `npm run dev:emulateurs` (base fictive `demo-jaellejc`), navigateur intégré de l'application Claude (Chromium, ordinateur).

## Vérifications automatiques

| Vérification | Commande | Résultat |
|---|---|---|
| Lint des fonctions | `npm --prefix functions run lint` | 0 erreur, 1 avertissement antérieur (`any` dans `safeIntent`) |
| Tests unitaires (paiement, échappement) | `npm --prefix functions test` | 32 / 32 |
| Tests des règles Firestore + Storage | `npm run test:rules` | 39 / 39 |
| Types du site | `npx tsc --noEmit` | **1 erreur antérieure** : `src/pages/ProductDetail.tsx:38` (`category` sur `{id}`), corrigée avec la livraison B qui modifie ce fichier |
| Construction du site | `npm run build` | OK |
| Code local absent du site publié | recherche `127.0.0.1:8080`, `demo-jaellejc`, `js.stripe.com` dans `dist/` | 0 occurrence |

## Parcours vérifiés à l'écran (local)

| Parcours | Vérifié par | Résultat |
|---|---|---|
| `/collection` affiche les produits fictifs, requêtes uniquement vers l'émulateur `127.0.0.1` | Claude (texte de la page, requêtes réseau) | OK |
| `/login` s'affiche (titre « Se connecter »), sans erreur JavaScript de la page | Claude | OK (avant : page cassée, `useEffect` non importé) |
| `/createur` affiche « S'identifier » au lieu de renvoyer vers `/login` | Claude (capture) ; Jaelle a ouvert l'espace créatrice | OK |
| Consentement « Tout accepter » : gtag chargé | Claude (`document.scripts`) | OK |
| Consentement « Continuer sans accepter » : ni gtag, ni requête Analytics, ni Stripe.js | Claude (`performance.getEntriesByType`) | OK |
| Bouton de paiement en local | Jaelle | Sans effet visible : attendu (fonction serveur non lancée en local, Stripe laissé de côté à la demande de Jaelle ; l'alerte d'erreur n'est pas affichée par le navigateur intégré). Calcul serveur couvert par 32 tests unitaires |

## Non vérifié à cette étape (à faire sur le staging ou à l'étape 9)

- Paiement Stripe de bout en bout (carte de test), page `/success`, e-mails Brevo.
- Mobile, Safari (iPhone), Firefox.
- Captures avant/après comparées (Playwright) : aucun changement visuel voulu dans cette livraison, hormis la ligne de message d'accès refusé sur `/createur` et l'alerte en cas d'erreur de paiement.
- Envoi de photo depuis `/createur` à l'écran (couvert par les tests de règles Storage).
- Formulaire de contact envoyé à l'écran (couvert par les tests de règles).

## Anomalies constatées (hors périmètre de la livraison A)

| # | Description | Où | Suite |
|---|---|---|---|
| Q1 | Inscription newsletter probablement en échec en production : `Newsletter.tsx` et `Footer.tsx` interrogent d'abord `newsletter` (doublon), lecture refusée au public par les règles actuelles → message « Une erreur est survenue » | `src/components/layout/Newsletter.tsx:19`, `Footer.tsx:20` | À corriger (étape 8 ou décision de Jaelle). La création seule est autorisée et testée |
| Q2 | Design de l'espace créatrice éloigné de la marque (connexion sans logo, ombres, arrondis, pointillés, gras) | `src/pages/createur/Dashboard.tsx` | Refonte prévue à l'étape 7 (`BACKOFFICE.md`), remarque de Jaelle du 2026-10-24 |
| Q3 | Bandeau cookies plein écran (bloque la navigation, contraire à CLAUDE.md §4 RGPD) | `src/components/layout/CookieBanner.tsx` | Étape 1 (Layout) / étape 9 |
| Q4 | `src/lib/mail.ts` : code mort utilisant `process.env.REACT_APP_BREVO_API_KEY` (aucune clé dans le fichier) | `src/lib/mail.ts` | Suppression avec `legacy/` |

## Conclusion

Les correctifs de la livraison A fonctionnent localement et sont couverts par 71 tests automatiques. Mise en production non autorisée à ce stade : voir `reports/securite/etape-0.md` (clés Brevo exposées, livraison B, staging).
