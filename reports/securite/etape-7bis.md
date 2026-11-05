# Rapport de sécurité — Étape 7bis : e-mails, relation client, recherche par usage, compte

Date : 2026-11-05 · Branche : `refonte-next` (diff `bf83096..HEAD`, 42 commits de la 7bis + correctifs de clôture) · Environnement testé : local (`next start` construit, émulateurs Firestore, Authentication, Storage ; faux serveur `tests/e2e/fake-stripe.ts` pour Stripe, Brevo, Mistral et la Base Adresse Nationale ; clés de test tirées au hasard hors du dépôt). Aucune donnée ni clé de production. Le lot 6 (recherche par usage) a son rapport détaillé : `reports/securite/etape-7bis-recherche.md`.

## Périmètre

- **E-mails envoyés par le serveur** (API Brevo) : confirmation, alerte boutique, excuses, « en préparation », « colis en route », bienvenue, newsletter (confirmation, désinscription), lien de connexion de l'Atelier. Textes réglables dans l'Atelier (`settings/emailTexts`), paragraphe Mistral (faits du catalogue seulement).
- **Envois automatiques** : route `/api/cron/envois` (secret `CRON_SECRET`), relances de panier, « colis arrivé ? », avis à J+14 ; page `/emails/preferences` (« ne plus recevoir ces messages ») ; page `/newsletter/desinscription`.
- **Atelier** (ex-`/createur`, redirection 301) : routes `/api/createur/catalogue` (PDF), `/api/createur/export-produits` (CSV), `/api/createur/dictee` ; fiches par couleur reliées par modèle ; réglages.
- **Recherche par usage** (Mistral) : action publique `searchByUsageAction`.
- **Achat et compte** : coordonnées obligatoires avant paiement (`saveProfileAction`), adresse vérifiée par la Base Adresse Nationale, destinataire d'un cadeau, page compte rangée par thème (`/compte/{commandes,coordonnees,adresses,securite,donnees}`).
- Nouvelles collections serveur : `emailMarks`, `emailPrefs`, `rateLimits`, `usageCache`, `usageStats`, `produitsNotes`. Dépendances ajoutées : `@react-pdf/renderer` et `sharp` (catalogue PDF de l'Atelier, accord de Jaelle), `jwks-rsa` 3 (chargement de `firebase-admin` sur Vercel).

## Contrôles effectués

| Contrôle | Cas testé | Résultat | Preuve |
|---|---|---|---|
| 1. Secrets | Motifs de clés (Brevo `xkeysib-`, Stripe, clé privée, clé Google) dans le diff | OK (0) | `git diff bf83096..HEAD \| grep -E …` ; gitleaks en CI (job `secrets` vert) |
| 2. Dépendances | `npm audit --omit=dev` | 6 Moyennes indirectes (voir F6) ; aucune Élevée ni Critique | commande exécutée le 2026-11-05 |
| 3. Actions de l'Atelier | `setModelAction`, `analyzeAction`, `resendOrderEmailsAction`, `runAutomationsAction`, `saveArrivalDaysAction`, `saveEmailTextAction`, `resetEmailTextAction`, `catalogueTextsAction` : anonyme et cliente → « connexion », rien d'écrit ni d'envoyé | OK | `createur/actions.test.ts`, `createur/orders.test.ts`, `emails/automation-actions.test.ts`, `emails/text-actions.test.ts`, `catalogue/actions.test.ts` (ajouté à la clôture) |
| 3. Routes de l'Atelier | `export-produits`, `catalogue`, `dictee`, `photos` : anonyme 401, **cliente connectée 401** (ajouté à la clôture), autre site 403, `Origin: null` 403 | OK | `createur-produits.spec.ts` ; `http/origin.test.ts` |
| 3. Cron | Sans secret, faux secret : refusé ; comparaison à temps constant ; refusé si `CRON_SECRET` absent | OK | `envois-automatiques.spec.ts` (« cron sans secret refusé ») |
| 3. Compte | Anonyme renvoyé à la connexion sur les 5 nouvelles pages ; commande d'une autre cliente → 404 | OK | `compte.spec.ts` (« anonyme… », « commandes… jamais celle d'une autre ») |
| 3. Lien de l'Atelier | Envoyé aux seules administratrices, même réponse pour toute adresse | OK | `connexion.spec.ts` (« lien de connexion à l'espace créatrice ») ; `auth/actions.test.ts` |
| 4. Règles | Nouvelles collections fermées à tous ; `settings/emailTexts` illisible et non modifiable ; civilité, prénom, nom, téléphone non modifiables par le navigateur | OK (109/109) | `tests/rules/rules.test.mjs` (émulateur, projet `demo-regles-7bis`) |
| 5. Entrées | Zod strict : textes d'e-mails (objet sur une ligne, 2 000 caractères, accolades inconnues refusées), profil (téléphone français), adresse (BAN), recherche (longueur), identifiants de pièces (`/`, `..`, 60 au plus) | OK | `text-actions.test.ts`, `greeting.test.ts`, `checkout/logic.test.ts`, `usage-actions.test.ts`, `catalogue/actions.test.ts` |
| 6. Échappement | E-mails : `escapeHtml` sur titres, textes, message cadeau, paragraphe Mistral (refusé s'il contient `<`, `>`, `@` ou un lien) ; lien de suivi https seulement ; CSV : formules neutralisées | OK | `emails/templates.test.ts`, `personal-logic.test.ts`, `site.test.ts` ; relecture indépendante |
| 7. Prix et stock | Aucun prix ni total du navigateur ; profil et adresse relus par le serveur au clic « Payer » ; profil retiré après l'affichage → aucune session Stripe | OK | `parcours-achat.spec.ts`, `paiement.spec.ts`, `checkout/*.test.ts` |
| 8. Abus | Newsletter 5/h par IP + champ piège ; lien Atelier 3/15 min par adresse ; recherche 10/h par visiteur, 500/h et 2 000/jour pour le site ; paragraphes Mistral 100/h ; App Check : étape 9 | OK (voir M1, F3) | `newsletter/actions.test.ts`, `recherche-usage.spec.ts`, `admin-link` |
| 9. En-têtes | En-têtes de base inchangés ; micro autorisé seulement sous `/atelier/*` | OK | `next.config.ts` |
| 9. Journaux | Libellés fixes ; ni adresse, ni phrase de recherche, ni contenu d'e-mail | OK | `grep console.` sur le diff ; `usage-service.ts:79` |
| 9. Faux serveurs | `BREVO_API_URL`, `ADDRESS_API_URL`, `MISTRAL_API_HOST` refusés sur Vercel ou sans émulateurs | OK | relecture indépendante |
| 10. Relecture indépendante | Diff `bf83096..HEAD` relu par un second agent, en lecture seule | 0 Critique, 0 Élevée, 1 Moyenne, 5 Faibles, 3 Info | relecture du 2026-11-05, ci-dessous |

## Règles Firestore / Storage testées

| Collection | Appelant | Action | Attendu | Obtenu |
|---|---|---|---|---|
| `emailMarks`, `emailPrefs`, `rateLimits`, `usageCache`, `usageStats`, `produitsNotes` | tous | lecture, écriture | refusé | refusé |
| `settings/emailTexts` | tous | lecture, écriture | refusé | refusé |
| `users/{uid}` | propriétaire | modifier `civilite`, `prenom`, `nom`, `telephone` | refusé (serveur seulement) | refusé |
| `orders`, `carts`, `produits`, `variantes` | tous | écriture | refusé | refusé (tests des étapes 3 à 7, rejoués : 109/109) |

## Anomalies

| # | Gravité | Description | Comment la reproduire | Correction | Statut |
|---|---|---|---|---|---|
| M1 | Moyenne | Newsletter sans double confirmation : une adresse tapée par un tiers reçoit l'e-mail de bienvenue et entre dans la liste Brevo sans avoir rien confirmé (consentement non prouvable, envois non sollicités possibles) | Inscrire `autre@exemple.fr` dans le pied de page | Double confirmation (lien à cliquer avant l'ajout à Brevo), inscriptions non confirmées expirées | **Ouvert → décision de Jaelle** (change le parcours et un e-mail validés) ; à corriger avant la bascule |
| F1 | Faible | Règle `newsletter` : création encore permise depuis le navigateur (ancien site), alors que le nouveau site passe par le serveur (sans limite ni jeton de désinscription) | `addDoc(collection(db,'newsletter'), …)` depuis la console du navigateur | `allow create: if false` + test négatif, à la bascule (l'ancien site en dépend jusque-là) | **Ouvert → feu vert de Jaelle** (règles) |
| F2 | Faible | Un tiers qui connaît l'adresse d'une administratrice peut épuiser sa limite de liens (3 par quart d'heure) | 3 demandes toutes les 15 minutes | Compter par IP, puis par adresse seulement après un envoi réel ; la connexion par mot de passe reste possible | Ouvert → à trancher à l'étape 9 (avec la double authentification de l'Atelier) |
| F3 | Faible | Bienvenue et relances de panier ne vérifiaient pas elles-mêmes que l'adresse est vérifiée (déjà imposé par la session, `openSession`) | — (bloqué en amont) | Contrôle `emailVerified` ajouté à l'envoi | **Corrigé**, testé (`welcome.test.ts`) |
| F4 | Faible | « Renvoyer » cliqué deux fois de suite, ou deux changements de statut rapprochés : un e-mail de commande peut partir deux fois (administratrice seule) | Double clic sur « Renvoyer les e-mails en attente » | Réserver chaque e-mail en transaction avant l'envoi. Même fonction que le webhook Stripe → **feu vert demandé** (paiement) | Ouvert → Jaelle |
| F5 | Faible | Routes `export-produits` et `catalogue` testées seulement en anonyme | — | Cas « cliente connectée → 401 » ajoutés | **Corrigé**, testé |
| F6 | Faible | `npm audit` : 6 Moyennes dans `glob`/`minimatch`, outils internes de `google-gax` (sous `firebase-admin`), jamais nourris par une saisie | `npm audit --omit=dev` | Forcer des versions corrigées (`overrides`) ou attendre `firebase-admin` ; `npm audit fix` refusé (il retirait des outils de développement) | Ouvert → accord de Jaelle (dépendances) |
| I1 | Info | En-tête `Origin` mal formé : erreur 500 au lieu de 403 sur trois routes de l'Atelier (requête refusée de toute façon) | `Origin: null` | `isSameOrigin` (try/catch) | **Corrigé**, testé (`origin.test.ts`, parcours) |
| I2 | Info | Jeton « ne plus recevoir ces messages » permanent (192 bits, comparé à temps constant, action idempotente) | — | Accepté | Accepté |
| I3 | Info | Plafond du site de la recherche par usage épuisable par des robots changeant d'IP → recherche par mots et alerte à la boutique, coût plafonné | — | Accepté (décision du 2026-11-04) ; App Check à l'étape 9 | Accepté |

Aucune anomalie Critique ni Élevée. La clé Brevo exposée (étape 0) est close depuis le 2026-10-31.

## Dépendances

`npm audit --omit=dev` (2026-11-05) : 6 vulnérabilités **modérées**, toutes indirectes (`glob` 10.5.0 et `minimatch` 9.0.9 via `firebase-admin` → `@google-cloud/firestore` → `google-gax` → `rimraf`). Aucune Élevée ni Critique (le job CI « Dépendances » passe). Voir F6.

## Décision

**Go en local et sur le projet de test.** Aucune anomalie Critique ni Élevée ouverte. Reste avant la bascule : M1 (double confirmation de la newsletter), F1, F4 et F6 (accord de Jaelle), F2 (étape 9). Vérifications de clôture : voir `reports/qa/etape-7bis.md`.
