# Rapport de sécurité — Étape 4 : authentification double

Date : 2026-10-29 · Branche : `refonte-next` · Environnement testé : local (`next start` construit sur les émulateurs Firestore et Authentication ; comptes fictifs `e2e-…@exemple.test`).

## Périmètre

- `src/server/auth/` : règles pures (`policy.ts`), session serveur (`session.ts`, `server-only`), Server Actions (`actions.ts`), configuration du navigateur lue à l'exécution (`client-config.ts`).
- `src/lib/firebase-auth.ts` : seul usage du SDK client (lien, mot de passe, réinitialisation), persistance en mémoire.
- Pages `/connexion`, `/connexion/lien`, `/compte`, `/createur/connexion`, `/createur` (toutes `noindex`, exclues de `robots.txt`).
- `src/server/firebase/admin.ts` : `adminAuth()`, émulateur refusé hors poste local.
- Panier : panier du compte `carts/u_{uid}`, fusion du panier visiteur à la connexion.
- Dépendance : `firebase` 13.1.0 passé des outils de test aux modules du site (même version, aucun ajout). CI : émulateur Authentication ajouté aux parcours.

Règles Firestore et Storage inchangées (`git diff firestore.rules storage.rules` vide) : `carts` reste refusé au navigateur ; `admin` est déjà lu depuis la revendication. La lecture publique de `autorisations` disparaît avec ces règles, déployées en production à la bascule (étape 10).

## Contrôles effectués

| Contrôle | Cas testé | Résultat | Preuve |
|---|---|---|---|
| 1. Secrets | Motifs de clés dans le diff et les nouveaux fichiers | OK (0) | `grep -E` ; gitleaks en CI |
| 2. Dépendances | `npm audit --omit=dev` ; `--audit-level=high` | 0 ; 0 élevée (5 moyennes, outils de développement, inchangé) | commandes exécutées |
| 3. Anonyme | `/compte`, `/createur` → connexion ; cookie de session inventé → anonyme | OK | `connexion.spec.ts` « pages protégées » |
| 3. Autre cliente | Panier du compte lié à l'uid de la session ; cookie copié inutilisable après déconnexion ou changement de mot de passe | OK | `connexion.spec.ts` « déconnexion », « mot de passe choisi » |
| 3. Non-admin | Refusée à `/createur`, message clair ; champ `admin` ou `uid` envoyé par le navigateur refusé | OK | `connexion.spec.ts` « cliente (non admin) » ; `actions.test.ts` |
| 3. Admin | Accès avec la revendication `admin` ; droit relu sur le compte à chaque requête (retrait sans révocation → refus immédiat) | OK | `connexion.spec.ts` « administratrice » |
| 4. Règles | Inchangées ; `carts` toujours refusé au navigateur | OK | `panier.spec.ts` (403) ; `rules.test.mjs` en CI |
| 5. Entrées | Jeton vide/énorme, champs en trop, mot de passe < 10 ou > 128, retour hors liste (`//evil`, `https://…`, `javascript:`) | Refusés | `actions.test.ts`, `policy.test.ts` ; `connexion.spec.ts` « retour vers un autre site » |
| 6. Échappement | Adresse affichée par React (texte) | OK | relecture |
| 9. Cookie de session | `__session` HttpOnly, SameSite=Lax, Secure hors localhost, 5 jours ; illisible en JavaScript ; rien de Firebase dans le stockage du navigateur | OK | `connexion.spec.ts` « lien de connexion » |
| 9. Session | `verifySessionCookie(…, checkRevoked)` à chaque requête ; ouverture seulement avec une connexion de moins de 5 minutes et une adresse vérifiée | OK | `session.ts` ; `connexion.spec.ts` « adresse non vérifiée » |
| 9. Énumération | Même message pour mauvais mot de passe, compte inconnu, lien invalide ; même réponse au « mot de passe oublié » | OK côté site ; voir M2 | `connexion.spec.ts` |
| 9. Adresse e-mail | Jamais dans l'URL (boutons actifs une fois la page prête, `method="post"`) ; gardée une heure au plus dans le navigateur ; `no-referrer` sur la page du lien | OK | `SignInForm.tsx`, `firebase-auth.ts`, `connexion/lien/page.tsx` |
| 9. Journaux | Messages fixes, sans adresse ni jeton | OK | `grep console.` |
| 9. Émulateur | `FIREBASE_AUTH_EMULATOR_HOST` refusé sur Vercel ou sans émulateur Firestore (Admin SDK et configuration du navigateur) | OK | `admin.ts`, `client-config.ts` (relecture) |
| 10. Relecture indépendante | Diff relu par un second agent (lecture seule) | 0 Critique, 0 Élevée ; 3 Moyennes, 3 Faibles, 2 Info | relecture du 2026-10-29, ci-dessous |

## Anomalies

| # | Gravité | Description | Comment la reproduire | Correction | Statut |
|---|---|---|---|---|---|
| M1 | Moyenne | Un compte créé directement par l'API Firebase avec un mot de passe (sans le lien) pouvait ouvrir une session ; risque de pré-création du compte d'une cliente | `accounts:signUp` avec la clé publique, puis connexion | Adresse vérifiée exigée pour ouvrir une session. Comptes à mot de passe de l'ancien site non vérifiés : une connexion par lien d'abord | Corrigé, testé (`connexion.spec.ts` « adresse non vérifiée ») |
| M2 | Moyenne | Protection contre l'énumération et politique de mot de passe (10 caractères, page de réinitialisation Firebase comprise) non actives sur le projet de test : l'API Firebase renvoie des codes d'erreur distincts | Appel direct à l'API | Réglages de la console Firebase (projet de test, puis production à la bascule) | Ouvert → Jaelle (console, depuis son Chrome). À fermer avant la bascule |
| M3 | Moyenne | Pas de limitation de débit ni d'App Check sur l'envoi de liens et de réinitialisations : une adresse peut être inondée, le quota d'e-mails Firebase épuisé | Envois en boucle | App Check (reCAPTCHA) appliqué à Authentication, prévu à l'étape 9 (`PLAN.md`, `SECURITE.md` §4) | Ouvert → étape 9, avant la bascule |
| F1 | Faible | Droit admin lu dans le cookie (figé 5 jours) : un retrait sans révocation laissait l'accès | Retirer la revendication dans la console | Droit relu sur le compte à chaque requête (`requireAdmin`) ; boucle de redirection découverte par le test, corrigée | Corrigé, testé |
| F2 | Faible | Changement de mot de passe sans déconnexion des autres appareils | — | Toutes les sessions fermées, nouvelle connexion avec le nouveau mot de passe | Corrigé, testé |
| F3 | Faible | Adresse e-mail gardée sans limite dans le navigateur en attendant le lien | — | Une heure au plus ; effacée à « Utiliser une autre adresse » | Corrigé |
| S1 | Faible | Révocation Firebase à la seconde près : une session ouverte dans la même seconde que la déconnexion reste valable | Connexion puis déconnexion en moins d'une seconde (test automatique) | Limite de Firebase, sans portée pratique ; les tests attendent plus d'une seconde | Accepté |
| I1 | Info | La déconnexion ferme les sessions de tous les appareils | — | Voulu (un cookie copié ne sert plus) ; à savoir pour Jaelle | Accepté |
| I2 | Info | Le cookie du panier peut être renouvelé par le proxy pendant la connexion, mais il ne pointe plus vers rien (document supprimé, session prioritaire) | — | Aucune | Accepté |
| — | Moyenne (étape 3, M1) | Paniers créés en masse ; TTL à activer | — | TTL : Jaelle ; débit : étape 9 | Ouvert |
| — | Critique (héritée) | Clés Brevo dans l'historique public (étape 0, #1) | — | Révocation dans Brevo par Jaelle | Ouvert |

## Dépendances

`npm audit --omit=dev` : 0 vulnérabilité. `npm audit --audit-level=high` : 0 élevée, 5 moyennes (outils de développement, déjà consignées). `firebase` 13.1.0 déplacé (aucune nouvelle dépendance).

## Décision

**Go pour la suite en local et sur le projet de test.** Aucune anomalie Critique ou Élevée propre à l'étape. Restent ouvertes avant la bascule : M2 (réglages de la console, Jaelle) et M3 (App Check, étape 9). Vérifié après corrections : `npm run typecheck`, `npm run lint`, `npm test` (165), parcours 140 réussis / 4 ignorés (mobile, ordinateur, Safari iPhone), parcours de connexion répétés ×3 : 135/135, `npm run test:visual` 24/24.
