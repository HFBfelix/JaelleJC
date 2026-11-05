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
| M1 | Moyenne | Newsletter sans double confirmation : une adresse tapée par un tiers reçoit l'e-mail de bienvenue et entre dans la liste Brevo sans avoir rien confirmé (consentement non prouvable, envois non sollicités possibles) | Inscrire `autre@exemple.fr` dans le pied de page | Double confirmation (décision de Jaelle, 2026-11-05) : demande « en_attente » 48 h, un seul e-mail de confirmation par adresse et par 48 h, consentement daté et ajout à Brevo seulement au clic sur la page `/newsletter/confirmation` (transaction : un seul envoi de bienvenue) | **Corrigé**, testé (`newsletter/actions.test.ts`, `site-public.spec.ts` : rien chez Brevo avant le clic, faux lien refusé) |
| F1 | Faible | Règle `newsletter` : création encore permise depuis le navigateur (ancien site), alors que le nouveau site passe par le serveur (sans limite ni jeton de désinscription) | `addDoc(collection(db,'newsletter'), …)` depuis la console du navigateur | `allow create: if false` + test de refus pour les 5 profils ; publiée sur `jaellejc-staging` le 2026-11-05 | **Corrigé** (règles 113/113) ; production à la bascule |
| F2 | Faible | Un tiers qui connaît l'adresse d'une administratrice peut épuiser sa limite de liens (3 par quart d'heure) | 3 demandes toutes les 15 minutes | Compter par IP, puis par adresse seulement après un envoi réel ; la connexion par mot de passe reste possible | Ouvert → à trancher à l'étape 9 (avec la double authentification de l'Atelier) |
| F3 | Faible | Bienvenue et relances de panier ne vérifiaient pas elles-mêmes que l'adresse est vérifiée (déjà imposé par la session, `openSession`) | — (bloqué en amont) | Contrôle `emailVerified` ajouté à l'envoi | **Corrigé**, testé (`welcome.test.ts`) |
| F4 | Faible | « Renvoyer » cliqué deux fois de suite, ou deux changements de statut rapprochés : un e-mail de commande peut partir deux fois (administratrice seule) | Double clic sur « Renvoyer les e-mails en attente » | Chaque e-mail réservé en transaction (`emailLocks.<e-mail>`, levé après l'envoi ou l'échec, ignoré après 10 min) ; feu vert de Jaelle (2026-11-05) | **Corrigé**, testé : deux onglets cliquent en même temps → 1 e-mail (sans la réservation : 2, 3 fois sur 3) ; `email-lock.test.ts` ; paiement et webhook rejoués |
| F5 | Faible | Routes `export-produits` et `catalogue` testées seulement en anonyme | — | Cas « cliente connectée → 401 » ajoutés | **Corrigé**, testé |
| F6 | Faible | `npm audit` : 6 Moyennes dans `glob`/`minimatch`, outils internes de `google-gax` (sous `firebase-admin`), jamais nourris par une saisie | `npm audit --omit=dev` | `rimraf` 6.1.4 forcé sous `google-gax` (`overrides`, accord de Jaelle) : `glob` 14.0.3, `minimatch` 11.0.4 ; aucune nouvelle bibliothèque ; `npm audit fix` écarté (il retirait des outils de développement) | **Corrigé** : `npm audit --omit=dev` → 0 |
| I1 | Info | En-tête `Origin` mal formé : erreur 500 au lieu de 403 sur trois routes de l'Atelier (requête refusée de toute façon) | `Origin: null` | `isSameOrigin` (try/catch) | **Corrigé**, testé (`origin.test.ts`, parcours) |
| I2 | Info | Jeton « ne plus recevoir ces messages » permanent (192 bits, comparé à temps constant, action idempotente) | — | Accepté | Accepté |
| I3 | Info | Plafond du site de la recherche par usage épuisable par des robots changeant d'IP → recherche par mots et alerte à la boutique, coût plafonné | — | Accepté (décision du 2026-11-04) ; App Check à l'étape 9 | Accepté |

Aucune anomalie Critique ni Élevée. La clé Brevo exposée (étape 0) est close depuis le 2026-10-31.

## Dépendances

`npm audit --omit=dev` (2026-11-05, avant correction) : 6 vulnérabilités **modérées**, toutes indirectes (`glob` 10.5.0 et `minimatch` 9.0.9 via `firebase-admin` → `@google-cloud/firestore` → `google-gax` → `rimraf`). Après F6 : **0 vulnérabilité**.

## Décision

**Go en local et sur le projet de test.** Aucune anomalie Critique, Élevée ni Moyenne ouverte. Reste : F2 (étape 9). Vérifications de clôture : voir `reports/qa/etape-7bis.md`.

## Mise à jour du 2026-11-05 : décisions de Jaelle appliquées

| Contrôle | Résultat | Preuve |
|---|---|---|
| Nouvelle action publique `confirmNewsletterAction` : Zod strict (identifiant 64 hex, jeton 48 hex), jeton comparé à temps constant, expiration 48 h, en transaction ; même réponse « invalide » pour un lien faux, expiré, déjà utilisé ou inconnu | OK | `newsletter/actions.test.ts` (5 cas), `site-public.spec.ts` |
| Nouvelle page `/newsletter/confirmation` : confirmation seulement par un clic (pas à l'ouverture du lien : antivirus des messageries), `noindex` | OK | `site-public.spec.ts` |
| E-mail de demande : lien échappé, texte réglable dans l'Atelier échappé, pas de désinscription ni de photo | OK | `templates.test.ts` |
| Atelier : compteur et export de la newsletter limités aux inscriptions confirmées | OK | `site.ts` (`listNewsletter`) |
| Retours autorisés après connexion : `/compte/securite` et `/compte/donnees` ajoutés à la liste fermée ; adresses détournées toujours refusées | OK | `policy.test.ts`, `compte.spec.ts` |
| Erreur trouvée en cours de route : une constante exportée d'un fichier `'use server'` faisait échouer le rendu de toutes les pages (pied de page) ; invisible aux tests unitaires, vue par les parcours | Corrigé avant tout envoi | parcours 234/235 ensuite |

**À faire par Jaelle** : politique TTL sur `newsletter.expiresAt` (projet de test, puis production) pour effacer les demandes jamais confirmées.

## Mise à jour du 2026-11-05 : suppression d'un compte (cliente et Atelier)

Décision de Jaelle : côté cliente, lien discret puis confirmation simple « OK » ; côté Atelier, onglet « Clientes », « Êtes-vous sûre ? » puis le mot SUPPRIMER à taper. Les deux passent par la même fonction serveur `deleteAccount` (commandes gardées et détachées, client Stripe effacé, refus si une commande ou un paiement est en cours).

| Contrôle | Cas testé | Résultat | Preuve |
|---|---|---|---|
| Pages `/atelier/clientes` et `/atelier/clientes/[uid]` | Anonyme et cliente → connexion de l'Atelier ; identifiant validé (`[A-Za-z0-9_-]{1,128}`), inconnu → 404 ; `?q` répété ignoré | OK | `atelier-clientes.spec.ts` |
| Action `deleteClientAction` | Anonyme, cliente, droit retiré → « connexion » ; mot autre que SUPPRIMER (casse, espace) → « invalide » ; connexion de plus de 10 min → « reconnexion » ; 11e suppression de l'heure → « limite » ; rien supprimé dans ces cas | OK | `clients-actions.test.ts`, `clients-logic.test.ts` |
| Comptes protégés | Administratrice, soi-même : refusés depuis l'Atelier ; **et dans `deleteAccount` (tous chemins) : droit relu sur le compte** | OK | `clients.test.ts`, `atelier-clientes.spec.ts` (« son propre compte ne se supprime pas depuis Mes données ») |
| Journal | `auditLog` : action `cliente.supprimee`, autrice, identifiant technique ; jamais l'e-mail ; `console.error` sans identifiant | OK | `clients.test.ts`, `clients-actions.test.ts`, parcours |
| Reconnexion de l'Atelier | `/atelier/connexion?info=reconnexion` : formulaire pour une administratrice connectée, sans effet pour une non-administratrice ; retour fixe `/atelier` | OK | `atelier-clientes.spec.ts` |
| Échappement | Noms et e-mails affichés par React (aucun HTML injecté) | OK | relecture |
| Relecture indépendante (second agent, lecture seule) | Diff de la fonctionnalité | 0 Critique, 0 Élevée, 1 Moyenne (corrigée), 2 Faibles (1 corrigée, 1 acceptée), 4 Info | ci-dessous |

| # | Gravité | Description | Correction | Statut |
|---|---|---|---|---|
| S1 | Moyenne | Une administratrice pouvait supprimer son propre compte depuis « Mes données » (défaut antérieur, rendu plus facile par la confirmation en un clic) : l'Atelier serait resté sans accès | Refus `admin` dans `deleteAccount`, droit relu sur le compte, message à l'écran | **Corrigé**, testé |
| S2 | Faible | `?q=a&q=b` : erreur 500 sur la page Clientes (administratrice seule) | `q` lu seulement s'il est une chaîne | **Corrigé** |
| S3 | Faible | La liste relit tous les comptes à chaque affichage (petite boutique : acceptable) | À surveiller si la base grandit | Accepté |
| S4 | Info | Identifiants avec `-` ou `_` (comptes importés) exclus de la fiche | Autorisés | **Corrigé**, testé |
| S5 | Info | `confirm: true` envoyé d'office côté cliente (confirmation simple voulue) ; la protection réelle reste la connexion récente | — | Accepté (décision de Jaelle) |
| S6 | Info | Reconnexion de l'Atelier sans configuration Firebase : mauvais message | Message « connexion momentanément indisponible » | **Corrigé** |
| S7 | Info | Le journal garde l'identifiant technique (pseudonyme) du compte supprimé | À citer dans la politique de conservation (étape 8) | Ouvert → étape 8 |

Aucune anomalie Critique, Élevée ni Moyenne ouverte. Décision inchangée : **Go en local et sur le projet de test.**
