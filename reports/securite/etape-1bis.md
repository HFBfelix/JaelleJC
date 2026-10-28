# Rapport de sécurité — Étape 1bis : nouvelle base de données

Date : 2026-10-28 · Branche : `refonte-next` · Environnements testés : local (émulateurs, `demo-jaellejc`) et test (`jaellejc-staging`). Production : non modifiée.

## Périmètre

- Schéma Zod de la nouvelle base (`src/server/db/schema.ts`).
- Règles Firestore et Storage réécrites (`firestore.rules`, `storage.rules`) : droit admin par revendication `admin: true`, plus de lecture publique de `autorisations`, aucune écriture navigateur sur catalogue, commandes, paniers.
- Migration rejouable (`scripts/migrate-v2.ts`, `src/server/migration/*`) et découpage des descriptions.
- Scripts : copie du catalogue public vers le test, droit admin, publication des règles du test (`scripts/lib/admin.ts` : garde-fous communs).
- Projet de test `jaellejc-staging` et compte technique `scripts-test` (protections P1 à P8 : `reports/suivi.md`).

## Contrôles effectués

| Contrôle | Cas testé | Résultat | Preuve |
|---|---|---|---|
| 1. Secrets | Motifs de clés (Stripe, Brevo, Google, clé privée, `private_key`) dans `git diff 45bf780..HEAD` | OK (0) | recherche `grep -E` sur le diff ; relecture indépendante |
| 1. Fichiers de clé | `.gitignore` : `.secrets/`, `backups/`, clés de compte de service, `*.p12`, `*.pem`, `credentials.json` | OK | `git check-ignore` (6 cas) ; `git ls-files` sans fichier sensible |
| 1. Clé du compte technique | Hors du code, hors de OneDrive, lien ou jonction démasqués, droits du fichier restreints | OK | `scripts/lib/admin.ts` testé : clé absente, introuvable, dans le code, dans OneDrive, via jonction Windows → refus ; `icacls` |
| 2. Dépendances | `npm audit --omit=dev` ; `npm audit --audit-level=high` | 0 ; 0 élevée (8 moyennes connues, outils de développement) | commandes exécutées |
| 3. Autorisations | Aucune route serveur à cette étape ; scripts : projets acceptés par liste exacte, production exigeant `--confirmation` | OK | `demo-../..` refusé ; `--project jaellejc` refusé sans confirmation |
| 4. Règles Firestore/Storage | 5 appelants × chaque collection (voir tableau) | 102/102 | `npm run test:rules` |
| 4. Règles publiées sur le test | Requêtes anonymes réelles : catalogue sans filtre, commande, profil, newsletter, contacts, journal, réglage interne, écriture | 403 partout ; produit publié, variante active, catégorie, livraison : 200 | `curl` sur l'API publique de `jaellejc-staging` |
| 5. Entrées | Prix (négatif, nul, NaN, texte, > 2 décimales), stock (négatif, décimal, texte), catégorie inconnue, description absente ou avec HTML | OK | `src/server/migration/*.test.ts` (55 tests au total) |
| 6. Échappement | Texte du catalogue dans le rapport Markdown : HTML, titres, listes, tableaux | OK | `report.test.ts` |
| 7. Prix et stock | Centimes entiers ; un brouillon n'est jamais publié par la migration ; anciens champs `price`/`stock` supprimés (une seule source) | OK | `transform.test.ts` ; lecture du test : aucun ancien champ restant |
| 7. Migration à chaud | Document modifié entre lecture et écriture | Écriture refusée (FAILED_PRECONDITION), statut conservé | essai sur émulateur (commande passée en « expédiée ») |
| 7. Panne en cours de migration | Produit migré sans variante | Variante recréée au passage suivant | essai sur émulateur (variante supprimée → « 1 réparé ») |
| 7. Rejeu | Second passage | Aucune réécriture | émulateur et test |
| 9. Données personnelles | Rapports de migration : aucun e-mail, téléphone, identifiant Stripe ; `set-admin` n'affiche plus l'e-mail | OK | recherche dans `reports/migration/` ; relecture |
| 9. Données du test | Catalogue public + données fictives ; aucune donnée client | OK | `scripts/copy-catalogue-to-staging.ts` |
| 10. Relecture indépendante | `git diff 45bf780..HEAD` | 0 Critique, 0 Élevée ; 2 Moyennes et 13 Faibles, traitées ci-dessous | rapport de relecture du 2026-10-25 |

## Règles Firestore / Storage testées

| Collection | Anonyme | Cliente | Autre cliente | Fausse admin | Admin |
|---|---|---|---|---|---|
| `produits` publiés (+ variantes actives) | lecture | lecture | lecture | lecture | lecture |
| `produits` brouillon / archivé, variantes inactives ou d'un produit non publié | refus | refus | refus | refus | lecture |
| `produits`, `variantes` : écriture, suppression, liste sans filtre, groupe `variantes` | refus | refus | refus | refus | écriture refusée (serveur seul) |
| `categories` | lecture, écriture refusée | idem | idem | idem | idem |
| `settings/delivery` ; autre réglage | lecture ; refus | idem | idem | idem | idem |
| `articles_blog` publié ; brouillon | lecture ; refus | idem | idem | idem | lecture ; écriture refusée |
| `orders` | refus (même filtré sur `userId`) | lecture des siennes seulement | refus | refus | lecture ; aucune écriture |
| `users` / `adresses` | refus | lecture et écriture des siens, champs et types contrôlés, pas de droit ajouté, pas de suppression, pas de liste | refus | refus | lecture du profil |
| `contacts`, `newsletter` | création validée ; lecture, modification, suppression refusées | idem | idem | idem | lecture ; pas de modification |
| `carts`, `auditLog`, `stripeEvents`, `autorisations`, `messages` | refus | refus | refus | refus | refus |
| Storage `produits/` | lecture | lecture | lecture | lecture | envoi JPEG/PNG/WebP < 10 Mo et suppression |
| Storage : autre dossier, SVG, HTML, > 10 Mo, métadonnées | refus | refus | refus | refus | refus |

## Anomalies

| # | Gravité | Description | Correction | Statut |
|---|---|---|---|---|
| M1 | Moyenne | Migration à chaud : un changement entre la lecture et l'écriture (vente, expédition) pouvait être écrasé | Précondition `lastUpdateTime` sur chaque écriture ; gel de la boutique pendant la migration de production (PLAN.md, étape 10) | Corrigé, testé |
| M2 | Moyenne | Produit et variante dans deux lots : une panne laissait un produit sans variante, non réparé | Produit + variantes dans le même lot ; réparation au passage suivant ; variante écrite en `set` | Corrigé, testé |
| F1 | Faible | Tout `settings/*` lisible publiquement | Seuls `delivery` et `site` | Corrigé, testé |
| F2 | Faible | Variantes inactives lisibles | `active == true` exigé pour le public | Corrigé, testé |
| F3 | Faible | Dates du profil non contrôlées | `is timestamp` | Corrigé, testé |
| F4 | Faible | Pas de limite au nombre d'adresses | Ajout d'adresse par le serveur, ou limite | Ouvert → étape 6 (espace client) |
| F5 | Faible | Données personnelles des anciennes commandes en double dans `legacy` | Vider `legacy` des commandes après validation de la migration ; export et effacement RGPD à couvrir | Ouvert → étape 10 (nettoyage) et étape 6 |
| F6 | Faible | Anciens champs prix/stock laissés dans les produits | Supprimés (copie dans `legacy`) | Corrigé, vérifié sur le test |
| F7 | Faible | `decisions.json` pouvait publier un ancien brouillon sans liste de contrôle | Interdit : publication via l'espace créatrice | Corrigé, testé |
| F8 | Faible | Garde-fou de la clé contournable par lien ou dossier OneDrive renommé | Chemin réel + dossiers OneDrive déclarés par Windows | Corrigé, testé (jonction) |
| F9 | Faible | Mot de confirmation de production visible dans le message d'erreur | Accepté : la vraie barrière est P1 (aucun droit du compte technique sur la production) | Accepté |
| F10 | Faible | Nom de projet et dossier de sauvegarde libres ; sous-collections non sauvegardées | Liste exacte de projets ; sauvegarde imposée dans `backups/` ; variantes et adresses sauvegardées | Corrigé, testé |
| F11 | Faible | `*.p12`, `*.pem`, `credentials.json` non ignorés | Ajoutés | Corrigé |
| F12 | Faible | Texte non échappé dans le rapport Markdown | Échappement HTML et début de ligne | Corrigé, testé |
| F13 | Faible | `set-admin` affichait l'e-mail | Affiche l'uid | Corrigé |
| R1 | Info | Catégorie dont l'ancien identifiant égale déjà le slug : non convertie | Conversion sur place | Corrigé |
| R2 | Info | `firestore.rules` de `refonte-next` cassent l'ancien site si déployées avant la migration et la pose du droit admin | Jamais de `firebase deploy` vers la production depuis cette branche avant l'étape 10 (PLAN.md) | Consigné |
| R3 | Info | Commandes migrées non validées par le schéma `order` | À valider avant que du code les lise (étape 5/6) | Ouvert |
| R4 | Info | Storage du test non activé (forfait Blaze) | Règles Storage testées sur l'émulateur ; publication sur le test quand Jaelle activera le stockage | Ouvert |
| — | Critique (héritée) | Clés Brevo dans l'historique public (étape 0, #1) | Révocation dans Brevo par Jaelle | Ouvert (`reports/suivi.md`) |

## Dépendances

- `npm audit --omit=dev` : 0 vulnérabilité.
- `npm audit --audit-level=high` : réussi ; 8 moyennes connues (rapport de l'étape 1, #3).
- Nouvelles dépendances : `zod` 4.6.7 et `firebase-admin` 14.5.0 (prévues par `CLAUDE.md` §3).

## Décision

**Go.** Aucune anomalie Critique ou Élevée propre à l'étape. Points ouverts : F4 (étape 6), F5 (étapes 6 et 10), R3, R4.
