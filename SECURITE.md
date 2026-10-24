# SECURITE.md — Environnements, mise en ligne, sécurité, QA et rapports

Complète `CLAUDE.md`. Objectif : empêcher l'intrusion dans le code et dans la base, et prouver par des rapports que chaque fonctionnalité a été testée. Aucune méthode ne garantit 0 risque : on empile des protections, on détecte vite, on sait restaurer.

## 1. Trois environnements

| | Local | Test (« staging ») | Production |
|---|---|---|---|
| Où | Ordinateur de Jaelle | Aperçus Vercel de la branche + projet Firebase `jaellejc-staging` | `jaellejc.com` + projet Firebase actuel |
| Base | Émulateurs Firebase (Auth, Firestore, Storage) | Copie anonymisée de la base | Vraie base |
| Stripe | Clés de test | Clés de test | Clés réelles |
| Accès de Claude Code / Cursor | Oui | Oui | **Jamais** |

Règles :
- Aucun identifiant de production sur l'ordinateur de développement, ni dans le dossier du projet (l'éditeur et Claude Code lisent les fichiers du dossier).
- Dans Vercel, chaque variable d'environnement est limitée à son environnement : les clés de production seulement dans « Production », celles de test dans « Preview » et « Development ».
- Les aperçus Vercel sont protégés (Deployment Protection) : le site de test n'est pas public.
- Le staging utilise des données fictives ou anonymisées, jamais de vrais e-mails ni de vraies adresses clients.

## 2. Chaîne de mise en ligne

Cursor ou Claude Code → commit → `git push` sur la branche `refonte-next` → Pull Request GitHub → vérifications automatiques (GitHub Actions) → aperçu Vercel → validation de Jaelle → fusion dans `main` → Vercel publie la production.

C'est le même principe qu'aujourd'hui (Cursor → GitHub → Vercel), avec trois protections en plus :
1. `main` est protégée : pas de poussée directe, fusion seulement si toutes les vérifications sont vertes.
2. La branche de travail ne publie que des aperçus. La production ne change qu'à la fusion dans `main`.
3. Les règles Firestore/Storage et les fonctions Cloud ne passent PAS par GitHub/Vercel : elles se déploient avec `firebase deploy`, par Jaelle, d'abord sur le staging, sur la production seulement aux moments prévus ci-dessous.

Vérifications automatiques obligatoires (fusion bloquée si l'une échoue) : lint, types, tests unitaires, tests des règles Firestore/Storage (émulateur), tests Playwright, `npm audit` (aucune faille élevée ou critique), détection de secrets (gitleaks), construction du site.

### Quand part-on en production ? Deux fois seulement
1. **Étape 0 (correctifs urgents)** : après test sur le staging. Les règles modifiées restent compatibles avec l'ancien code (l'ancien site écrit encore les commandes depuis le navigateur et lit `autorisations`).
2. **Étape 10 (bascule)** : une fois l'audit, le pentest et la QA validés. Entre les deux, tout reste en aperçu.

Ordre de la bascule :
1. Sauvegarde complète de Firestore (export) et vérification de la restauration sur le staging.
2. Migration des données : simulation (`--dry-run`), lecture du rapport, puis exécution réelle.
3. Déploiement des nouvelles règles et fonctions sur la production (`firebase deploy`).
4. Fusion dans `main` : Vercel publie le nouveau site. (Les nouvelles règles refusent les écritures client qu'effectuait l'ancien code : les étapes 3 et 4 se font à quelques minutes d'intervalle, hors heures de forte affluence.)
5. Webhook Stripe de production, test de paiement réel d'un petit montant, remboursé ensuite.
6. Surveillance renforcée pendant 48 h.
Retour arrière : « Rollback instantané » vers le déploiement Vercel précédent ; restauration Firestore depuis l'export ; règles précédentes redéployées depuis git.

## 3. Porte de sécurité à la fin de CHAQUE étape

Une étape n'est « terminée » que si la liste suivante est passée et le rapport écrit.

1. Secrets : aucun secret dans le diff (gitleaks).
2. Dépendances : `npm audit` propre ; toute nouvelle dépendance justifiée.
3. Autorisations : pour chaque route ou action ajoutée, un test pour chaque appelant : anonyme, client connecté, autre client, administrateur. Seuls les accès prévus passent.
4. Règles Firestore et Storage : tests positifs ET négatifs sur chaque collection touchée (par exemple : un anonyme ne lit pas un brouillon ; un client ne lit pas la commande d'un autre ; un client ne crée pas de commande ; un non-admin n'écrit ni dans `produits` ni dans Storage).
5. Entrées : validation Zod, tests avec données malformées, trop longues, négatives, HTML ou script.
6. Échappement : aucun texte saisi n'est injecté tel quel dans une page ou un e-mail.
7. Prix et stock : tests de manipulation (prix modifié côté client, quantité négative ou énorme, variante inexistante, double clic, webhook rejoué).
8. Abus : limitation de débit et App Check là où c'est prévu.
9. Cookies et en-têtes de sécurité vérifiés ; aucune donnée personnelle dans les logs.
10. Relecture sécurité du diff par un second agent, indépendant de celui qui a écrit le code.

Gravité : **Critique** et **Élevée** bloquent la fusion ; **Moyenne** doit être corrigée avant la bascule ; **Faible** est consignée.

### Modèle de rapport (un fichier par étape : `reports/securite/etape-N.md`)
```
# Rapport de sécurité — Étape N : <titre>
Date · Commit · Environnement testé
## Périmètre
Ce qui a été ajouté ou modifié.
## Contrôles effectués
| Contrôle | Cas testé | Résultat (OK / KO) | Preuve (test, commande, capture) |
## Règles Firestore / Storage testées
| Collection | Appelant | Action | Attendu | Obtenu |
## Anomalies
| # | Gravité | Description | Comment la reproduire | Correction | Statut |
## Dépendances
Résultat de `npm audit`.
## Décision
Go / No-go, et points restants.
```

## 4. QA fonctionnelle (un rapport par étape : `reports/qa/etape-N.md`, puis `reports/qa/final.md`)

Parcours testés, sur mobile et ordinateur, Safari (iPhone), Chrome, Firefox :
- Panier : ajout (+1, +2), persistance après fermeture, expiration à 7 jours, fusion visiteur/compte, plafond au stock.
- Connexion : lien magique, mot de passe, lien expiré ou réutilisé, mot de passe oublié, mêmes messages que l'e-mail existe ou non.
- Paiement (cartes de test Stripe) : réussi, refusé, authentification 3D Secure, abandon, webhook rejoué, stock insuffisant après paiement, remboursement.
- Commande : e-mails de confirmation et d'expédition, page de confirmation, historique dans le compte.
- Back-office : création d'un produit de bout en bout, liste de contrôle de publication, aperçu privé, archivage, stocks, expédition.
- SEO : données structurées valides, sitemap, redirections 301, balises canoniques, pages privées en `noindex`.
- Accessibilité (axe), performance (Lighthouse ≥ 90), comparaison visuelle avec les captures de l'ancien site (design inchangé).

## 5. Audit final et tests d'intrusion (étape 9)

**a. Audit de sécurité complet** par Claude Code : revue de tous les modules, de toutes les règles et des en-têtes. Rapport : `reports/securite/final.md`.

**b. Tests d'intrusion automatisés**, uniquement contre le staging et dans le respect des conditions d'usage de Vercel, Google et Stripe (jamais contre les services de Stripe) :
- scan OWASP ZAP (référence puis actif) ;
- accès aux données d'un autre client (IDOR) et aux routes admin sans droit ;
- tentatives de lecture/écriture Firestore et Storage avec un compte non admin, depuis le SDK du navigateur ;
- force brute et limitation de débit sur la connexion et le lien magique ; énumération d'e-mails ;
- CSRF, injections, XSS dans formulaires et e-mails ;
- envoi de faux fichiers image (SVG, HTML renommé, fichier trop lourd) ;
- manipulation de prix, de quantités et rejeu de webhook ;
- en-têtes et TLS (securityheaders, SSL Labs).
Rapport : `reports/pentest/final.md` (constats, gravité, preuve, correction), puis un second passage après corrections.

**c. Limite à connaître** : cela ne remplace pas un test d'intrusion par un professionnel. Pour un site qui encaisse des paiements, je recommande une revue externe avant l'ouverture du paiement en production, avec un périmètre écrit et les rapports ci-dessus comme point de départ.

**d. Critère de mise en ligne** : aucune anomalie Critique ou Élevée ouverte, Moyennes corrigées ou acceptées par écrit, QA finale verte.

## 6. Sécurité des comptes (côté Jaelle et administration)

Un pirate vise d'abord les comptes, pas le code. Ce qui compte le plus :

**Compte Google (Firebase)**
- Validation en deux étapes avec des clés d'accès (passkeys) ou des clés de sécurité physiques, pas par SMS. Prévoir deux clés (une de secours) et des options de récupération à jour.
- Idéal : un compte Google dédié à l'administration, distinct de la messagerie quotidienne.
- Envisager le Programme de protection avancée de Google.
- Rôle Propriétaire du projet limité à ce compte ; travail courant avec des rôles minimaux.
- Alertes de budget Firebase/Google Cloud, sauvegardes Firestore planifiées activées, journaux d'audit activés.

**GitHub** : authentification à deux facteurs (passkey), `main` protégée, détection de secrets avec blocage à la poussée, alertes Dependabot.
**Vercel** : double authentification, protection des aperçus, variables limitées par environnement.
**Stripe** : double authentification, clés restreintes, alertes par e-mail, règles Radar.
**Brevo, OpenAI** : double authentification, une clé par environnement, plafond de dépense.
**Nom de domaine et DNS** : double authentification et verrouillage du transfert chez le registrar. Quiconque contrôle le domaine contrôle les e-mails et le site.
**Connexion à `/createur`** : double authentification (TOTP) pour le compte administrateur dans Firebase Authentication (nécessite la mise à niveau vers Identity Platform : à vérifier dans la documentation Firebase au moment de la mise en place), et nouvelle saisie du mot de passe avant les actions sensibles.
**Ordinateur** : disque chiffré, système à jour, gestionnaire de mots de passe, aucune clé de production dans le dossier du projet.

**En cas d'incident** : révoquer la session et les clés concernées, changer les clés Stripe/Brevo/OpenAI, désactiver le compte suspect dans Firebase Authentication, restaurer depuis la dernière sauvegarde. Garder ces étapes à portée de main avant la mise en ligne.

## 7. Après la mise en ligne

Alertes Stripe, budget Firebase et erreurs Vercel actives ; mise à jour mensuelle des dépendances avec nouveaux tests ; relecture trimestrielle des règles Firestore/Storage ; test d'intrusion annuel et après toute évolution majeure.
