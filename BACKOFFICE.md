# BACKOFFICE.md — Espace créatrice et base de données

Complète `CLAUDE.md` (règles) et `PLAN.md` (étapes). Le design du back-office reprend celui du Dashboard actuel (fond crème `#F5F2EE`, encre `#1A1814`, mêmes polices et bordures fines). Le design système ne change pas.

Utilisatrice : une seule personne (Jaelle), surtout sur ordinateur. Pas de gestion de rôles multiples en v1, mais le code vérifie le droit `admin` à chaque action.

## 1. Pourquoi la connexion échoue aujourd'hui (à corriger dès l'étape 0)

1. `/createur` renvoie vers `/login` tout visiteur non admin, et `/login` plante (`useEffect` non importé dans `Auth.tsx`). Le bouton « S'identifier » du Dashboard n'est jamais atteint.
2. L'accès exige un document `autorisations/<e-mail>` avec `actif: true`. S'il manque ou si l'e-mail diffère, la personne est déconnectée sans explication.

Dans la refonte : page de connexion dédiée `/createur/connexion`, message clair si le compte n'est pas administrateur, droit admin porté par une revendication `admin: true` (plus de collection `autorisations` lisible publiquement).

## 2. Nouvelle base de données (Firestore)

Montants en centimes (entiers). Dates en horodatage serveur. Les noms de collection actuels sont conservés quand c'est possible, pour limiter la migration.

### `produits/{productId}`
| Champ | Type | Règle |
|---|---|---|
| `slug` | texte | unique, généré depuis le nom, figé après la 1re publication |
| `name` | texte | requis |
| `categoryId`, `subCategory` | slugs | requis pour publier |
| `status` | `draft` / `published` / `archived` | `archived` = retiré du site mais conservé pour les commandes |
| `accroche` | texte (1 phrase) | requis pour publier |
| `histoire` | texte (2-3 phrases) | facultatif |
| `description` | texte | requis pour publier |
| `materials` | liste de textes | ex. « gaze de coton » |
| `entretien` | texte | facultatif ; n'écrire « lavable » que si c'est prouvé |
| `faq` | liste `{question, reponse}` | facultatif, alimente les données structurées |
| `images` | liste `{path, url, alt, order}` | 1re = couverture ; texte alternatif requis |
| `priceCents` | entier | prix TTC de base, requis |
| `limitedEditionSize` | entier | facultatif, purement informatif : « Série limitée de N exemplaires » |
| `giftWrap` | booléen | emballage cadeau proposé (défaut : oui) |
| `tags` | liste | remplace `seo_tags` en texte libre |
| `inStock` | booléen | calculé (au moins une variante active avec stock) ; sert aux listes |
| `aiDraft` | `{generatedAt, reviewed}` | `reviewed: false` bloque la publication |
| `publishedAt`, `createdAt`, `updatedAt`, `updatedBy` | dates / uid | |
| `legacy` | `{oldPrice, oldCategory}` | traçabilité de la migration, supprimé à la fin |

### `produits/{productId}/variantes/{variantId}`
`sku` (auto, modifiable), `color`, `size`, `priceCents` (facultatif, remplace le prix de base), `stock` (entier ≥ 0), `dimensions` (texte, ex. « 70 × 70 cm »), `active`, `order`.
Un produit sans coloris ou sans taille a une seule variante (« Unique »). Le stock est tenu PAR variante.

### `categories/{slug}`
`name`, `order`, `intro` (texte éditorial de la page catégorie), `subs` : liste `{slug, name}` (aujourd'hui une simple liste de textes).

### `orders/{orderId}` (créée uniquement par le webhook Stripe)
`items` (instantané : `productId`, `variantId`, `sku`, `name`, `variantLabel`, `unitPriceCents`, `quantity`, `image`), `amounts` (`subtotalCents`, `deliveryCents`, `totalCents`), `customer` (`uid` ou null, `email`, `name`, `phone`), `shipping` (adresse structurée), `gift` (`wrap`, `message`), `stripe` (`sessionId`, `paymentIntentId`, `eventId`), `status` (`paid` → `preparing` → `shipped` → `delivered`, ou `refunded` / `cancelled`), `tracking` (`carrier`, `number`, `url`), dates.
L'empreinte de carte (`cardFingerprint`) n'est plus conservée : donnée inutile, à supprimer (minimisation RGPD).

### Autres collections
- `carts/{cartId}` : `tokenHash`, `userId` ou null, `items` (`productId`, `variantId`, `quantity`), `expiresAt`. Aucun accès depuis le navigateur.
- `users/{uid}` : profil ; sous-collection `adresses`.
- `settings/delivery` : `freeThresholdCents`, `flatRateCents`, `zones`, `estimatedDays`. `settings/site` : informations de la maison pour les données structurées (nom légal, adresse, e-mail, Instagram).
- `articles_blog` : `slug`, `title`, `excerpt`, `content`, `status`, `publishedAt`, `productIds`. Fin de la création automatique de brouillons vides.
- `contacts` : seule collection pour le formulaire de contact (`messages` est fusionnée dedans). Champs validés (longueur, e-mail).
- `newsletter` : `email`, `consentAt`, `source`. Confirmation par e-mail recommandée.
- `auditLog` : `who`, `action`, `target`, `at` (publication, changement de prix, de stock). Écrit par le serveur uniquement.

### Règles Firestore (rappel)
Lecture publique des seuls produits `published` et de leurs variantes actives ; aucune écriture client sur `produits`, `variantes`, `orders`, `carts`, `auditLog` (tout passe par le serveur) ; `users` lisibles et modifiables par leur propriétaire ; `contacts` et `newsletter` en création seule, avec validation. Chaque règle est testée avec l'émulateur.

## 3. Écrans du back-office

1. **Connexion** `/createur/connexion` : lien magique ou mot de passe. Message explicite si le compte n'est pas administrateur.
2. **Tableau de bord** : « À faire » (commandes à expédier, produits en brouillon, stocks bas, messages non lus).
3. **Produits** : liste avec recherche et filtre par statut ; actions Modifier, Dupliquer, Archiver. Pas de suppression définitive d'un produit déjà commandé.
4. **Fiche produit** : voir section 4.
5. **Commandes** : liste par statut, détail, bouton « Marquer comme expédiée » (transporteur + numéro de suivi, envoie l'e-mail au client).
6. **Stocks** : tableau des variantes modifiable en ligne.
7. **Catégories** : noms, familles, texte d'introduction.
8. **Réglages** : livraison (seuil, tarif, délai) et informations de la maison.
9. **Messages et newsletter** : lecture, export.
L'onglet « Clients », vide aujourd'hui, est reporté en v2.

## 4. Parcours de mise en ligne d'un produit

Une seule page, avec une colonne d'étapes à gauche et un aperçu en direct de la fiche telle que le client la verra.

1. **Photos** : glisser-déposer, réorganiser, choisir la couverture, saisir un texte alternatif pour chacune. JPEG, PNG ou WebP, 10 Mo maximum (photos d'iPhone en JPEG). Envoi direct vers Firebase Storage sous `produits/{productId}/{identifiant aléatoire}.{ext}` (jamais le nom d'origine du fichier). Redimensionnement et WebP assurés par `next/image`.
2. **L'essentiel** : nom, univers, famille, prix TTC.
3. **Détails** : matières, entretien (facultatif), série limitée (facultatif), emballage cadeau.
4. **Variantes** : grille coloris × tailles avec stock et dimensions par case. SKU générés automatiquement.
5. **Textes** : accroche, histoire, description, FAQ. Bouton « Proposer un brouillon » (section 5).
6. **Aperçu et publication** : liste de contrôle ; le bouton « Mettre en ligne » reste inactif tant qu'un élément manque :
   - au moins une photo, chacune avec un texte alternatif
   - prix, catégorie, famille
   - au moins une variante active avec stock
   - accroche et description présentes
   - brouillon IA, s'il y en a un, marqué « relu »
   Un lien d'aperçu privé (`noindex`, réservé à l'admin) permet de voir la page avant publication.

À la publication : `status = published`, `publishedAt`, `inStock` recalculé, pages concernées et sitemap régénérés automatiquement, entrée dans `auditLog`. Boutons « Remettre en brouillon » et « Archiver » disponibles. Les modifications sont enregistrées en brouillon automatique ; un produit déjà en ligne n'est modifié qu'à la validation.

## 5. Brouillon IA : règles

- Déclenché uniquement par un clic. Exécuté côté serveur, clé dans les secrets, droit admin vérifié, limite d'appels par heure.
- Entrée : uniquement les faits saisis (nom, famille, matières, dimensions, entretien, taille de série, ton de `EDITORIAL.md`). Il est interdit à l'IA d'ajouter une matière, un label, une dimension, une vertu écologique ou un lieu de fabrication non fournis.
- Sortie : 2 propositions d'accroche, d'histoire et de description, affichées à côté du champ. Rien n'est écrit tant que Jaelle ne clique pas « Utiliser » sur chaque proposition.
- La fonction actuelle `onProductAdded` (texte à trous écrit automatiquement dans la base, brouillon de blog vide) est supprimée.
- Le fournisseur du modèle (OpenAI aujourd'hui, via un secret existant) peut être changé sans toucher au reste.

## 6. Migration des données existantes

Script rejouable `scripts/migrate-v2.ts`, avec mode simulation (`--dry-run`) qui n'écrit rien et affiche un rapport.

Avant tout : export complet de Firestore (sauvegarde), puis test sur le projet de test (staging).
1. Catégories : noms → slugs ; `subs` texte → objets.
2. Produits : `price` → `priceCents` (rapport si plus de deux décimales) ; slug généré (collisions gérées) ; `images` texte → objets avec `alt` vide ; une variante « Unique » créée à partir de l'ancien `stock` ; `seo_tags` → `tags`.
3. Statuts : le rapport liste tout produit sans `status` ou en `draft`. Jaelle décide, produit par produit, ce qui est publié. Rien n'est publié par défaut.
4. `messages` → `contacts` ; `orders` : montants convertis en centimes, anciennes valeurs gardées dans `legacy`.
5. `autorisations` → revendication `admin` posée par un script local (`scripts/set-admin.ts <e-mail>`), puis collection supprimée.
6. Les anciens champs restent lisibles pendant la transition. Nettoyage à l'étape 10, après validation.
Les produits migrés affichent des alertes « à compléter » (texte alternatif manquant, accroche absente). Elles n'empêchent pas la vente de ce qui est déjà en ligne, mais bloquent toute nouvelle publication incomplète.

## 7. Sécurité du back-office

- Toute écriture passe par des Server Actions / Route Handlers : cookie de session vérifié, revendication `admin` vérifiée, entrées validées avec Zod. Le navigateur n'écrit jamais directement dans `produits`, `variantes` ou `orders`.
- Storage : lecture publique de `produits/`, écriture et suppression réservées à `admin`, 10 Mo maximum, types d'image uniquement.
- Aucun fichier d'administration public (`public/dashboard.html` supprimé après portage).
- Les textes saisis sont échappés partout (site et e-mails).
- App Check activé sur la connexion et les formulaires publics.
