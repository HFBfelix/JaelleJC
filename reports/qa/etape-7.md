# Rapport QA — Étape 7 : espace créatrice `/createur`

Date : 2026-10-30 · Branche : `refonte-next` · Environnement : local (Windows 11, `next start` construit, émulateurs Firestore, Authentication et **Storage**, faux serveur Stripe et **faux serveur IA** `tests/e2e/fake-stripe.ts`, clés de test tirées au hasard hors du dépôt). Aucun appel à Stripe ni à OpenAI.

## Ce qui a été livré

- **Cadre** : espace hors du gabarit du site, comme l'ancien Dashboard (fond crème `#F5F2EE`, cartes blanches, lignes de 0,5 px, typographie Atelier, aucun texte sous 11 px, pas d'italique). En-tête « Atelier », onglets À faire, Produits, Commandes, Stocks, Catégories, Réglages, Messages ; « Voir le site », déconnexion.
- **7a — Produits**
  - Liste avec recherche et filtre par statut ; création d'une nouvelle pièce.
  - Fiche guidée en 6 étapes, avec un aperçu en direct :
    1. **Photos** : réduites dans le navigateur (2 400 px, JPEG), position GPS retirée, nom aléatoire sous `produits/<id>/`, ordre, couverture, texte alternatif.
    2. **L'essentiel** : nom, adresse figée après la première mise en ligne, univers, famille, prix.
    3. **Détails** : matières, entretien, dimensions, série limitée, emballage cadeau, **cas d'usage** (prévus pour la recherche par usage de l'étape 7bis), mots-clés.
    4. **Variantes** : grille coloris × tailles, stock par variante ; une variante retirée est désactivée, jamais supprimée.
    5. **Textes** : accroche, histoire, description, FAQ. « Proposer un brouillon » envoie à l'IA les seuls faits saisis ; 2 propositions par champ, « Utiliser », « J'ai relu les textes ».
    6. **Publication** : liste de contrôle, « Mettre en ligne », aperçu privé, remettre en brouillon, archiver, dupliquer, supprimer un brouillon jamais publié.
  - Enregistrement automatique d'un brouillon en changeant d'étape ; une pièce en ligne n'est modifiée qu'en restant complète.
  - **Aperçu privé** `/createur/apercu/<id>` : la vraie fiche, dans le gabarit du site, sans bouton d'achat. Le corps de la fiche publique est partagé (`ProductDetail.tsx`), avec un rendu inchangé (comparaison visuelle 24/24).
- **7b — Commandes et stocks**
  - **Commandes** : filtrées par statut (à préparer, en préparation, expédiées, livrées). Le détail montre les pièces, le message cadeau à joindre, l'adresse et le contact. « Passer en préparation », « Marquer comme expédiée » (Colissimo, Lettre suivie ou autre, avec le numéro **recopié** ; le lien La Poste est généré), « Marquer comme livrée ».
  - La cliente voit aussitôt le suivi dans son compte. L'e-mail « colis parti » est marqué « en attente » et sera envoyé à l'étape 7bis.
  - Remboursement et annulation : depuis Stripe (décision de Jaelle).
  - **Stocks** : tableau de toutes les variantes, modifiable ligne par ligne, avec un filtre « stocks bas ».
- **7c — Le reste**
  - **À faire** : commandes à préparer, stocks bas, messages non lus, brouillons, fiches à compléter.
  - **Catégories** : univers et familles. L'adresse est figée, et une famille utilisée par une pièce ne peut pas être retirée.
  - **Réglages** : livraison (seuil, frais, zones, délai), appliquée aussitôt au panier et au paiement et journalisée ; informations de la maison.
  - **Messages et newsletter** : lecture, « Marquer comme lu », export CSV pour Excel.
- **Retraits**
  - `onProductAdded` est retirée du code des fonctions (effet en production au déploiement des fonctions de la bascule).
  - `dashboard.html` n'existe plus que dans `legacy/`, supprimé avec ce dossier à l'étape 10.

## Vérification visuelle

| # | Écran | Capture |
|---|---|---|
| V1 | À faire (ordinateur, mobile) | `reports/qa/etape-7/tableau-de-bord.png`, `tableau-de-bord-mobile.png` |
| V2 | Produits | `produits.png` |
| V3 | Fiche : l'essentiel avec aperçu en direct, variantes, publication | `fiche-essentiel.png`, `fiche-variantes.png`, `fiche-publication.png` |
| V4 | Stocks, réglages | `stocks.png`, `reglages.png` |

Pages publiques : `npm run test:visual` **24/24**, fiche produit comprise après le partage de son corps avec l'aperçu.

## Parcours testés

| Parcours | Résultat | Preuve |
|---|---|---|
| Anonyme et cliente ordinaire : espace, fiche, aperçu, commandes, stocks → connexion dédiée ; envoi de photo refusé (401), et depuis un autre site (403), sans rien écrire | OK | `createur-produits.spec.ts`, `createur-commandes.spec.ts` |
| Fiche guidée de bout en bout : photo (chemin aléatoire, jamais le nom d'origine), prix 45,50 → 4550 centimes, cas d'usage, stock, brouillon IA (seuls les faits partent, aucune donnée de compte), publication bloquée tant que le brouillon IA n'est pas relu, mise en ligne, page publique en 200, journal (création, stock, publication) | OK | `createur-produits.spec.ts` « fiche guidée » |
| Pièce en ligne : impossible de l'enregistrer sans accroche ; archivée → 404 publique | OK | idem |
| Vente pendant la saisie du stock (fiche et tableau) : rien n'est écrasé, message, rechargement | OK | « stock », `createur-commandes.spec.ts` « stocks » |
| Aperçu privé d'un brouillon ; brouillon introuvable pour le public ; suppression d'un brouillon jamais publié | OK | « aperçu privé » |
| Commande : préparation → expédition (numéro piégé refusé ; « 6a 1234 5678 901 » → `6A12345678901`, lien La Poste) → suivi visible par la cliente → livrée ; journal des trois étapes | OK | `createur-commandes.spec.ts` |
| Message non lu dans « À faire », texte `=HYPERLINK(…)` affiché brut, export CSV neutralisé, « lu » → compteur −1 | OK | `createur-site.spec.ts` |
| Livraison 7,90 € → 790 centimes, journalisé ; nouvel univers et sa famille | OK | idem |

Commandes : suite complète (mobile, ordinateur, Safari iPhone) → **175 réussis**, 62 ignorés. 6 échecs pendant une mise en veille du PC (`ERR_NETWORK_IO_SUSPENDED`, durées de 3 minutes) : les fichiers concernés, relancés → **19/19**. Firefox : CI.

## Tests automatiques

`npm test` : **303** tests, tous verts. Dont :
- `createur/logic.test.ts` : saisie, variantes, liste de contrôle, slug, SKU, type réel des photos (SVG, HTML, PDF refusés) ;
- `createur/actions.test.ts` : 12 actions refusées sans droit admin, entrées trafiquées refusées avant la base ;
- `createur/orders.test.ts` : transitions de statut, numéro de suivi, lien https ;
- `createur/site.test.ts` : injection de formule CSV, saisies des réglages, 5 actions refusées sans droit.

Règles : `tests/rules/rules.test.mjs` **109/109**, dont `aiQuota` fermé à tous et aucune écriture de produit ou de variante depuis le navigateur, admin comprise. `npm run typecheck`, `npm run lint` : propres.

## Points ouverts

| # | Point | Qui |
|---|---|---|
| Q1 | **Critère de fin de l'étape** : vous créez et mettez en ligne une pièce seule, de la photo à la publication, sur ordinateur. À faire sur le projet de test quand l'aperçu Vercel sera branché | Jaelle |
| Q2 | Envoi de photos sur le projet de test : stockage Firebase à activer (forfait Blaze) | Jaelle |
| Q3 | Brouillon IA : clé OpenAI dans Vercel, environnement Preview seulement | Jaelle |
| Q4 | Suppression automatique (TTL) sur `aiQuota.expiresAt` : projet de test maintenant, production à la bascule | Jaelle (console) |
| Q5 | Pièces migrées : la plupart affichent « à compléter » (textes alternatifs vides, accroche). Elles restent en vente, mais toute nouvelle publication exige une fiche complète | Jaelle |
| Q6 | Textes de l'espace créatrice à relire (libellés, aides, messages) | Jaelle |
