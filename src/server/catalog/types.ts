// Vues du catalogue transmises aux pages : seulement ce que le site public a le droit d'afficher.
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
  stock: number; // somme des variantes actives (sert à l'affichage « Épuisé »)
  updatedAt: string | null;
};
