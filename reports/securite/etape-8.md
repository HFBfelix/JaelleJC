# Rapport de sécurité — Étape 8 : contenu éditorial et SEO/GEO

## Lot 8a — pages de l'ancien site portées (2026-11-05)

Branche `refonte-next` · Environnement testé : local (`next start` construit, émulateurs Firestore, Authentication, Storage ; faux serveur `tests/e2e/fake-stripe.ts` ; clés de test hors du dépôt). Aucune donnée ni clé de production. Captures « avant » prises sur le site en ligne (pages publiques, simple lecture, sans connexion).

### Périmètre

- Pages publiques, mêmes adresses que l'ancien site : `/notre-promesse`, `/contact`, `/newsletter`, `/mentions-legales`, `/confidentialite`, `/livraison-et-retours`, `/CGV`. Elles menaient jusque-là à une page introuvable.
- Nouvelle Server Action publique `sendContactAction` (`src/server/contact/actions.ts`) : le message de contact est écrit par le serveur dans `contacts`, plus par le navigateur.
- `subscribeNewsletterAction` : champ `source` (`footer_site` par défaut, `page_newsletter`).
- `readDeliverySettings` (`src/server/cart/repository.ts`) : seuil, forfait et délai affichés sur `/livraison-et-retours`.
- Plan du site : 7 pages ajoutées. Aucune dépendance ajoutée.

### Contrôles effectués

| Contrôle | Cas testé | Résultat | Preuve |
|---|---|---|---|
| 1. Secrets | Motifs de clés dans le diff | OK (0) | gitleaks en CI |
| 2. Dépendances | Aucune ajoutée ; `npm audit --omit=dev` | 0 vulnérabilité | commande exécutée |
| 3. Autorisations | Pages publiques (lecture seule) ; action de contact publique par nature : aucune lecture de données existantes, rien ne dépend de l'appelant | OK | relecture |
| 5. Entrées (contact) | Zod strict : nom 1 à 100 caractères sans retour à la ligne ni `<` `>`, e-mail validé et mis en minuscules, message 10 à 5 000 caractères, champ en trop refusé (`status`) | OK | `contact/actions.test.ts` (13 tests) |
| 5. Entrées (newsletter) | `source` limitée à deux valeurs ; toute autre refusée | OK | `newsletter/actions.test.ts` |
| 6. Échappement | Pages et messages rendus par React ; aucun `dangerouslySetInnerHTML` ; message de contact jamais inséré dans un e-mail HTML | OK | relecture indépendante |
| 8. Abus | Contact : champ piège, 5 messages par adresse IP (hachée) et par heure ; App Check : étape 9 | OK | `contact/actions.test.ts`, `pages-8a.spec.ts` |
| 9. Journaux | Libellé fixe, ni adresse ni message | OK | `contact/actions.test.ts` |
| 9. Vie privée | `/newsletter?email=` n'est plus repris dans le champ (l'adresse restait dans l'URL : journaux, mesure d'audience) | OK | `pages-8a.spec.ts` |
| Contenu légal | Affirmations de `/confidentialite` vérifiées dans le code : session 5 jours, sélection 7 jours, demande de lettre 48 h, Google Analytics après « Tout accepter » seulement, empreinte IP, commandes gardées et détachées | OK | relecture indépendante (I4) |
| 10. Relecture indépendante | Diff du lot, second agent en lecture seule | 0 Critique, 0 Élevée, 1 Moyenne, 3 Faibles, 8 Info | ci-dessous |

### Anomalies

| # | Gravité | Description | Correction | Statut |
|---|---|---|---|---|
| M1 | Moyenne | Règle Firestore `contacts` : création encore ouverte au navigateur (l'ancien site en dépend), ce qui contourne le champ piège et la limite de débit de la nouvelle action | `allow create: if false` + tests de refus, comme `newsletter` ; production à la bascule | **Ouvert → feu vert de Jaelle** (règles) |
| F1 | Faible | `/confidentialite` promettait une durée de conservation des messages de contact que le code ne tient pas | Formulation exacte : gardés jusqu'à demande de suppression | **Corrigé** |
| F2 | Faible | `/newsletter?email=` : l'adresse restait dans l'URL (journaux Vercel, mesure d'audience) | Préremplissage retiré | **Corrigé**, testé |
| F3 | Faible | Un tiers peut envoyer un message avec l'adresse d'une autre personne ; il apparaît dans l'export de ses données | Préciser « messages envoyés avec votre adresse » dans l'export | Ouvert → étape 9 |
| I4 | Info | `/confidentialite` ne citait pas les deux stockages du navigateur (choix des cookies, e-mail du lien de connexion) | Ajoutés | **Corrigé** |
| I8 | Info | Mentions légales : éditeur « H-AI.studio » repris de l'ancien site ; adresse de retour nominative | À confirmer par Jaelle | Ouvert → Jaelle |

### Règles Firestore / Storage

Aucune règle modifiée dans ce lot (M1 en attente du feu vert). Rejouées : 113/113.

### Décision

**Go en local et sur le projet de test.** Aucune anomalie Critique ni Élevée. M1 à trancher avant la bascule. Vérifications : `reports/qa/etape-8.md`.
