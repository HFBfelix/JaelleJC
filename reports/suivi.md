# Suivi — ce qui reste à faire (mis à jour au fil des étapes)

Dernière mise à jour : 2026-10-24, fin de l'étape 0 (livraison A). Chaque ligne renvoie au rapport ou à la décision d'origine.

## Décisions de Jaelle (2026-10-24)

- Chaque étape est visualisée avant validation (local avec émulateurs, ou staging). Mise en production seulement après validation explicite de Jaelle.
- Étape 0 mise en production **sans passage par le staging** (projet `jaellejc-staging` pas encore créé). Écart assumé à `SECURITE.md` §2.
- Les 6 vulnérabilités élevées de `firebase` 10 sont acceptées jusqu'à l'étape 1.
- Les clés Brevo exposées (ci-dessous) sont traitées plus tard.
- Stripe de test laissé de côté pour la visualisation locale.
- E-mails : Brevo ne servira plus qu'à la newsletter (1 par mois). Les e-mails du parcours d'achat seront repensés (voir « E-mails »).

## Mise en production de l'étape 0, livraison A (2026-10-24)

- Règles Firestore + Storage déployées sur `jaellejc` par Jaelle (commande tapée par elle).
- Fonctions (8) déployées et `main` avancé de `eb54d84` à `b7dbf46` **par Claude, à la demande explicite de Jaelle « pour cette fois-ci »**. Exception ponctuelle à la règle 8 de `CLAUDE.md`, qui reste inchangée.
- Déploiement des fonctions sous Windows : `$env:FUNCTIONS_DISCOVERY_TIMEOUT = '60'` nécessaire (délai d'analyse de 10 s dépassé sinon).
- Vérifié en production : nouvelle version servie (plus de SumUp ni de gtag d'office), collection affichée, `/login` et `/createur` affichés, aucune erreur console, aucun traceur avant consentement.
- Connexion Firebase CLI retirée de l'ordinateur juste après (`firebase logout`).
- Variable Vercel `ITE_FIREBASE_API_KEY` mal nommée, corrigée par Jaelle en `VITE_FIREBASE_API_KEY` ; `VITE_STRIPE_PUBLISHABLE_KEY` n'est plus utilisée (à supprimer).
- Reste à vérifier par Jaelle : connexion à `/createur` avec son compte, envoi d'une photo (si refusé : autorisation « Storage → Firestore » à accorder dans la console Firebase, page Règles de Storage), panier jusqu'à la page Stripe (sans payer).
- Recommandation : compte Google dédié à l'administration avec clé de sécurité (`SECURITE.md` §6) avant l'étape 10.

## À faire — sécurité

| Priorité | Sujet | Détail | Origine |
|---|---|---|---|
| **Critique** | Clés API Brevo exposées | 2 clés `xkeysib-` dans l'historique public GitHub (janvier et mars 2026), dont une incluse dans le site entre janvier et mars. Dans Brevo, onglet **« Clés API »** (pas « Clés SMTP ») : désactiver/supprimer ces clés, vérifier l'activité du compte. Si une clé active sert au secret Firebase `BREVO_API_KEY`, en créer une nouvelle avant. | `reports/securite/etape-0.md` #1 |
| Élevée | Firebase 10 → version récente | 6 vulnérabilités élevées (modules Node, absents du site publié) | rapport étape 0 #4 → étape 1 |
| Moyenne | Outils de dev `vite` 4, `firebase-tools` 14 | Vulnérabilités, correctif = version majeure | rapport étape 0, Dépendances → étape 1 |
| Moyenne | Commandes écrites par le navigateur | Fausses commandes « payées », e-mails de confirmation déclenchables vers n'importe qui | PLAN #2 → étape 5 (webhook) |
| Moyenne | Lecture publique de `autorisations` | Permet de deviner les e-mails admin | PLAN #8 → étape 4 (custom claim) |
| Moyenne | Brouillons lisibles et vendables | Livraison B de l'étape 0 : filtre `published`, règle `produits`, `REQUIRE_PUBLISHED = true` | rapport étape 0 → après publication des produits par Jaelle dans `/createur` |
| Moyenne | Staging | Créer `jaellejc-staging` (forfait Blaze), `functions/.env.jaellejc-staging` (`ALLOWED_ORIGINS`), clés de test Stripe/Brevo, variables « Preview » de Vercel vers le staging, protection des aperçus | `SECURITE.md` §1 |
| Faible | App Check, limitation de débit | Contact, newsletter, connexion | étape 9 |

## À faire — fonctionnel

| Sujet | Détail | Origine |
|---|---|---|
| Inscription newsletter probablement cassée en production | `Newsletter.tsx:19` et `Footer.tsx:20` lisent `newsletter` (refusé au public) avant d'écrire | `reports/qa/etape-0.md` Q1 |
| Design de l'espace créatrice | Aligner sur la marque (logo, bordures 0,5 px, pas d'ombres ni d'arrondis) | QA Q2 → étape 7 |
| Bandeau cookies plein écran | Doit être non bloquant (RGPD) | QA Q3 → étape 1 / 9 |
| Erreur de types `ProductDetail.tsx:38` | Corrigée avec la livraison B | rapport QA |
| `src/lib/mail.ts` | Code mort | QA Q4 → suppression avec `legacy/` |
| Émulateur des fonctions | Délai dépassé au chargement (10 s) en local ; utile seulement pour tester Stripe en local | étape 5 |
| Fonction `onProductAdded` | Texte à trous et brouillon de blog automatiques à supprimer | `BACKOFFICE.md` §5 → étape 7 |

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
