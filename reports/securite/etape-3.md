# Rapport de sécurité — Étape 3 : panier persistant côté serveur

Date : 2026-10-29 · Branche : `refonte-next` · Environnement testé : local (`next start` construit sur l'émulateur Firestore, règles du dépôt chargées ; catalogue réel migré + jeu fictif des parcours).

## Périmètre

- Nouveau module `src/server/cart/` : jeton et cookie (`token.ts`), règles pures (`logic.ts`, `offers.ts`), accès Firestore (`repository.ts`, `server-only`), panier du visiteur courant (`service.ts`, `server-only`), Server Actions (`actions.ts`).
- `src/proxy.ts` : renouvellement de la durée du cookie à chaque visite.
- Interface : `src/components/cart/*`, bouton d'achat, badge du header, page `/panier` (noindex, exclue de `robots.txt`).
- Catalogue : variantes actives transmises à la fiche (identifiant, libellé, disponibilité).
- Schéma `carts` : `expiresAt`, `updatedAt` ajoutés.

Aucune règle Firestore ou Storage modifiée (`git diff firestore.rules storage.rules tests/rules` vide) : `carts` reste refusé à tout client par la règle par défaut. Aucune nouvelle dépendance.

## Contrôles effectués

| Contrôle | Cas testé | Résultat | Preuve |
|---|---|---|---|
| 1. Secrets | Motifs de clés (Brevo, Stripe, Google, clé privée) dans le diff et les nouveaux fichiers | OK (0) | recherche `grep -E` ; gitleaks en CI à l'envoi |
| 2. Dépendances | `npm audit --omit=dev` ; `npm audit --audit-level=high` | 0 ; 0 élevée (5 moyennes, outils de développement, inchangé) | commandes exécutées |
| 3. Autorisations : anonyme | Ajout, modification, lecture : uniquement son propre panier (cookie) ; aucun cookie sans ajout réel | OK | `panier.spec.ts` « autre visiteur » |
| 3. Autorisations : autre visiteur | Ne voit pas le panier d'un autre ; un cookie inventé ou trafiqué ouvre un panier vide | OK | `panier.spec.ts` « autre visiteur », « cookie inventé ou trafiqué » |
| 3. Client connecté, administrateur | Sans objet : pas de compte avant l'étape 4 (fusion de panier testée à l'étape 4) | — | — |
| 4. Règles Firestore | Lecture et écriture de `carts/{empreinte}` par l'API Firestore, sans authentification : refusées (403) | OK | `panier.spec.ts` « le navigateur ne peut pas lire un panier » ; `tests/rules/rules.test.mjs` (`carts`, inchangé, rejoué en CI) |
| 5. Entrées | Champs en trop (prix, nom, total), quantité nulle/négative/décimale/énorme/texte, identifiant chemin (`../carts/x`), vide, 129 caractères, entrée absente : refusés sans accès à la base | OK | `src/server/cart/actions.test.ts` (14 cas) |
| 6. Échappement | Noms et libellés affichés par React (texte) ; aucun HTML injecté | OK | relecture ; test « texte piégé » de l'étape 2 |
| 7. Prix | Aucun prix accepté du navigateur ; prix relu en base à chaque affichage ; prix modifié en base → panier mis à jour | OK | `actions.test.ts` ; `logic.test.ts` « le prix suit la base » ; `panier.spec.ts` « le prix suit la base » |
| 7. Stock | Plafond au stock de la variante et à 99 ; brouillon, archive, variante inactive ou absente, prix invalide : non vendables ; pièce dépubliée après l'ajout → retirée | OK | `logic.test.ts`, `offers.test.ts` ; `panier.spec.ts` « plafond au stock », « pièce retirée de la vente » |
| 7. Double clic | Bouton inactif pendant l'action ; modifications en transaction sur le document panier | OK | relecture ; `CartProvider.tsx` (`pending`) |
| 8. Abus | Création de paniers en masse sans cookie | **Moyenne, ouverte (M1)** | relecture indépendante |
| 9. Cookie | `cart_token` : HttpOnly, SameSite=Lax, Path=/, Max-Age 604800 (7 jours), illisible par `document.cookie` ; Secure partout sauf sur `localhost` en http | OK | `panier.spec.ts` « cookie » (en-tête `Set-Cookie` du serveur) ; `token.ts` |
| 9. Stockage | En base : empreinte SHA-256 seulement (jamais le jeton), `productId` + `variantId` + `quantity` seulement | OK | `panier.spec.ts` « cookie » |
| 9. Expiration | `expiresAt` passé → panier vide ; 7 jours renouvelés à chaque visite | OK | `logic.test.ts` ; `panier.spec.ts` « panier expiré » |
| 9. Journaux | Deux messages fixes, sans entrée, cookie ni donnée personnelle | OK | `grep console.` dans `src/server/cart`, `src/proxy.ts`, `src/components/cart` |
| 9. En-têtes | En-têtes de sécurité des étapes 1 et 2 inchangés | OK | `socle.spec.ts` |
| 10. Relecture indépendante | Diff de l'étape relu par un second agent (lecture seule) | 0 Critique, 0 Élevée ; 1 Moyenne, 3 Faibles, 3 Info | relecture du 2026-10-29, ci-dessous |

## Règles Firestore / Storage testées

| Collection | Appelant | Action | Attendu | Obtenu |
|---|---|---|---|---|
| `carts` | anonyme (API REST de l'émulateur) | lecture d'un panier existant | refus | 403 |
| `carts` | anonyme (API REST de l'émulateur) | écriture | refus | 403 |
| `carts` | client SDK, connecté ou non | lecture, écriture | refus | refus (`rules.test.mjs`, CI) |

## Anomalies

| # | Gravité | Description | Comment la reproduire | Correction | Statut |
|---|---|---|---|---|---|
| M1 | Moyenne | Création massive de paniers : un script qui ignore le cookie crée un document `carts` par ajout, sans limite de débit ; la suppression automatique (TTL) n'est pas encore active | Appeler l'action d'ajout en boucle sans cookie | 1) Politique TTL Firestore sur `carts.expiresAt` (projet de test maintenant, production à la bascule) ; 2) limitation de débit sur l'ajout (pare-feu Vercel, sans dépendance) à l'étape 9. Coût limité d'ici là : un document par pièce réellement en vente | Ouvert → TTL : Jaelle ; débit : étape 9. À corriger avant la bascule |
| F1 | Faible | Une visite pouvait réécrire le contenu du panier hors transaction et écraser un ajout fait au même moment dans un autre onglet | Deux onglets, ajout pendant le renouvellement horaire | Renouvellement : dates seules (`update`) ; correction du contenu : en transaction, sur le contenu relu | Corrigé |
| F2 | Faible | Les ajouts lisaient le stock dans la transaction et verrouillaient les documents de stock (gêne pour le futur webhook de paiement) | Ajouts en rafale pendant un paiement (étape 5) | Offres lues hors transaction ; seul le document panier est verrouillé ; le stock sera revérifié et décrémenté au paiement | Corrigé |
| F3 | Faible | Le stock reste déductible en demandant 99 pièces (quantité plafonnée), contrairement à un commentaire du code | Ajouter une pièce et monter la quantité | Inhérent au plafond au stock ; commentaire corrigé. À revoir si Jaelle tient au secret du stock | Accepté |
| I1 | Info | Attribut Secure décidé d'après l'en-tête `Host` (absent seulement pour `localhost`) | `Host: localhost` envoyé à soi-même | Sans effet sur un tiers ; Vercel route par domaine | Accepté |
| I2 | Info | Jeton jamais renouvelé : à la connexion, un cookie imposé par un tiers pourrait relier son panier au compte | — | Étape 4 : nouveau jeton et ancien document supprimé lors de la fusion | Ouvert → étape 4 |
| I3 | Info | L'action « modifier » pouvait ajouter une ligne absente (mêmes contrôles de vente et de stock) | — | Refusée (`error`) si la ligne n'existe pas (`logic.test.ts` « modifier : lignes existantes seulement ») | Corrigé, testé |
| — | Critique (héritée) | Clés Brevo dans l'historique public (étape 0, #1) | — | Révocation dans Brevo par Jaelle | Ouvert |

## Dépendances

`npm audit --omit=dev` : 0 vulnérabilité. `npm audit --audit-level=high` : 0 élevée, 5 moyennes (outils de développement, déjà consignées). Aucune dépendance ajoutée (`next/headers`, `node:crypto`, Zod déjà présents).

## Décision

**Go.** Aucune anomalie Critique ou Élevée propre à l'étape. Points ouverts : M1 (TTL à activer par Jaelle sur le projet de test ; limitation de débit à l'étape 9, avant la bascule), I2 (étape 4). Vérifié après corrections : `npm run typecheck`, `npm run lint`, `npm test` (132), parcours 95 réussis / 4 ignorés (mobile, ordinateur, Safari iPhone), `npm run test:visual` 24/24.
