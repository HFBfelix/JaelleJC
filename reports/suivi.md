# Suivi — ce qui reste à faire (mis à jour au fil des étapes)

Dernière mise à jour : 2026-10-28, fin de l'étape 2 (catalogue rendu côté serveur). Chaque ligne renvoie au rapport ou à la décision d'origine.

## Décisions de Jaelle (2026-10-24)

- Chaque étape est visualisée avant validation (local avec émulateurs, ou staging). Mise en production seulement après validation explicite de Jaelle.
- Étape 0 mise en production **sans passage par le staging** (projet `jaellejc-staging` pas encore créé). Écart assumé à `SECURITE.md` §2.
- Les 6 vulnérabilités élevées de `firebase` 10 sont acceptées jusqu'à l'étape 1.
- Les clés Brevo exposées (ci-dessous) sont traitées plus tard.
- Stripe de test laissé de côté pour la visualisation locale.
- Étapes enchaînées sans validation intermédiaire du plan : à la fin de chaque étape, Claude indique quoi vérifier, Jaelle vérifie, puis l'étape suivante démarre.
- Bandeau cookies conservé tel quel (plein écran), malgré « non bloquant » dans `CLAUDE.md` : décision de Jaelle.
- Descriptions produits : à répartir dans les sous-parties de la fiche (accroche, description, composition, matières et entretien, dimensions et détails), via la migration de l'étape 1bis, validée par Jaelle.
- Migration des vraies données (production) à la bascule (étape 10), pas à la fin de l'étape 1bis : l'ancien site lit encore l'ancien format. À l'étape 1bis, migration sur le projet de test uniquement.
- Projet de test rempli avec le catalogue public (produits, catégories, réglages, articles) lu depuis cet ordinateur comme le ferait un visiteur ; commandes, messages, inscriptions et profils fictifs. Exception assumée à « aucune donnée de production sur l'ordinateur » (aucune donnée client).
- E-mails : Brevo ne servira plus qu'à la newsletter (1 par mois). Les e-mails du parcours d'achat seront repensés (voir « E-mails »).

## Décision de Jaelle (2026-10-28) : typographie « Atelier »

- Polices Crimson Pro (titres, droit) et Source Sans 3 (texte, 14 px) à la place de Cormorant Garamond italique et Inter. Aucun texte sous 11 px, petites capitales à 0,12 em au plus, police à empattements à partir de 18 px. `CLAUDE.md` §2 mis à jour. Bandeau cookies : code inchangé, seule la police change (elle vaut pour tout le site).
- Vérifié : `npm run typecheck`, `npm run lint`, `npm test` (69/69), parcours `npx playwright test --project=mobile --project=ordinateur` (44/44, site construit, port 3100). Captures validées par Jaelle : références remplacées par le nouveau site (`npm run visual:reference`, puis `npm run test:visual` 24/24).
- Typographie française des titres et des noms (`EDITORIAL.md`) : une capitale initiale, pas de nom tout en majuscules, pas de virgule dans un nom. Titres du code corrigés (« Le journal », « Résonances esthétiques », « Artisanat français », « Carnets privés »). Données : `npm run typographie -- --project demo-jaellejc --apply` (4 noms, 7 familles, 12 titres d'articles ; rejoué : 0 correction) ; règle intégrée à `scripts/migrate-v2.ts` pour la bascule. Nom « Coffret bébé moutarde imprimé fleurs » (sans virgule) dans `scripts/migration/decisions.json`, à confirmer par Jaelle. Vérifié : `npm test` 84/84, parcours 44/44, `npm run test:visual` 24/24.- À faire : projet de test (`npm run typographie -- --project jaellejc-staging`, puis `--apply`) ; titres d'articles grammaticalement faux (« L'âme du couverture… », « du veste… », article « Test produi 1* ») à réécrire à l'étape 8 ; même règle à appliquer à la saisie dans le back-office (étape 7).

## Mise en production de l'étape 0, livraison A (2026-10-24)

- Règles Firestore + Storage déployées sur `jaellejc` par Jaelle (commande tapée par elle).
- Fonctions (8) déployées et `main` avancé de `eb54d84` à `b7dbf46` **par Claude, à la demande explicite de Jaelle « pour cette fois-ci »**. Exception ponctuelle à la règle 8 de `CLAUDE.md`, qui reste inchangée.
- Déploiement des fonctions sous Windows : `$env:FUNCTIONS_DISCOVERY_TIMEOUT = '60'` nécessaire (délai d'analyse de 10 s dépassé sinon).
- Vérifié en production : nouvelle version servie (plus de SumUp ni de gtag d'office), collection affichée, `/login` et `/createur` affichés, aucune erreur console, aucun traceur avant consentement.
- Connexion Firebase CLI retirée de l'ordinateur juste après (`firebase logout`).
- Variable Vercel `ITE_FIREBASE_API_KEY` mal nommée, corrigée par Jaelle en `VITE_FIREBASE_API_KEY` ; `VITE_STRIPE_PUBLISHABLE_KEY` n'est plus utilisée (à supprimer).
- Reste à vérifier par Jaelle : connexion à `/createur` avec son compte, envoi d'une photo (si refusé : autorisation « Storage → Firestore » à accorder dans la console Firebase, page Règles de Storage), panier jusqu'à la page Stripe (sans payer).
- Connexion à `/createur` impossible en production (analyse du 2026-10-24, appels publics uniquement) : fournisseur **Google non activé** dans Firebase Authentication (`OPERATION_NOT_ALLOWED`) et **`www.jaellejc.com` absent des domaines autorisés** (le site sert `www`). À faire par Jaelle dans la console. Le Dashboard affiche désormais la cause de l'échec (commit b947ef5, sur `hotfix`, pas encore en ligne).
- Mot de passe oublié : le formulaire « nouveau mot de passe » exigeait aussi l'e-mail (bouton sans effet s'il était vide) ; messages d'erreur imprécis ; réponse différente selon que le compte existe ou non. Corrigé sur `hotfix`, pas encore en ligne.
- Connexion à `/createur` vérifiée par Jaelle en production après activation de Google (2026-10-24).
- Comptes admin actuels (`autorisations`, `actif: true`) : felixhamilton@ymail.com, hfentreprises@gmail.com, contact@jaellejc.com. Les autres comptes Firebase (hfbfelix@gmail.com, hamiltonbbg@live.com, clients) n'ont pas accès, c'est voulu. À l'étape 4 : poser la revendication `admin` sur la liste validée par Jaelle (le moins de comptes possible), puis supprimer `autorisations`.
- Recommandation : compte Google dédié à l'administration avec clé de sécurité (`SECURITE.md` §6) avant l'étape 10.

## À faire — sécurité

| Priorité | Sujet | Détail | Origine |
|---|---|---|---|
| **Critique** | Clés API Brevo exposées | 2 clés `xkeysib-` dans l'historique public GitHub (janvier et mars 2026), dont une incluse dans le site entre janvier et mars. Dans Brevo, onglet **« Clés API »** (pas « Clés SMTP ») : désactiver/supprimer ces clés, vérifier l'activité du compte. Si une clé active sert au secret Firebase `BREVO_API_KEY`, en créer une nouvelle avant. | `reports/securite/etape-0.md` #1 |
| Moyenne | Outils de dev : 8 vulnérabilités moyennes | `postcss-selector-parser` (Tailwind 3), `uuid`, `gaxios`, `@opentelemetry/core` (firebase-tools) ; absentes du site publié | `reports/securite/etape-1.md` #3 |
| Moyenne | Retrait du consentement cookies | Lien « Gérer les cookies », choix daté et redemandé après 6 mois | rapport étape 1 #2 → étape 8/9 |
| Faible | CSP complète | Seule `frame-ancestors` est posée | rapport étape 1 #4 → étape 9 |
| Moyenne | Commandes écrites par le navigateur | Fausses commandes « payées », e-mails de confirmation déclenchables vers n'importe qui | PLAN #2 → étape 5 (webhook) |
| Moyenne | Lecture publique de `autorisations` | Permet de deviner les e-mails admin | PLAN #8 → étape 4 (custom claim) |
| Moyenne | Brouillons lisibles et vendables | Livraison B de l'étape 0 : filtre `published`, règle `produits`, `REQUIRE_PUBLISHED = true` | rapport étape 0 → après publication des produits par Jaelle dans `/createur` |
| Moyenne | Staging | Créer `jaellejc-staging` (forfait Blaze), `functions/.env.jaellejc-staging` (`ALLOWED_ORIGINS`), clés de test Stripe/Brevo, variables « Preview » de Vercel vers le staging, protection des aperçus | `SECURITE.md` §1 |
| Faible | Cache court du catalogue | Chaque requête relit le catalogue | rapport étape 2 F4 → étape 7/9 |
| Faible | Optimiseur d'images | Bucket du test accepté aussi en production | rapport étape 2 F6 → étape 10 |
| Faible | App Check, limitation de débit | Contact, newsletter, connexion | étape 9 |

## À faire — fonctionnel

| Sujet | Détail | Origine |
|---|---|---|
| Inscription newsletter probablement cassée en production | `Newsletter.tsx:19` et `Footer.tsx:20` lisent `newsletter` (refusé au public) avant d'écrire | `reports/qa/etape-0.md` Q1 |
| Design de l'espace créatrice | Aligner sur la marque (logo, bordures 0,5 px, pas d'ombres ni d'arrondis) | QA Q2 → étape 7 |
| Erreur de types `ProductDetail.tsx:38` | Corrigée avec la livraison B | rapport QA |
| `src/lib/mail.ts` | Code mort | QA Q4 → suppression avec `legacy/` |
| Émulateur des fonctions | Délai dépassé au chargement (10 s) en local ; utile seulement pour tester Stripe en local | étape 5 |
| Fonction `onProductAdded` | Texte à trous et brouillon de blog automatiques à supprimer | `BACKOFFICE.md` §5 → étape 7 |

## Étape 2 — catalogue rendu côté serveur (2026-10-28)

- Accueil, collections, fiche `/produits/<slug>`, journal `/blog/<slug>` : rendus côté serveur, identiques à l'ancien site (24 comparaisons visuelles), SEO 100 en mode production (`reports/qa/etape-2.md`).
- Fiche produit : accroche en citation ; rubriques Description, Matières & Entretien, Dimensions & détails, Livraison & Retours ; aussi sur mobile (ajout voulu). Rubriques vides masquées.
- Anciennes adresses redirigées en 301 (`/product/<id>`, `/blog/1…4`).
- Les 4 articles du journal sont dans le code (`src/server/content/articles.ts`), comme dans l'ancien site ; passage dans la base avec l'espace créatrice (étape 7).
- Compte Google de Jaelle : vérification d'identité déclenchée le 2026-10-28 par des actions de console faites depuis le navigateur intégré de Claude. Désormais : console Google seulement depuis le Chrome habituel de Jaelle (Claude in Chrome) ou clic par clic par Jaelle.

**Pour voir le catalogue sur l'aperçu Vercel (dès que Google débloque la console, environ 5 minutes) :**
1. Créer un compte technique « site-apercu » sur `jaellejc-staging`, rôle « Lecteur Cloud Datastore » seulement (le site public ne fait que lire à ce stade).
2. Créer sa clé, puis la coller dans Vercel → Settings → Environment Variables → `FIREBASE_SERVICE_ACCOUNT`, environnement **Preview uniquement** (jamais Production). Saisie faite par Jaelle (secret).
3. Supprimer le fichier de clé de l'ordinateur juste après.
Jusque-là, l'aperçu affiche « L'atelier est momentanément indisponible » sur les pages catalogue.

## Projet de test et compte technique `scripts-test` (étape 1bis, 2026-10-24)

Projet `jaellejc-staging` : Firestore Standard à Paris (europe-west9), règles « tout fermé » à la création ; connexion par e-mail + mot de passe et par lien e-mail activée. Stockage des photos : non activé (forfait Blaze requis, à faire par Jaelle si besoin ; les photos du test pointent vers celles du site actuel).

Compte technique `scripts-test@jaellejc-staging.iam.gserviceaccount.com` : identité des scripts locaux (copie du catalogue, migration, règles du test). Créé et doté de ses droits par Claude avec l'autorisation explicite de Jaelle (2026-10-24).

**Protections en place (à respecter à chaque étape) :**

| # | Protection | Comment c'est vérifié |
|---|---|---|
| P1 | Droits limités au projet de test : Utilisateur Cloud Datastore, Administrateur Firebase Authentication, Administrateur des règles Firebase. Ni Propriétaire, ni Éditeur, ni facturation, ni droit de donner des droits. Aucun accès à `jaellejc` (production). | Console IAM du projet de test ; toute action sur la production est refusée par Google |
| P2 | Personne d'autre n'a accès au compte (« Principaux avec accès » laissé vide). | Console IAM |
| P3 | Une seule clé, rangée dans `C:\Users\hfent\.secrets\`, hors du dossier du code et hors de OneDrive (synchronisé dans le cloud). | `scripts/lib/admin.ts` refuse de démarrer sinon (testé : clé absente, dans le code, dans OneDrive, introuvable) |
| P4 | La clé n'est jamais ouverte, affichée, copiée dans la conversation, ni commitée. | `.gitignore` (motifs de fichiers de clé) + gitleaks à chaque envoi sur GitHub |
| P5 | Les scripts refusent la production sans `--confirmation JE-MODIFIE-LA-PRODUCTION`, réservée à Jaelle à la bascule. | `scripts/lib/admin.ts` (testé) |
| P7 | Fichier de clé lisible par le seul compte Windows de Jaelle (héritage des droits coupé), retiré du dossier Téléchargements dès sa création ; chemin donné commande par commande, jamais enregistré dans les réglages de Windows. | `icacls` sur le fichier (2026-10-24) |
| P8 | Règles du test publiées avec le seul droit « Administrateur des règles Firebase » (`scripts/deploy-rules.ts`), sans ajouter de droit pour Firebase CLI ; aucun compte Google personnel connecté à Firebase CLI sur cet ordinateur. | `firebase login:list` : aucun compte |
| P6 | Le test ne contient aucune donnée client : catalogue public et données fictives uniquement. | `scripts/copy-catalogue-to-staging.ts` (aucune lecture de commandes, profils ou messages réels) |

**En cas de doute (clé perdue, ordinateur volé) :** console Google Cloud → IAM → Comptes de service → `scripts-test` → Clés → supprimer la clé. Puis vider la base de test et la remplir de nouveau avec les scripts. Aucun effet sur la boutique.

**À faire à la bascule (étape 10), avant la mise en ligne :**
1. Supprimer la clé du compte `scripts-test` (console IAM) et effacer le fichier de `C:\Users\hfent\.secrets\`.
2. Désactiver le compte `scripts-test` s'il ne sert plus au test.
3. La migration de la production se lance avec un accès donné par Jaelle pour l'occasion et retiré juste après (comme la déconnexion de Firebase CLI à l'étape 0), jamais avec ce compte.
4. Vérifier dans la console IAM de la production qu'aucun compte de service ni aucune clé inconnue n'existe.
5. Boutique gelée pendant la migration de production (aucune vente, aucune modification dans l'ancien tableau de bord) ; le script refuse d'écraser un document modifié entre sa lecture et son écriture (rapport de sécurité 1bis, M1).
6. Ne jamais lancer `firebase deploy` des règles vers la production depuis `refonte-next` avant la migration et la pose du droit admin : l'ancien site et son tableau de bord seraient bloqués (rapport 1bis, R2).
7. Après validation de la migration : vider le champ `legacy` des commandes, qui recopie des données personnelles (rapport 1bis, F5).

## Étape 1 — socle Next.js (2026-10-24)

- Ancien site dans `legacy/` ; nouveau site Next.js 16 identique au pixel près sur le Layout (`reports/qa/etape-1.md`).
- Firebase 10 → 13 et firebase-tools 14 → 15 : failles élevées supprimées.
- Catégories du menu : liste fixe provisoire (Bébé, Coffrets, Femmes), remplacée par la base à l'étape 2.
- Boutons panier, compte, recherche et formulaire newsletter visibles mais inactifs jusqu'aux étapes 1bis à 4.
- Rapports : `reports/securite/etape-1.md`, `reports/qa/etape-1.md`.

## E-mails du parcours d'achat (à concevoir, étape 5)

Souhait de Jaelle : 4 à 5 e-mails — création de compte, paiement validé, commande validée avec date de livraison, retard éventuel, satisfaction.

Point d'attention pour la conception : une connexion MCP à Gmail et des skills servent à Claude (rédiger, préparer, envoyer à la demande). Les e-mails **automatiques** du site (paiement validé, etc.) doivent partir du serveur sans intervention, au moment de l'événement (webhook Stripe). Il faudra choisir l'expéditeur côté serveur (API Gmail / Google Workspace, ou un service transactionnel) et vérifier les limites d'envoi, la délivrabilité (SPF, DKIM, DMARC du domaine) et le RGPD. Les e-mails de retard et de satisfaction peuvent être préparés par Claude puis validés par Jaelle.

## Mise en production de l'étape 0 — liste de contrôle

1. Vercel : variables `VITE_FIREBASE_*` saisies pour l'environnement « Production » (`.env.local` n'est plus dans git).
2. Firebase CLI connectée par Jaelle, accès au projet de production.
3. Document `autorisations/<e-mail de Jaelle>` avec `actif: true`, compte Google à e-mail vérifié.
4. Déploiement des règles Firestore + Storage et des fonctions vers la production (accepter l'autorisation « Storage → Firestore » proposée au premier déploiement des règles Storage).
5. Fusion de `hotfix` dans `main` juste après (le nouveau paiement exige les deux en même temps).
6. Vérifications après mise en ligne : `/login`, `/createur`, ajout au panier puis page Stripe, formulaire de contact, refus des cookies.
