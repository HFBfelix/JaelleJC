# PLAN.md — Refonte jaellejc.com

Règle : une étape à la fois, validée avant la suivante. Règles complètes dans `CLAUDE.md`.

## Constat sur l'existant (lecture du dépôt)

Stack actuelle : Vite + React (page unique), Firebase (Firestore, Auth, Storage, Functions), Stripe Checkout, Brevo, recherche IA (OpenAI), Vercel. Design système solide, conservé.

À corriger (à vérifier en production) :

| # | Problème | Risque |
|---|---|---|
| 1 | La fonction `createStripeCheckout` utilise les prix envoyés par le navigateur | Prix modifiable par le client |
| 2 | La commande est écrite par le navigateur après paiement (`Success.tsx`), sans webhook Stripe ; règle `orders: create if auth != null` | Fausses commandes « payées » possibles ; paiement sans commande si l'onglet est fermé ou si le client est invité |
| 3 | Stock jamais vérifié ni décrémenté | Survente |
| 4 | Panier uniquement en `localStorage` | Pas de retrouvailles multi-appareils, pas d'expiration |
| 5 | `Auth.tsx` utilise `useEffect` sans l'importer | Page de connexion probablement cassée |
| 6 | Storage : écriture/suppression ouverte à tout utilisateur à e-mail vérifié | Photos produits supprimables |
| 7 | E-mails Brevo : texte client inséré sans échappement ; contact et newsletter ouverts sans validation | Injection HTML, spam |
| 8 | `autorisations/{email}` lisible publiquement | Énumération des e-mails admin |
| 9 | Produits en brouillon lisibles publiquement | Fuite de produits non publiés |
| 10 | Firebase Analytics lancé même si le visiteur refuse | Non-conformité RGPD |
| 11 | `orders` lisibles par les admins seulement, mais `Checkout.tsx` les interroge côté client | Préremplissage d'adresse en échec silencieux |
| 12 | `.env.local`, `.firebase/`, `.DS_Store` commités ; `public/dashboard.html` et `public/index.html` (anciens) servis publiquement | Hygiène ; pages d'administration exposées (protégées seulement côté client) |
| 13 | SEO : mêmes balises meta partout, sitemap statique sans produits, pas de données structurées | Visibilité faible dans Google et les IA |
| 14 | Fichiers morts : `Header.tsx` (badge figé à 0), `types/index.ts` (SumUp, anciennes catégories) | Confusion pour Claude Code |
| 15 | Connexion à `/createur` impossible : redirection vers `/login` (page cassée) et dépendance à `autorisations/<e-mail>` | Boutique ingérable |
| 16 | Le site public ne filtre pas le statut des produits | Brouillons visibles par les visiteurs |
| 17 | Le formulaire de contact écrit dans `messages`, alors que règles et fonction attendent `contacts` | Messages de clients perdus |
| 18 | Dashboard : photos envoyées sans contrôle ni texte alternatif, « Intelligence Créatrice » = texte à trous, onglet Clients vide, ancien `dashboard.html` (SumUp, SKU) | Fiches pauvres, back-office à refaire |

Le scan du dépôt n'a trouvé aucune clé secrète serveur (Stripe, Brevo, OpenAI sont dans les secrets Firebase). Les identifiants `VITE_FIREBASE_*` sont publics par nature.

## Pourquoi Next.js et non Vite seul

Vite est un outil de construction, pas le point faible en sécurité : la sécurité dépend des règles Firestore, des fonctions serveur et de Stripe (voir ci-dessus). Il n'y a pas de PHP dans ce projet. Le vrai handicap est le rendu : une application Vite envoie une page vide que le navigateur remplit en JavaScript, ce qui nuit au référencement et aux moteurs IA. Next.js envoie le contenu déjà prêt dans le HTML, garde React, Tailwind et Vercel, et permet de garder Firebase sans migration de données.

## Méthode de travail avec Claude Code

1. Crée la branche `refonte-next`. Place `CLAUDE.md`, `PLAN.md`, `EDITORIAL.md` et `BACKOFFICE.md` à la racine.
2. Ancien code déplacé dans `legacy/` (lecture seule, référence). Il sera supprimé à l'étape 10.
3. Un projet Firebase de test (« staging ») en plus de la production. Émulateurs en local. Stripe en mode test. Trois environnements, chaîne Cursor/Claude Code → GitHub → Vercel et protection de `main` : voir `SECURITE.md` §1 et §2.
4. Chaque session : « Lis CLAUDE.md et PLAN.md. Fais uniquement l'étape N. Montre-moi ton plan avant de coder. » Mode plan pour les étapes 3, 4, 5.
5. `/clear` entre deux étapes pour repartir propre.
6. Chaque étape se termine par la porte de sécurité (`SECURITE.md` §3), un rapport de sécurité et un rapport QA dans `reports/`. Relecture sécurité du diff par un second agent avant chaque fusion.
7. Aperçu Vercel de la branche à chaque étape : tu valides à l'œil sur ton téléphone.
8. Les secrets se saisissent dans Vercel et Firebase, jamais dans la conversation.

## Étapes

**Étape 0 — Correctifs urgents sur le site actuel** (branche `hotfix`, déployable seule)
Sortir `.env.local`, `.firebase/`, `.DS_Store` de git ; importer `useEffect` dans `Auth.tsx` ; Storage réservé aux admins ; brouillons non lisibles publiquement ; échappement HTML dans les e-mails ; `createStripeCheckout` relit les prix et vérifie le stock côté serveur (le panier envoie l'identifiant produit) ; analytics après consentement ; `/createur` accessible (ne plus rediriger vers `/login`, vérifier le document `autorisations/<ton e-mail>` avec `actif: true`) ; le formulaire de contact écrit dans `contacts` ; le site public ne lit que les produits `published` (à faire APRÈS avoir marqué en ligne les produits voulus).
Terminé quand : connexion fonctionnelle, tu peux te connecter à `/createur` et gérer la boutique, un prix modifié dans le navigateur ne change pas le montant Stripe, un utilisateur ordinaire ne peut plus écrire dans Storage. Testé d'abord sur le staging ; première des deux mises en production. Les règles modifiées restent compatibles avec l'ancien code (voir `SECURITE.md` §2).

**Étape 1 — Socle Next.js**
Projet Next.js sur `refonte-next`, `tailwind.config.ts` repris, polices, `Layout` (header, menu, pied de page, bandeau cookies), `public/assets` repris. Captures de référence de l'ancien site (mobile + desktop) pour les comparaisons.
Terminé quand : le squelette s'affiche, identique à l'ancien, aperçu Vercel en ligne.

**Étape 1bis — Nouvelle base de données** (voir `BACKOFFICE.md`, sections 2 et 6)
Schéma `produits` + `variantes`, `categories`, `orders`, `carts`, `contacts`, `settings`. Règles Firestore et Storage réécrites avec tests (émulateur). Script de migration `--dry-run`, sauvegarde, test sur le projet de test, rapport validé par Jaelle, puis migration réelle.
Terminé quand : le rapport de migration est validé, les règles sont testées, aucun produit n'est publié sans ton accord.

**Étape 2 — Catalogue rendu côté serveur**
Accueil, collection, fiche produit (`/produits/[slug]`), blog. Lecture Firestore via Admin SDK. Redirections 301 depuis `/product/:id`. Métadonnées, JSON-LD, sitemap et robots dynamiques.
Terminé quand : le HTML initial contient le produit, le prix et les données structurées ; Lighthouse SEO ≥ 95.

**Étape 3 — Panier persistant côté serveur**
Collection `carts`, cookie, API, badge, tiroir, page panier, expiration 7 jours, plafond au stock.
Terminé quand : j'ajoute 3 pièces, je ferme tout, je reviens : tout est là. Test Playwright de persistance.

**Étape 4 — Authentification double**
Lien magique + mot de passe, session serveur, parcours « e-mail d'abord » au checkout, fusion de panier, revendication `admin`, suppression de la lecture publique de `autorisations`.
Terminé quand : les deux méthodes fonctionnent, un lien expiré est refusé, le panier invité est retrouvé après connexion.

**Étape 5 — Checkout, Stripe, commandes**
Session Stripe côté serveur, webhook signé et idempotent, création des commandes, décrémentation du stock en transaction, remboursement si stock insuffisant, option cadeau avec message, e-mails (fonctions Brevo corrigées), page de confirmation lisant la base.
Terminé quand : paiement réussi, échoué, webhook rejoué et stock insuffisant sont testés ; une commande n'existe jamais sans paiement confirmé.

**Étape 6 — Espace client**
Commandes, adresses, préremplissage du checkout, export et suppression des données.

**Étape 7 — Back-office `/createur`** (voir `BACKOFFICE.md`, sections 3 à 5 et 7)
Connexion dédiée, tableau de bord « À faire », liste des produits, fiche guidée en 6 étapes avec aperçu en direct et liste de contrôle, grille de variantes, brouillon IA relu, commandes (expédition avec suivi et e-mail), stocks, catégories, réglages, messages. Suppression de `public/dashboard.html` et de la fonction `onProductAdded`.
Terminé quand : Jaelle crée et met en ligne un produit seule, de la photo à la publication, sur ordinateur ; l'aperçu privé fonctionne ; aucune écriture n'a lieu depuis le navigateur.

**Étape 8 — Contenu éditorial et SEO/GEO**
Application de `EDITORIAL.md` : accueil, Notre promesse, fiches produit, FAQ, e-mails, microtextes. Données structurées complétées.

**Étape 9 — Durcissement, audit, pentest et QA** (voir `SECURITE.md` §4 et §5)
Règles Firestore/Storage testées, App Check, CSP, consentement analytics, pages légales relues, accessibilité, Lighthouse ≥ 90. Audit de sécurité complet (`reports/securite/final.md`), tests d'intrusion automatisés sur le staging avec ZAP et scénarios manuels (`reports/pentest/final.md`), QA finale (`reports/qa/final.md`), second passage après corrections. Revue externe par un professionnel recommandée avant l'ouverture du paiement en production.
Terminé quand : aucune anomalie Critique ou Élevée ouverte, les rapports finaux sont écrits et validés par Jaelle.

**Étape 10 — Bascule** (seconde mise en production ; ordre détaillé dans `SECURITE.md` §2)
Sauvegarde et test de restauration, migration (simulation puis réelle), déploiement des règles et fonctions, fusion dans `main`, test de paiement réel, surveillance 48 h. Aperçu validé, redirections vérifiées, Search Console (nouveau sitemap), webhook Stripe de production, domaine inchangé, plan de retour arrière, suppression de `legacy/` et de la configuration Firebase Hosting inutile. Comptes techniques : clé de `scripts-test` supprimée (console IAM et fichier local), compte désactivé, migration de la production avec un accès temporaire retiré juste après, aucune clé ni compte de service inconnu en production (détail : `reports/suivi.md`, « Compte technique scripts-test »). Boutique gelée pendant la migration ; aucun déploiement des nouvelles règles avant la migration et la pose du droit admin ; champ `legacy` des commandes vidé après validation (rapport `reports/securite/etape-1bis.md`).
