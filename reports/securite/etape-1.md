# Rapport de sécurité — Étape 1 : socle Next.js

Date : 2026-10-24 · Branche : `refonte-next` (depuis `main` d18ae81) · Environnement testé : local (site construit `next start` ; émulateurs Firebase, projet fictif `demo-jaellejc`). Staging pas encore créé.

## Périmètre

- Ancien site Vite déplacé dans `legacy/` (lecture seule) ; `public/dashboard.html`, `public/index.html` (anciens) et la règle de réécriture générique de `vercel.json` ne sont plus servis par le nouveau site.
- Projet Next.js 16.4.3 (App Router, TypeScript strict), Tailwind 3.4 avec `tailwind.config.ts` identique, polices via `next/font`.
- Layout porté (en-tête, catégories, menu, newsletter sans envoi, pied de page, bandeau cookies), Google Analytics après consentement (`src/lib/consent.ts`, `src/components/layout/Analytics.tsx`).
- En-têtes de sécurité (`next.config.ts`).
- Vérifications automatiques GitHub (`.github/workflows/verifications.yml`).
- Mise à jour de Firebase (10 → 13, outils de test seulement à ce stade) et de firebase-tools (14 → 15).

Aucune route serveur, action, collection ni règle Firestore/Storage ajoutée ou modifiée.

## Contrôles effectués

| Contrôle | Cas testé | Résultat | Preuve |
|---|---|---|---|
| 1. Secrets | Motifs xkeysib-/sk_live/sk_test/rk_/whsec_/AIza/clé privée/mot de passe dans `git diff d18ae81..HEAD` (hors lockfile et images) | OK (0) | recherche `grep -E` sur le diff ; relecture indépendante |
| 1. Secrets (CI) | gitleaks sur les nouveaux commits à chaque envoi et Pull Request | En place | `verifications.yml`, job `secrets` |
| 2. Dépendances (site) | `npm audit --omit=dev` | OK : 0 vulnérabilité | commande exécutée |
| 2. Dépendances (outils) | `npm audit --audit-level=high` | OK : 0 élevée/critique ; 8 moyennes (anomalie #3) | commande exécutée ; `overrides` `@grpc/grpc-js` ^1.14.6 |
| 3. Autorisations | Aucune route ni action ajoutée | Sans objet | — |
| 4. Règles Firestore/Storage | Non modifiées ; non-régression avec Firebase 13 | OK (39/39) | `node --test tests/rules/rules.test.mjs` sur les émulateurs |
| 5. Entrées | Valeur de consentement trafiquée (`oui`, `<script>`) ou stockage bloqué | OK : traitée comme une absence de choix | `src/lib/consent.test.ts` (7/7), `tests/e2e/consentement.spec.ts` |
| 6. Échappement | Aucun `dangerouslySetInnerHTML`, `innerHTML`, `eval` dans `src/` ; catégories encodées dans les URL (`encodeURIComponent`) | OK | relecture indépendante |
| 7. Prix et stock | Non concernés à cette étape | Sans objet | — |
| 8. Abus | Newsletter : envoi désactivé jusqu'à l'étape 1bis (écriture serveur + App Check) | Sans objet | `Newsletter.tsx` |
| 9. Traceurs avant consentement | Premier passage, refus, refus + rechargement, valeur trafiquée : 0 requête Google ; acceptation : gtag chargé | OK | `tests/e2e/consentement.spec.ts` (Chrome mobile/ordinateur, WebKit) |
| 9. En-têtes | HSTS, nosniff, Referrer-Policy, X-Frame-Options DENY, CSP `frame-ancestors 'none'`, Permissions-Policy ; pas de `X-Powered-By` | OK | `tests/e2e/socle.spec.ts` ; `curl -I` |
| 9. Cookies | Aucun cookie posé par le site | OK (0 `Set-Cookie`) | `curl -I http://localhost:3000/` |
| 9. Logs | Aucun `console.*` dans `src/` | OK | `grep -rn "console\." src` |
| 10. Relecture par un second agent | `git diff d18ae81..HEAD` (hors legacy, lockfile, images) | Go : 0 Critique, 0 Élevée ; 2 Moyennes, 4 Faibles (ci-dessous) | rapport de relecture du 2026-10-24 |

## Règles Firestore / Storage testées

Aucune règle modifiée à cette étape. Non-régression : les 39 cas de l'étape 0 (`reports/securite/etape-0.md`) passent avec `firebase` 13.1.0 et `@firebase/rules-unit-testing` 6.0.0.

## Anomalies

| # | Gravité | Description | Comment la reproduire | Correction | Statut |
|---|---|---|---|---|---|
| 1 | Moyenne (RGPD) | Bandeau cookies plein écran : bloque la navigation jusqu'au choix (`CLAUDE.md` §4 demande un bandeau non bloquant). Le refus reste aussi simple que l'acceptation. | Première visite | Conservé à l'identique | **Accepté par Jaelle** (2026-10-24, « le bandeau de cookies ne le touche pas ») |
| 2 | Moyenne (RGPD) | Pas de moyen de retirer son consentement après « Tout accepter », et pas d'expiration du choix (la CNIL recommande de redemander après 6 à 13 mois) | Accepter puis chercher à revenir sur son choix | Lien « Gérer les cookies » et choix daté | Ouvert, avant la bascule (étape 8/9, pages légales) |
| 3 | Moyenne | 8 vulnérabilités moyennes dans les outils de développement : `postcss-selector-parser` (via Tailwind 3), `uuid`, `gaxios`, `@opentelemetry/core` (via firebase-tools). Absentes du site publié. | `npm audit` | Correctif = Tailwind 4 (interdit : config figée) ou rétrogradation de firebase-tools | Ouvert, réévalué chaque mois |
| 4 | Faible | CSP limitée à `frame-ancestors` | `curl -I` | CSP complète avec nonce | Prévu étape 9 |
| 5 | Faible | HSTS avec `includeSubDomains; preload` : risque pour d'éventuels sous-domaines en HTTP | `next.config.ts` | Réduit à `max-age=63072000` | Corrigé |
| 6 | Faible | Actions GitHub et image gitleaks épinglées par étiquette | `verifications.yml` | Épinglées par empreinte (SHA / digest) | Corrigé |
| 7 | Faible | gitleaks : plage invalide au premier envoi d'une branche | Premier `git push` | Repli sur la base commune avec `main` | Corrigé |
| 8 | Critique (héritée) | Clés Brevo dans l'historique public (étape 0, #1) | — | Révocation dans Brevo par Jaelle | Ouvert, hors périmètre de l'étape (`reports/suivi.md`) |

## Dépendances

- `npm audit --omit=dev` : 0 vulnérabilité.
- `npm audit --audit-level=high` : réussi (0 élevée, 0 critique, 8 moyennes, anomalie #3).
- Dépendances d'exécution épinglées : `next` 16.4.3, `react` / `react-dom` 18.3.1, `lucide-react` 0.284.0 (même version que l'ancien site : icônes identiques).
- Nouvelles dépendances (toutes prévues par `CLAUDE.md` §3) : `next`, `eslint-config-next`, `vitest`, `@playwright/test`.

## Décision

**Go** pour l'aperçu. Aucune anomalie Critique ou Élevée propre à l'étape. Points restants : #2 et #3 avant la bascule, #8 (héritée de l'étape 0) dès que possible.
