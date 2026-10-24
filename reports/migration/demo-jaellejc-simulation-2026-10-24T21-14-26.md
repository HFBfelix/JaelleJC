# Rapport de migration — demo-jaellejc (simulation)

Date : 2026-10-24 21:14 · Script : `scripts/migrate-v2.ts`

**Simulation : rien n’a été écrit dans la base.**

## Résumé

| Élément | Nombre |
|---|---|
| Catégories | 3 |
| Produits migrés | 8 |
| dont en ligne après migration | 8 |
| dont avec erreur (remis en brouillon) | 0 |
| Produits déjà migrés (ignorés) | 0 |
| Commandes à convertir | 2 |
| Messages copiés vers contacts | 1 |
| Inscriptions newsletter à convertir | 1 |
| Profils à convertir | 1 |
| Articles à convertir | 12 |

## Points généraux

- **alerte** : forfait de livraison à 0 € : livraison gratuite pour toutes les commandes, à confirmer
- **alerte** : délai de livraison estimé à compléter

## Catégories

| Ancien nom | Nouvel identifiant | Familles |
|---|---|---|
| Bébé | `bebe` | linges de lit, accessoires, Vestes |
| Coffrets | `coffrets` | naissance, baptême, sur-mesure |
| Femmes | `femmes` | sacs, accessoires |

## Statut des produits : à décider par Jaelle

Règle appliquée : un produit déjà « en ligne » le reste, tout le reste passe en brouillon. Rien n’est publié sans votre décision (`scripts/migration/decisions.json`).

| Produit | Ancien statut | Après migration | Erreurs | Alertes |
|---|---|---|---|---|
| Cabas moutarde imprimé fleurs blanches | published | **published** | 0 | 2 |
| COUVERTURE MOUTARDE IMPRIMÉ FLEURS | published | **published** | 0 | 2 |
| Coffret bébé blanc imprimé pétales de fleur | published | **published** | 0 | 2 |
| Coffret bébé moutarde, imprimé fleurs | published | **published** | 0 | 2 |
| VESTE SHERPA FLEURIE | published | **published** | 0 | 3 |
| Cabas imprimé bleu | published | **published** | 0 | 1 |
| VESTE SHERPA KAKI | published | **published** | 0 | 3 |
| Couverture blanche imprimé pétales de fleur | published | **published** | 0 | 2 |

## Fiches produit : proposition de découpage des descriptions

Chaque description d’origine est répartie dans les sous-parties de la fiche. Aucun mot n’est inventé. Les phrases contraires à `EDITORIAL.md` sont écartées en attendant votre accord.

### Cabas moutarde imprimé fleurs blanches

Identifiant `2TGTqdeWHEtKt9YHHyg6` · adresse `/produits/cabas-moutarde-imprime-fleurs-blanches` · 45,00 € · statut **published**

**Texte d’origine**

> Cabas en demi natté, 100% coton et fabriqué en France dans notre atelier. Notre Cabas est imaginé pour contenir tous les essentiels du quotidien. Ce grand modèle est conçu en coton. Une attention particulière est apportée aux finitions, ce qui vous garantit un confort et une solidité à toute épreuve. 

**Accroche** : Cabas en demi natté, 100% coton et fabriqué en France dans notre atelier.

**Description** : Notre Cabas est imaginé pour contenir tous les essentiels du quotidien. Ce grand modèle est conçu en coton. Une attention particulière est apportée aux finitions, ce qui vous garantit un confort et une solidité à toute épreuve.

**Dimensions & détails**

- 35 × 56 × 38 cm
- 60 cm hauteur des sangles

**Matières**

- 100% coton

**Entretien** : *(à compléter — ne jamais écrire « lavable » sans l’avoir vérifié)*

**Conseils de formulation (phrases gardées)**

- « Cabas en demi natté, 100% coton et fabriqué en France dans notre atelier. » — Origine exacte mais vague : préférer « cousu main dans notre atelier d’Île-de-France ».

**Contrôles**

- alerte : entretien à compléter
- alerte : texte alternatif à écrire pour 4 photo(s)

### COUVERTURE MOUTARDE IMPRIMÉ FLEURS

Identifiant `41CqKA5FhubIg7knlJJW` · adresse `/produits/couverture-moutarde-imprime-fleurs` · 49,00 € · statut **published**

**Texte d’origine**

> Couverture pour bébé réalisée avec soin, cette couverture associe deux matières ultra-douces : une face en gaz de coton respirante pour un toucher léger et délicat, et une face en polaire pour une chaleur réconfortante. 100% Made in France.  Laver à 30° / Ne pas blanchir / Ne pas sécher en tambour / Repassage autorisé, maximum 110° 

**Accroche** : *(à écrire)*

**Description** : Couverture pour bébé réalisée avec soin, cette couverture associe deux matières ultra-douces : une face en gaz de coton respirante pour un toucher léger et délicat, et une face en polaire pour une chaleur réconfortante. 100% Made in France.

**Dimensions & détails**

- Dimensions 70 × 90 cm

**Matières**

- gaz de coton
- polaire

**Entretien** : Laver à 30° / Ne pas blanchir / Ne pas sécher en tambour / Repassage autorisé, maximum 110°

**Conseils de formulation (phrases gardées)**

- « 100% Made in France. » — Origine exacte mais vague : préférer « cousu main dans notre atelier d’Île-de-France ».
- « gaz de coton » — Orthographe : sans doute « gaze de coton ».

**Contrôles**

- alerte : accroche à compléter
- alerte : texte alternatif à écrire pour 3 photo(s)

### Coffret bébé blanc imprimé pétales de fleur

Identifiant `MnXZRalzF37is34LXPmx` · adresse `/produits/coffret-bebe-blanc-imprime-petales-de-fleur` · 55,00 € · statut **published**

**Texte d’origine**

> Conçu pour accompagner les premiers moments de bébé, ce coffret contient : - Un lange pour bébé en tissu doux et absorbant, idéal pour les soins du quotidien. - 70*70 cm - Trois lingettes réutilisables ultra-douces, parfaites pour une toilette délicate et respectueuse de la peau sensible de bébé. - 15*15 cm - Une cape de bain élégante et confortable, conçue pour envelopper bébé de chaleur et de tendresse après le bain. - 80*80 cm Fabriqué avec soin en France, ce coffret allie qualité artisanale et design intemporel, parfait pour les parents en quête d’élégance et de praticité.  Pourquoi choisir ce coffret ? Pratique et éco-responsable : des produits réutilisables et durables pour une consommation responsable. Un cadeau idéal : un design chic et moderne, parfait pour une naissance, un baptême ou tout autre moment spécial.  Made in France : un savoir-faire local et une attention portée à chaque détail.

**Accroche** : Conçu pour accompagner les premiers moments de bébé.

**Description** : Fabriqué avec soin en France, ce coffret allie qualité artisanale et design intemporel, parfait pour les parents en quête d’élégance et de praticité. Un cadeau idéal : un design chic et moderne, parfait pour une naissance, un baptême ou tout autre moment spécial. Made in France : un savoir-faire local et une attention portée à chaque détail.

**Dimensions & détails**

- Un lange pour bébé en tissu doux et absorbant : 70 × 70 cm
- Trois lingettes réutilisables ultra-douces : 15 × 15 cm
- Une cape de bain élégante et confortable : 80 × 80 cm

**Matières**

- bambou
- coton

**Entretien** : *(à compléter — ne jamais écrire « lavable » sans l’avoir vérifié)*

**Phrases écartées (à confirmer ou à justifier)**

- « Pratique et éco-responsable : des produits réutilisables et durables pour une consommation responsable. » — Promesse environnementale générale : interdite sans preuve précise (EDITORIAL.md §1, loi Climat et résilience).

**Conseils de formulation (phrases gardées)**

- « Fabriqué avec soin en France, ce coffret allie qualité artisanale et design intemporel, parfait pour les parents en quête d’élégance et de praticité. » — Origine exacte mais vague : préférer « cousu main dans notre atelier d’Île-de-France ».
- « Made in France : un savoir-faire local et une attention portée à chaque détail. » — Origine exacte mais vague : préférer « cousu main dans notre atelier d’Île-de-France ».

**Contrôles**

- alerte : entretien à compléter
- alerte : texte alternatif à écrire pour 4 photo(s)

### Coffret bébé moutarde, imprimé fleurs

Identifiant `Rz7ub4W77Zj7BkXvsYq5` · adresse `/produits/coffret-bebe-moutarde-imprime-fleurs` · 55,00 € · statut **published**

**Texte d’origine**

> Conçu pour accompagner les premiers moments de bébé, ce coffret contient : - Un lange pour bébé en tissu doux et absorbant, idéal pour les soins du quotidien. - 70*70 cm - Trois lingettes réutilisables ultra-douces, parfaites pour une toilette délicate et respectueuse de la peau sensible de bébé. - 15*15 cm - Une cape de bain élégante et confortable, conçue pour envelopper bébé de chaleur et de tendresse après le bain. - 80*80 cm Fabriqué avec soin en France, ce coffret allie qualité artisanale et design intemporel, parfait pour les parents en quête d’élégance et de praticité.  Pourquoi choisir ce coffret ? Pratique et éco-responsable : des produits réutilisables et durables pour une consommation responsable. Un cadeau idéal : un design chic et moderne, parfait pour une naissance, un baptême ou tout autre moment spécial.  Made in France : un savoir-faire local et une attention portée à chaque détail.

**Accroche** : Conçu pour accompagner les premiers moments de bébé.

**Description** : Fabriqué avec soin en France, ce coffret allie qualité artisanale et design intemporel, parfait pour les parents en quête d’élégance et de praticité. Un cadeau idéal : un design chic et moderne, parfait pour une naissance, un baptême ou tout autre moment spécial. Made in France : un savoir-faire local et une attention portée à chaque détail.

**Dimensions & détails**

- Un lange pour bébé en tissu doux et absorbant : 70 × 70 cm
- Trois lingettes réutilisables ultra-douces : 15 × 15 cm
- Une cape de bain élégante et confortable : 80 × 80 cm

**Matières**

- bambou
- coton

**Entretien** : *(à compléter — ne jamais écrire « lavable » sans l’avoir vérifié)*

**Phrases écartées (à confirmer ou à justifier)**

- « Pratique et éco-responsable : des produits réutilisables et durables pour une consommation responsable. » — Promesse environnementale générale : interdite sans preuve précise (EDITORIAL.md §1, loi Climat et résilience).

**Conseils de formulation (phrases gardées)**

- « Fabriqué avec soin en France, ce coffret allie qualité artisanale et design intemporel, parfait pour les parents en quête d’élégance et de praticité. » — Origine exacte mais vague : préférer « cousu main dans notre atelier d’Île-de-France ».
- « Made in France : un savoir-faire local et une attention portée à chaque détail. » — Origine exacte mais vague : préférer « cousu main dans notre atelier d’Île-de-France ».

**Contrôles**

- alerte : entretien à compléter
- alerte : texte alternatif à écrire pour 4 photo(s)

### VESTE SHERPA FLEURIE

Identifiant `SmSTu5ukpicGRuMlv2Eu` · adresse `/produits/veste-sherpa-fleurie` · 55,00 € · statut **published**

**Texte d’origine**

> L'élégance artisanale faite main en France. Ce cocon de douceur est l'allié idéal de la mi-saison pour protéger votre enfant lors des journées fraîches tout en offrant une liberté de mouvement totale. Sa coupe généreuse taille grand pour durer plus longtemps - Délai de confection et livraison : 2 semaines.

**Accroche** : L'élégance artisanale faite main en France.

**Description** : Ce cocon de douceur est l'allié idéal de la mi-saison pour protéger votre enfant lors des journées fraîches tout en offrant une liberté de mouvement totale. Sa coupe généreuse taille grand pour durer plus longtemps.

**Dimensions & détails**

- Délai de confection et livraison : 2 semaines
- 6-9m, 9-12m | Autres tailles : Sur commande uniquement.

**Matières**

- 50% sherpa
- 50% coton

**Entretien** : *(à compléter — ne jamais écrire « lavable » sans l’avoir vérifié)*

**Contrôles**

- alerte : entretien à compléter
- alerte : tailles détectées (6-9 mois, 9-12 mois) : créer une variante par taille et y répartir le stock
- alerte : texte alternatif à écrire pour 5 photo(s)

### Cabas imprimé bleu

Identifiant `giDoycYl8m1OYehLlws8` · adresse `/produits/cabas-imprime-bleu` · 45,00 € · statut **published**

**Texte d’origine**

> Cabas en demi natté, 100% coton et fabriqué en France dans notre atelier. Notre Cabas est imaginé pour contenir tous les essentiels du quotidien. Ce grand modèle est conçu en coton. Une attention particulière est apportée aux finitions, ce qui vous garantit un confort et une solidité à toute épreuve.   Laver à 30° / Ne pas blanchir / Ne pas sécher en tambour / Repassage autorisé, maximum 110°

**Accroche** : Cabas en demi natté, 100% coton et fabriqué en France dans notre atelier.

**Description** : Notre Cabas est imaginé pour contenir tous les essentiels du quotidien. Ce grand modèle est conçu en coton. Une attention particulière est apportée aux finitions, ce qui vous garantit un confort et une solidité à toute épreuve.

**Dimensions & détails**

- Dimensions : 35 × 56 × 38 cm
- 60 cm hauteur des sangles

**Matières**

- 100% coton

**Entretien** : Laver à 30° / Ne pas blanchir / Ne pas sécher en tambour / Repassage autorisé, maximum 110°

**Conseils de formulation (phrases gardées)**

- « Cabas en demi natté, 100% coton et fabriqué en France dans notre atelier. » — Origine exacte mais vague : préférer « cousu main dans notre atelier d’Île-de-France ».

**Contrôles**

- alerte : texte alternatif à écrire pour 3 photo(s)

### VESTE SHERPA KAKI

Identifiant `mg00QFlA9h99nLVdTwYV` · adresse `/produits/veste-sherpa-kaki` · 55,00 € · statut **published**

**Texte d’origine**

> L'élégance artisanale faite main en France. Ce cocon de douceur est l'allié idéal de la mi-saison pour protéger votre enfant lors des journées fraîches tout en offrant une liberté de mouvement totale. Sa coupe généreuse taille grand pour durer plus longtemps - Délai de confection et livraison : 2 semaines.

**Accroche** : L'élégance artisanale faite main en France.

**Description** : Ce cocon de douceur est l'allié idéal de la mi-saison pour protéger votre enfant lors des journées fraîches tout en offrant une liberté de mouvement totale. Sa coupe généreuse taille grand pour durer plus longtemps.

**Dimensions & détails**

- Délai de confection et livraison : 2 semaines
- 6-9m, 9-12m | Autres tailles : Sur commande uniquement.

**Matières**

- 50% sherpa
- 50% coton

**Entretien** : *(à compléter — ne jamais écrire « lavable » sans l’avoir vérifié)*

**Contrôles**

- alerte : entretien à compléter
- alerte : tailles détectées (6-9 mois, 9-12 mois) : créer une variante par taille et y répartir le stock
- alerte : texte alternatif à écrire pour 4 photo(s)

### Couverture blanche imprimé pétales de fleur

Identifiant `u1Y3BBm5r2omFnYsFFhn` · adresse `/produits/couverture-blanche-imprime-petales-de-fleur` · 49,00 € · statut **published**

**Texte d’origine**

> Couverture pour bébé réalisée avec soin, cette couverture associe deux matières ultra-douces : une face en gaz de coton respirante pour un toucher léger et délicat, et une face en polaire pour une chaleur réconfortante. 100% Made in France.   Laver à 30° / Ne pas blanchir / Ne pas sécher en tambour / Repassage autorisé, maximum 110° 

**Accroche** : *(à écrire)*

**Description** : Couverture pour bébé réalisée avec soin, cette couverture associe deux matières ultra-douces : une face en gaz de coton respirante pour un toucher léger et délicat, et une face en polaire pour une chaleur réconfortante. 100% Made in France.

**Dimensions & détails**

- Dimensions 70 × 90 cm

**Matières**

- gaz de coton
- polaire

**Entretien** : Laver à 30° / Ne pas blanchir / Ne pas sécher en tambour / Repassage autorisé, maximum 110°

**Conseils de formulation (phrases gardées)**

- « 100% Made in France. » — Origine exacte mais vague : préférer « cousu main dans notre atelier d’Île-de-France ».
- « gaz de coton » — Orthographe : sans doute « gaze de coton ».

**Contrôles**

- alerte : accroche à compléter
- alerte : texte alternatif à écrire pour 3 photo(s)

