// Vues du catalogue transmises aux pages : seulement ce que le site public a le droit d'afficher.
// Tout champ présent ici peut se retrouver dans le HTML envoyé au navigateur : jamais de stock exact,
// de date interne, de champ `legacy` ni de brouillon de texte.
export type CategoryView = {
  slug: string;
  name: string;
  order: number;
  subs: { slug: string; name: string }[];
};

export type ProductImageView = { url: string; alt: string };

export type ProductCardView = {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  categorySlug: string | null;
  categoryName: string;
  subSlug: string | null;
  subName: string;
  images: ProductImageView[];
  inStock: boolean;
  summary: string; // accroche, sinon début de la description (texte pour lecteurs d'écran et métadonnées)
};

export type ProductView = ProductCardView & {
  accroche: string;
  description: string;
  details: string[];
  materials: string[];
  entretien: string;
};

// Rubriques de la fiche, calculées côté serveur.
export type ProductSection = { key: string; label: string; lines: string[] };
