# Rapport QA — Étape 4 : authentification double

Date : 2026-10-29 · Branche : `refonte-next` · Environnement : local (Windows 11, `next start` construit, branché sur les émulateurs Firestore et Authentication ; comptes fictifs `e2e-…@exemple.test` créés puis supprimés par les tests).

## Périmètre

- Connexion par **lien reçu par e-mail** ou par **e-mail + mot de passe**, au choix (`/connexion`, retour du lien `/connexion/lien`).
- Parcours « e-mail d'abord » : « Confirmer et payer » sans compte → `/connexion?retour=/panier` (un seul champ, puis « Recevoir mon lien » / « Utiliser un mot de passe ») → retour au panier, conservé.
- Session serveur : cookie de session Firebase `__session` (HttpOnly, SameSite=Lax, Secure hors poste local, 5 jours), vérifié à chaque requête, révocations comprises. Le navigateur ne garde rien de Firebase (persistance en mémoire).
- Création de compte par le lien seulement (décision de Jaelle du 2026-10-29) ; mot de passe choisi ensuite depuis `/compte` (10 caractères au moins, connexion de moins de 10 minutes exigée).
- Panier : panier du compte `carts/u_{uid}`, retrouvé sur tous les appareils ; à la connexion, panier visiteur ajouté (quantités additionnées, plafonnées au stock), document et cookie visiteur supprimés.
- Espace créatrice : `/createur/connexion` (message clair si le compte n'est pas administrateur), `/createur` protégé par la revendication `admin` vérifiée côté serveur (contenu : étape 7).
- En-tête : icône du compte → `/compte` (point noir si connectée) ou `/connexion`.

## Changements visibles voulus

| # | Changement | Raison |
|---|---|---|
| V1 | Nouvelles pages Connexion, Mon compte, Espace créatrice (titre en Crimson Pro, champs à ligne fine, petites capitales) | PLAN.md étape 4, BACKOFFICE.md §1 |
| V2 | « Confirmer et payer » actif sans compte (mène à la connexion) ; grisé une fois connectée jusqu'à l'étape 5 | Parcours « e-mail d'abord » (CLAUDE.md §4) |
| V3 | Connexion Google retirée (l'ancien site la proposait) | Deux méthodes seulement (CLAUDE.md §4) |

Captures : `reports/qa/etape-4/` (connexion, mot de passe, lien envoyé ; mobile et ordinateur). Pages existantes : `npm run test:visual` **24/24** (inchangées).

## Parcours testés

| Parcours | Chrome mobile | Chrome ordinateur | Safari iPhone | Firefox | Preuve |
|---|---|---|---|---|---|
| Lien : compte créé au premier lien, `/compte`, icône « connectée », cookie HttpOnly illisible en JavaScript, rien de Firebase dans le stockage du navigateur | OK | OK | OK | CI | `tests/e2e/connexion.spec.ts` |
| Lien déjà utilisé, code trafiqué, page sans code : refusés, même message | OK | OK | OK | CI | idem |
| Lien ouvert sur un autre appareil : e-mail redemandé ; mauvaise adresse refusée | OK | OK | OK | CI | idem |
| Mot de passe : bon → connectée ; faux, compte inconnu → même message | OK | OK | OK | CI | idem |
| Mot de passe oublié : même réponse que le compte existe ou non ; e-mail envoyé seulement si le compte existe | OK | OK | OK | CI | idem |
| « Confirmer et payer » sans compte → connexion → retour au panier ; panier visiteur + panier du compte fusionnés (1 + 1 = 2) ; cookie et document visiteur supprimés | OK | OK | OK | CI | idem |
| Panier du compte retrouvé sur un autre appareil | OK | OK | OK | CI | idem |
| Déconnexion : retour à l'accueil ; cookie copié avant la déconnexion inutilisable (révoqué) | OK | OK | OK | CI | idem |
| Mot de passe choisi depuis le compte (trop court refusé) : tous les appareils déconnectés, message, puis connexion avec ce mot de passe | OK | OK | OK | CI | idem |
| Compte à adresse non vérifiée (créé sans le lien) : aucune session, même message | OK | OK | OK | CI | idem |
| Anonyme : `/compte` et `/createur` redirigés vers la connexion ; cookie de session inventé : anonyme | OK | OK | OK | CI | idem |
| Cliente non administratrice : refusée à `/createur`, message « Ce compte n'a pas accès à l'espace créatrice. » | OK | OK | OK | CI | idem |
| Administratrice (revendication `admin`) : accès à `/createur` ; droit retiré sans révocation → refus immédiat | OK | OK | OK | CI | idem |
| Retour vers un autre site (`?retour=https://…`) : ignoré, `/compte` | OK | OK | OK | CI | idem |
| Parcours des étapes 1 à 3 (catalogue, consentement, socle, panier) | OK | OK | OK | CI | `tests/e2e/*.spec.ts` |

Commandes : `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 BASE_URL=http://localhost:3317 npx playwright test --project=mobile --project=ordinateur --project=iphone-safari` → **140 réussis**, 4 ignorés (tests panier limités à « ordinateur »), après les corrections de la relecture de sécurité. Répétition ×3 des parcours de connexion sur les trois navigateurs : **135/135** (test de déconnexion ajusté, voir S1 du rapport de sécurité). Firefox : ne démarre pas sur ce poste (déjà le cas aux étapes précédentes), couvert par la CI.

Anomalie trouvée et corrigée pendant les tests : sur Safari iPhone, une adresse tapée avant le chargement complet de la page laissait les boutons grisés. Le formulaire lit désormais l'adresse dans le champ, et les boutons ne s'activent qu'une fois la page prête (sans quoi un envoi natif aurait placé l'adresse dans l'URL).

## Tests unitaires

`npm test` : **165** tests, tous verts, dont `src/server/auth/policy.test.ts` (retour limité à `/panier`, `/compte`, `/createur` ; connexion récente ; mot de passe 10–128 ; e-mail), `src/server/auth/actions.test.ts` (entrées refusées sans appel à Firebase, champ `admin` ou `uid` fourni refusé, mot de passe : anonyme ou connexion ancienne refusés) et `src/server/cart/logic.test.ts` (fusion à la connexion).

## Points ouverts

| # | Sujet | Suite |
|---|---|---|
| Q1 | Réglages du projet de test dans la console Firebase : protection contre l'énumération des e-mails, politique de mot de passe (10 caractères), domaine de l'aperçu Vercel autorisé | Jaelle, depuis son Chrome (guidage pas à pas) |
| Q2 | Durée de validité du lien (« Il est valable [durée] », `EDITORIAL.md` §5) : non affichée tant qu'elle n'est pas vérifiée dans la documentation Firebase | Étape 8 |
| Q3 | Texte de l'e-mail de connexion (`EDITORIAL.md` §6) : modèle géré par Firebase, à vérifier dans la console | Étape 8 |
| Q4 | Expiration du lien : non simulable dans l'émulateur (la règle est appliquée par Firebase) ; à vérifier une fois sur le projet de test | Quand l'aperçu Vercel fonctionnera |
| Q5 | Champs de saisie à 14 px : Safari iPhone zoome sur le champ au toucher (comme le champ newsletter actuel) | À arbitrer avec Jaelle (16 px sur mobile), étape 9 |
| Q6 | Droit admin des 3 comptes validés (contact@jaellejc.com, hfentreprises@gmail.com, felixhamilton@ymail.com) : à poser sur le projet de test quand ces comptes s'y seront connectés une fois, et en production à la bascule | `npm run admin` ; étape 10 |
