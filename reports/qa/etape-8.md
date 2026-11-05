# Rapport QA — Étape 8 : contenu éditorial et SEO/GEO

## Lot 8a — pages de l'ancien site portées (2026-11-05)

Environnement : local (Windows 11, `next start` construit sur le port 3318, émulateurs, catalogue de l'émulateur copié du catalogue public). « Avant » : captures du site en ligne (www.jaellejc.com, pages publiques). « Après » : site local.

### Ce qui a été livré

| Page | Adresse (identique à l'ancien site) | Contenu |
|---|---|---|
| Notre promesse | `/notre-promesse` | Texte d'`EDITORIAL.md` §3 : titre *Une histoire de mains et de naissances.*, « Le Nouveau Souffle », l'atelier, les séries limitées, l'intemporel, *Écrivez-nous* ; la section « défis de l'industrie » ramenée à une phrase |
| Contact | `/contact` | Formulaire écrit par le serveur, visible dans l'Atelier → Messages |
| La lettre | `/newsletter` | Même inscription que le pied de page (double confirmation) |
| Mentions légales | `/mentions-legales` | Hébergement corrigé : Vercel (site), Google Firebase (données), au lieu d'OVHcloud |
| Confidentialité | `/confidentialite` | Réécrite : données, destinataires (Google, Vercel, Stripe, Brevo, Base Adresse Nationale, Mistral, transporteur), durées, cookies, droits |
| Livraison et retours | `/livraison-et-retours` | Seuil, forfait et délai lus dans les réglages de l'Atelier (l'ancien texte disait « 40 € » en dur) ; France métropolitaine, Corse comprise |
| CGV | `/CGV` | Texte de l'ancien site |

Typographie « Atelier » appliquée partout : pas d'italique, aucun texte sous 11 px, police à empattements seulement à partir de 18 px, petites capitales espacées de 0,12 em.

### Non repris faute d'information (EDITORIAL.md : ne jamais inventer)

- Nombre d'exemplaires par série, numérotation.
- Matières et label exact (l'ancien site disait « matières labellisées » sans nom).
- Lieu précis de l'atelier (« Paris » sur l'ancienne page Contact, « Île-de-France » partout ailleurs : Île-de-France retenu).

### À confirmer par Jaelle

- Éditeur du site : « H-AI.studio, Félix HAMILTON, SIRET 51385694800031 » (repris tel quel).
- Adresses des hébergeurs (Vercel Inc., Covina, États-Unis ; Google Ireland Limited, Dublin).
- Adresse de retour nominative (Neuilly-sur-Marne), reprise de l'ancien site.
- CGV : texte court de l'ancien site, sans prix, paiement ni livraison : relecture juridique à l'étape 9.
- Instagram : `instagram.com/jaelleandjc` (ancienne page Notre promesse) ou `instagram.com/jaellejc` (e-mails) ? Le nouveau texte de Notre promesse n'a plus de lien Instagram.

### Parcours testés

| # | Parcours | Résultat | Preuve |
|---|---|---|---|
| P1 | 7 pages servies (200), une seule H1, adresse canonique | OK | `pages-8a.spec.ts` |
| P2 | Typographie : aucun texte en italique ni sous 11 px, vérifié automatiquement sur chaque page | OK | `pages-8a.spec.ts` |
| P3 | Pied de page : Contact, Mentions, CGV mènent à leur page ; plan du site avec les 7 pages | OK | `pages-8a.spec.ts` |
| P4 | Contact : message enregistré, non lu, visible dans l'Atelier | OK | `pages-8a.spec.ts` |
| P5 | Newsletter : demande en attente avec la source « page_newsletter » ; `?email=` ignoré | OK | `pages-8a.spec.ts` |
| P6 | Livraison et retours : chiffres des réglages, plus de « 40 € » | OK | `pages-8a.spec.ts` |

### Vérification visuelle (avant / après)

Dossier `reports/qa/etape-8a/` : `<page>-avant.png` et `<page>-apres.png`, et leurs versions `-mobile`, pour les 7 pages.

### Vérifications exécutées

- `npm run typecheck`, `npm run lint` : 0 erreur.
- `npm test` : **551/551**.
- Parcours (ordinateur, mobile, Safari iPhone) : **270 réussis, 2 échecs** sur Safari dans les deux nouveaux formulaires : le test remplissait les champs avant que la page soit interactive. Corrigé : le test attend la page prête. Rejoué : `pages-8a.spec.ts` **99/99** (3 fois sur les 3 navigateurs).
- `npm run test:visual` : **24/24**.
- Un test existant (« Renvoyer » dans deux onglets) a dépassé son attente de 5 s dans une série chargée (aucune erreur côté serveur) : attente portée à 15 s.
