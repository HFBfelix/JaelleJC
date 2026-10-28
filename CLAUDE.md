# CLAUDE.md — Refonte jaellejc.com

> Lis ce fichier en entier, puis `PLAN.md` (étape en cours), `EDITORIAL.md` (tous les textes), `BACKOFFICE.md` (espace créatrice et base de données) et `SECURITE.md` (environnements, mise en ligne, tests et rapports).
> En cas de doute sur la sécurité, le paiement, le stock ou les données clients : STOP et pose la question.

## 1. Projet

Boutique de cadeaux de naissance cousus main en Île-de-France (Jaelle & JC). Le site existe déjà (Vite + React + Firebase + Stripe, hébergé sur Vercel). On le refait proprement, sans changer son identité visuelle.

Priorités, dans l'ordre : 1) sécurité et exactitude (prix, stock, paiement) 2) expérience fluide et sobre 3) SEO et visibilité dans les moteurs IA 4) code simple à relire.

Périmètre : France, euros, petit catalogue, livraison à domicile, emballage cadeau avec message, suivi de colis par e-mail.

## 2. DESIGN SYSTÈME : INTERDIT D'Y TOUCHER

Le rendu visuel actuel est la référence. La refonte change l'architecture, pas l'apparence, à une exception près : la typographie « Atelier » décidée par Jaelle le 28/10/2026.
- Polices (direction « Atelier ») : Crimson Pro 400 droit (titres) et Source Sans 3 400/600 (texte), chargées par `next/font`. Corps de texte 14 px / interligne 1.7. Pas d'italique.
- Règles de taille : aucun texte sous 11 px ; petites capitales espacées de 0,12 em au plus ; la police à empattements seulement à partir de 18 px (en dessous, Source Sans 3).
- Couleurs : blanc, noir, gris galerie `#F7F7F7`, fond de confirmation `#F5F2EE`. Aucune couleur ajoutée.
- Bordures 0,5 px, rayon d'arrondi 0 partout (sauf éléments déjà ronds aujourd'hui).
- Petites capitales (`uppercase tracking-[0.12em]`), lignes fines, beaucoup d'espace.
- Logos et images : `public/assets/` tels quels. Ne jamais les redessiner, recolorer ni recadrer.
- Le fichier `tailwind.config.ts` est repris à l'identique, sauf les polices et la taille du corps de texte (direction « Atelier »).
- Chaque composant porté vers Next.js doit rendre le même résultat visuel, typographie « Atelier » mise à part. Avant/après vérifiés par captures d'écran (Playwright) sur mobile et desktop.
- Seul le CONTENU TEXTUEL change, et uniquement selon `EDITORIAL.md`.

## 3. Stack cible (ne pas en changer sans accord)

- Next.js (App Router) + TypeScript strict, déployé sur Vercel
- Tailwind (config actuelle), polices via `next/font`
- Firebase conservé : Firestore, Authentication, Storage
  - Client SDK : uniquement pour l'authentification dans le navigateur
  - `firebase-admin` : tout le reste, côté serveur uniquement (Route Handlers, Server Actions)
- Stripe Checkout (page hébergée par Stripe) + webhook
- Brevo pour les e-mails (fonctions existantes réutilisées, corrigées)
- Zod pour valider toute entrée externe
- Tests : Vitest (logique), Playwright (parcours), émulateurs Firebase en local
- Pas de nouvelle dépendance sans justification et accord.

## 4. Règles d'architecture (non négociables)

### Panier
- Le panier vit côté serveur : collection Firestore `carts`, inaccessible depuis le navigateur (règles : tout refusé, accès par Admin SDK uniquement).
- Visiteur : cookie `cart_token` (HttpOnly, Secure, SameSite=Lax), jeton aléatoire ; seule son empreinte (hash) est stockée.
- Durée de vie 7 jours, renouvelée à chaque activité (`CART_TTL_DAYS = 7`), champ `expiresAt` + politique TTL Firestore.
- Le panier ne contient que `productId` + `variantId` + `quantité`. Jamais de prix, nom ou image.
- À la connexion : fusion du panier visiteur dans celui du compte (quantités additionnées, plafonnées au stock).
- Le badge du header (+1, +2…) se lit depuis le serveur ; interface optimiste permise mais réconciliée.
- Ajout au panier : le tiroir s'ouvre, le client continue ses achats (comportement actuel conservé).

### Le serveur est la seule source de vérité
- Le navigateur n'envoie jamais un prix ni un total. Le serveur relit les produits en base à chaque calcul.
- Calculs en centimes (entiers). Le champ `price` actuel est converti en `priceCents` (script de migration, avec sauvegarde préalable).
- Livraison (seuil de gratuité, tarif) lue depuis `settings/delivery` côté serveur.
- Une commande conserve un instantané (noms, prix, adresse).

### Commandes et paiement
- Aucune commande n'est créée par le navigateur. Les règles Firestore interdisent toute écriture client dans `orders`.
- Le serveur crée la session Stripe (prix relus en base) en y mettant l'identifiant du panier en métadonnée.
- La commande est créée UNIQUEMENT par le webhook Stripe `checkout.session.completed` : signature vérifiée, corps brut, idempotent (table des événements traités).
- Stock tenu par variante (coloris × taille) : vérifié au clic sur « Payer », décrémenté en transaction dans le webhook. Stock insuffisant après paiement : remboursement automatique + e-mail d'excuses.
- La page de confirmation lit la commande en base ; elle ne crée rien.
- Clés secrètes Stripe/Brevo/OpenAI : variables d'environnement serveur ou secrets Firebase, jamais dans le code ni côté navigateur.

### Authentification : DEUX méthodes
- Lien magique (lien de connexion Firebase par e-mail) ET e-mail + mot de passe. Le client choisit.
- Parcours sans compte au clic « Payer » : un seul champ e-mail, puis « Recevoir un lien » ou « Utiliser un mot de passe ». Le compte est créé automatiquement, le panier est conservé.
- Session serveur : cookie de session Firebase (HttpOnly, Secure, SameSite=Lax), vérifié côté serveur.
- Activer la protection contre l'énumération d'e-mails et une politique de mot de passe d'au moins 10 caractères.
- Réponses identiques que l'e-mail existe ou non.
- Administrateurs : revendication personnalisée `admin: true` (custom claim), vérifiée côté serveur à chaque requête. La lecture publique de `autorisations` est supprimée.
- App Check activé sur les formulaires publics (contact, newsletter).

### Règles Firestore et Storage
- Produits : lecture publique uniquement si `status == 'published'` ; brouillons réservés aux admins.
- `orders` : lecture par le client propriétaire (`userId == uid`) ou admin ; aucune écriture client.
- `users/{uid}` : le propriétaire lit et écrit, sans pouvoir modifier ses droits.
- `contacts`, `newsletter` : création publique avec validation des champs (type, longueur) ; lecture admin.
- Storage `produits/` : lecture publique, écriture et suppression réservées aux admins.
- Tout le reste : refusé par défaut. Les règles ont des tests automatisés (émulateur).

### Back-office et base de données (détails dans `BACKOFFICE.md`)
- Espace créatrice : `/createur`, connexion dédiée, droit `admin` vérifié côté serveur à chaque action. Une seule utilisatrice, surtout sur ordinateur.
- Modèle : `produits` + sous-collection `variantes` (coloris × tailles, stock par variante), `categories` avec familles à slug, prix en centimes, statut `draft` / `published` / `archived`.
- Le navigateur n'écrit jamais dans `produits`, `variantes`, `orders`, `carts`. Tout passe par des Server Actions validées avec Zod.
- Un produit ne se publie que si la liste de contrôle est complète (photos avec texte alternatif, prix, variante en stock, accroche, description, brouillon IA relu).
- Le brouillon IA est déclenché par clic, n'utilise que les faits saisis, n'écrit rien sans validation. Aucune génération automatique à la création d'un produit.
- Le site public ne lit que les produits `published`. Le formulaire de contact écrit dans `contacts` uniquement.
- Migration des données : script rejouable avec `--dry-run`, sauvegarde préalable, test sur le projet de test, aucun produit publié sans décision explicite de Jaelle.

### Sécurité générale
- HTTPS, en-têtes de sécurité (CSP, HSTS, X-Content-Type-Options, Referrer-Policy, frame-ancestors).
- Zod sur toutes les entrées ; échappement systématique du texte inséré dans les e-mails HTML.
- Pas de données personnelles dans les logs.
- Fichiers de configuration locaux (`.env*`, `.firebase/`, `.DS_Store`) dans `.gitignore`, jamais commités.
- Aucun fichier d'administration servi publiquement (retrait de `public/dashboard.html` après portage).

### RGPD
- Firebase Analytics et tout traceur ne se chargent qu'APRÈS consentement. « Continuer sans accepter » = aucun traceur.
- Bandeau de consentement non bloquant pour la navigation, choix refusables aussi simplement qu'acceptables.
- Pages légales à jour ; export et suppression des données depuis le compte.

## 5. SEO et visibilité dans les moteurs IA (GEO)

- Pages rendues côté serveur : le contenu est dans le HTML initial (les robots, dont ceux des IA, n'exécutent pas tous le JavaScript).
- URLs propres : `/produits/[slug]`. Redirections 301 depuis `/product/:id`.
- Par page : `<title>` et description uniques (voir `EDITORIAL.md`), URL canonique, Open Graph, une seule `<h1>`.
- Données structurées JSON-LD : `Organization`, `Product` + `Offer` (prix, disponibilité), `BreadcrumbList`, `Article` (blog), `FAQPage` là où une FAQ est visible.
- Sitemap et robots générés dynamiquement (produits et articles inclus). Pages privées en `noindex`.
- Faits clairs et citables sur chaque fiche : matière, dimensions, lieu de fabrication, taille de série. Aucune affirmation sans preuve.
- Images : `next/image`, texte alternatif descriptif.
- Objectif : Lighthouse mobile ≥ 90 (performance, accessibilité, SEO).

## 6. Règles de travail pour Claude Code

1. Travaille sur la branche `refonte-next`, jamais sur `main`. Chaque branche a un aperçu Vercel.
2. Une étape de `PLAN.md` à la fois. Ne commence pas la suivante sans mon accord.
3. Avant de coder : plan court (fichiers touchés, risques). Attends mon feu vert pour tout ce qui touche à l'authentification, au paiement, au stock, aux règles Firestore/Storage et aux données existantes.
4. Ne modifie que les fichiers de l'étape. Pas de refactorisation « au passage ».
5. Logique métier dans `src/server/<module>` (`catalog`, `cart`, `auth`, `checkout`, `orders`, `payments`, `emails`), pas dans les composants.
6. Toute règle métier (prix, fusion, stock, expiration) et toute règle Firestore ont un test.
7. Données : aucune commande destructive (suppression, réécriture massive) sans sauvegarde et accord explicite. Migrations par scripts rejouables.
8. Trois environnements (`SECURITE.md` §1) : local (émulateurs), test (projet Firebase `jaellejc-staging` + aperçus Vercel), production. Tu travailles en local et en test, avec les clés Stripe de TEST uniquement. Jamais d'identifiant ni de donnée de production sur cette machine. Tu ne déploies JAMAIS en production (ni `firebase deploy` vers la production, ni fusion dans `main`) : c'est Jaelle qui le fait, aux deux moments prévus (étape 0 et étape 10).
9. Ne jamais afficher, copier ni commiter un secret ou une clé.
10. Petits commits, un sujet par commit.
11. « Terminé » = types sans erreur, lint propre, tests verts, captures avant/après identiques (design), règles de ce fichier respectées, PORTE DE SÉCURITÉ passée (`SECURITE.md` §3) avec son rapport `reports/securite/etape-N.md`, rapport QA `reports/qa/etape-N.md`, résumé de 3 lignes maximum. Une anomalie Critique ou Élevée ouverte interdit de déclarer l'étape terminée.
12. À chaque nouvelle route, action ou collection : tests d'autorisation négatifs (anonyme, autre client, non-admin) et tests des règles Firestore/Storage dans l'émulateur, avant d'écrire le rapport.
13. Les rapports (`reports/`) sont commités avec le code. Un rapport ne se remplit pas de mémoire : chaque ligne renvoie à un test ou une commande exécutée.
14. Si une règle te gêne : ne la contourne pas, signale-le.

## 7. Variables d'environnement (noms uniquement)

Navigateur (publiques) : `NEXT_PUBLIC_FIREBASE_*`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`
Serveur (secrètes) : `FIREBASE_SERVICE_ACCOUNT`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `BREVO_API_KEY`, `OPENAI_API_KEY`
