# Rapport QA — Étape 7bis : e-mails, relation client, recherche par usage, compte

Date : 2026-11-05 · Branche : `refonte-next` · Environnement : local (Windows 11, `next start` construit sur le port 3318, émulateurs Firestore, Authentication et Storage, faux serveur `tests/e2e/fake-stripe.ts` pour Stripe, Brevo, Mistral et la Base Adresse Nationale, clés de test tirées au hasard hors du dépôt). Catalogue de l'émulateur : copie du catalogue public (`scripts/copy-catalogue-to-staging.ts --project demo-jaellejc --fictifs`, lecture publique sans identifiant), migrée (`reports/migration/demo-jaellejc-ecriture-2026-11-05T16-01-51.md`). Aucun e-mail réel, aucun appel à Stripe ni à Mistral.

## Ce qui a été livré (détail par lot : `reports/suivi.md`, « Étape 7bis »)

- **Lot 1** : lien de connexion de l'Atelier envoyé par le serveur aux seules administratrices.
- **Lot 2** : e-mails « en préparation » et « colis en route » au changement de statut ; renvoi de ce qui est en attente.
- **Lot 3** : bienvenue à la création du compte ; newsletter (e-mail épuré, liste Brevo, désinscription).
- **Lot 4** : envois quotidiens (relances de panier J+1/J+3/J+5, « colis arrivé ? », avis à J+14), préférence « ne plus recevoir ces messages ».
- **Lot 5** : textes des 11 e-mails réglables dans l'Atelier ; paragraphe Mistral.
- **Lot 6** : recherche par usage (Mistral) et ses garde-fous.
- **Atelier** : renommage `/createur` → `/atelier`, cloche des nouvelles commandes, référence SKU, export CSV, catalogue PDF, fiches par couleur reliées par modèle.
- **Achat** : coordonnées obligatoires avant paiement, adresse vérifiée (Base Adresse Nationale), livraison en métropole, destinataire d'un cadeau.
- **Compte** : civilité et salutation personnalisée ; page rangée par thème (accueil avec commande en cours, menu, une page par thème).

## Parcours testés

| # | Parcours | Résultat | Preuve |
|---|---|---|---|
| P1 | Lien de l'Atelier : administratrice seule, même réponse pour toute adresse ; ancienne adresse `/createur` → 301 | OK | `connexion.spec.ts` |
| P2 | Bienvenue après la première connexion, une seule fois, jamais pour l'administratrice ni pour une adresse non vérifiée | OK | `connexion.spec.ts` ; `welcome.test.ts` |
| P3 | Commande : préparation, expédition Colissimo (e-mail « colis en route », suivi visible par la cliente), livraison ; cloche des nouvelles commandes | OK | `createur-commandes.spec.ts` |
| P4 | Relances de panier J+1 puis J+5, jamais deux fois ; « colis arrivé ? » ; avis à J+14 ; désinscription respectée ; cron sans secret refusé | OK | `envois-automatiques.spec.ts` |
| P5 | Texte d'un e-mail modifié dans l'Atelier, paragraphe de l'IA, mot inconnu refusé, texte d'origine rétabli | OK | `textes-emails.spec.ts` |
| P6 | Newsletter : inscription une fois par adresse, e-mail de confirmation, liste Brevo, désinscription | OK | `site-public.spec.ts` |
| P7 | Recherche par usage : IA seulement si les mots ne trouvent rien ; IA détournée sans effet ; mémoire ; limites visiteur et site | OK | `recherche-usage.spec.ts` |
| P8 | Achat d'un nouveau compte : lien, coordonnées exigées, livraison ; coordonnées retirées en cours de route → pas de paiement ; cadeau livré en Corse | OK | `parcours-achat.spec.ts` |
| P9 | Adresse introuvable dans la Base Adresse Nationale ; saisie guidée | OK | `paiement.spec.ts` |
| P10 | Fiches par couleur, tailles dans l'ordre, épuisé barré ; modèle relié et retiré dans l'Atelier | OK | `catalogue.spec.ts`, `modele.spec.ts` |
| P11 | Export CSV et catalogue PDF réservés à l'administratrice (anonyme, cliente connectée, autre site, `Origin` mal formé) | OK | `createur-produits.spec.ts` |
| P12 | Compte : accueil (commande en cours en tête, « Suivre mon colis », dernière livrée sinon, « Découvrir la collection » sans commande) ; menu à gauche (ordinateur) ; liste et retour (mobile) ; une page par thème ; anonyme renvoyé à la connexion | OK | `compte.spec.ts` |
| P13 | Compte : « Faisons connaissance » puis « Mes coordonnées » ; adresses (5 au plus) ; export ; suppression | OK | `compte.spec.ts` |

## Vérification visuelle

| # | Écran | Capture |
|---|---|---|
| V1 | Accueil du compte (ordinateur, mobile) | `reports/qa/etape-7bis/compte-accueil.png`, `compte-accueil-mobile.png` |
| V2 | Mes adresses, Mes coordonnées, Connexion et sécurité, Mes données | `compte-adresses.png`, `compte-coordonnees.png`, `compte-securite.png`, `compte-donnees.png` (et `-mobile`) |
| V3 | Pages publiques et gabarit, comparés aux références | `npm run test:visual` : **24/24** |

## Anomalies trouvées pendant la clôture

| # | Description | Correction | Statut |
|---|---|---|---|
| Q1 | Intitulés en petites capitales de l'accueil du compte affichés en Crimson Pro (11 px) : `font-sans` ignoré, nom de police sans guillemets dans `tailwind.config.ts` (`Source Sans 3` finit par un chiffre : déclaration CSS invalide) | Nom entre guillemets (exception « polices » du fichier) ; les autres usages de `font-sans` héritaient déjà de Source Sans 3 (visuel 24/24 inchangé) | Corrigé, capture V1 |
| Q2 | CI : 22 parcours de l'Atelier en échec sur Safari iPhone (Linux) : options de lancement propres à Chromium (micro simulé) imposées à WebKit, refusées avant même que le test soit écarté | Fichier écarté pour les navigateurs autres que Chromium avant tout lancement | Corrigé (à confirmer par la CI) |
| Q3 | CI : cloche des nouvelles commandes et sessions Stripe comptées sur toute la base, faussées par les parcours lancés en parallèle | Cloche comparée au compte relu en base ; sessions comptées pour le seul compte du test | Corrigé ; 232/232 en parallèle |
| Q4 | Pré-existant : autres intitulés de 11 px en Crimson Pro (« Mot de passe », « Livraison » et « Suivi du colis » du détail de commande, titres de `ProfileForm`) : règle `h2` globale | `font-sans` ajouté (accord de Jaelle, 2026-11-05) | Corrigé, captures `compte-securite.png`, `compte-commande.png` |
| Q5 | Même défaut, hors de la décision : « Vous avez déjà un compte » et « Vous êtes nouveau ou nouvelle ici ? » sur la page de connexion (`SignInForm.tsx`) | `font-sans` | Ouvert → accord de Jaelle |

## Vérifications exécutées (2026-11-05)

- `npm run typecheck` : 0 erreur · `npm run lint` : 0 erreur.
- `npm test` : **512/512** (43 fichiers).
- Règles Firestore et Storage : **109/109** (émulateur, projet `demo-regles-7bis`).
- Parcours `playwright test --project=ordinateur --project=mobile --project=iphone-safari` : **232 réussis, 0 échec**, 113 ignorés (parcours prévus pour un seul navigateur). Une première série a subi une mise en veille du poste (`ERR_NETWORK_IO_SUSPENDED`, 14 min) : ses 3 échecs ont été rejoués (54/54), puis la suite complète relancée.
- `npm run test:visual` : **24/24**.
- `npm audit --omit=dev` : 6 Moyennes indirectes (voir `reports/securite/etape-7bis.md`, F6).
- Non couvert ici : **Firefox** (ne démarre pas sur ce poste ; couvert par la CI), Lighthouse et axe (étape 9), envoi réel par Brevo et Mistral (projet de test, voir ci-dessous).

## Mise à jour du 2026-11-05 : décisions de Jaelle appliquées

| # | Parcours | Résultat | Preuve |
|---|---|---|---|
| P14 | Newsletter : « S'inscrire » → *Un e-mail vous attend pour confirmer votre inscription.* ; une seule demande par adresse ; rien chez Brevo ni consentement avant le clic ; faux lien refusé ; bon lien → confirmée, bienvenue, liste Brevo ; désinscription | OK | `site-public.spec.ts` |
| P15 | « Renvoyer » cliqué en même temps dans deux onglets : chaque e-mail ne part qu'une fois | OK (sans la réservation : 2 e-mails, 3 fois sur 3) | `createur-commandes.spec.ts` |
| P16 | Reconnexion depuis « Connexion et sécurité » ou « Mes données » : retour sur la même page ; adresse d'un autre site ignorée | OK | `compte.spec.ts` |
| P17 | Intitulés de 11 px du compte en Source Sans 3 | OK | captures `compte-securite.png`, `compte-commande.png`, `compte-coordonnees.png` (et `-mobile`) |

Vérifications exécutées après ces changements : `npm run typecheck` et `npm run lint` : 0 erreur · `npm test` : **526/526** · règles : **113/113** · `npm audit --omit=dev` : **0** · parcours (ordinateur, mobile, Safari iPhone) : **234 réussis, 1 échec** : `connexion.spec.ts:241` sur Safari, navigation interrompue par la redirection (test inchangé, sans lien avec ces changements), rejoué seul 3/3 · `npm run test:visual` : **24/24**.

## Reste à faire

- **Jaelle** : relire les textes du compte, des e-mails et de la double confirmation sur l'aperçu Vercel ; plafond de dépense Mistral ; TTL `usageCache.expiresAt`, `usageStats.expiresAt`, `rateLimits.expiresAt` et **`newsletter.expiresAt`** sur le projet de test.
- **Décision demandée** : police des deux intitulés de la page de connexion (Q5).

## Mise à jour du 2026-11-05 : suppression d'un compte

| # | Parcours | Résultat | Preuve |
|---|---|---|---|
| P18 | Cliente : « Supprimer mon compte » (discret, en bas de « Mes données ») → fenêtre « OK / Annuler » ; Annuler et Échap ne suppriment rien ; OK supprime (compte, profil, adresses, panier), commandes gardées sans lien ; refus si commande en cours | OK | `compte.spec.ts` ; capture `compte-suppression.png` |
| P19 | Atelier : onglet Clientes, recherche par e-mail (casse ignorée), fiche (compte, adresses, commandes) ; « Êtes-vous sûre ? » → mot SUPPRIMER (minuscules refusées) → suppression, message, journal | OK | `atelier-clientes.spec.ts` ; captures `atelier-clientes.png`, `atelier-cliente.png`, `atelier-suppression-1.png`, `atelier-suppression-2.png` |
| P20 | Compte d'administratrice : pas de bouton dans l'Atelier ; refus depuis « Mes données » | OK | `atelier-clientes.spec.ts` |

Vérifications exécutées : `npm run typecheck` et `npm run lint` : 0 erreur · `npm test` : **537/537** · parcours (ordinateur, mobile, Safari iPhone) : **239 réussis, 0 échec** (124 ignorés : prévus pour un seul navigateur) · `npm run test:visual` : **24/24**.
