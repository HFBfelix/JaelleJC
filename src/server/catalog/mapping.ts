// Conversion document Firestore → vue publique. Pure (testée sans base).
// Un document qui ne respecte pas le schéma n'est jamais affiché : mieux vaut une pièce absente
// qu'un prix ou un stock faux. Seuls les champs affichables sortent d'ici (aucun stock exact ni date interne).
import { categorie, produit, variante } from '../db/schema';
import type { CategoryView, ProductCardView, ProductSection, ProductView } from './types';

// Photos acceptées : buckets Firebase de la boutique (production et test), les seuls autorisés par
// next.config.ts. Une autre adresse est ignorée plutôt que de faire échouer toute la page.
const IMAGE_URL = /^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/jaellejc(-staging)?\.firebasestorage\.app\/o\//;

// Slug d'adresse valide (même forme que le schéma) : sinon 404 sans interroger la base.
export const isValidSlug = (slug: string) => slug.length <= 80 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);

export function toCategoryView(slug: string, data: unknown): CategoryView | null {
  const parsed = categorie.safeParse(data);
  if (!parsed.success) return null;
  return { slug, name: parsed.data.name, order: parsed.data.order, subs: parsed.data.subs };
}

function summaryOf(accroche: string, description: string): string {
  const text = accroche || description;
  return text.length > 160 ? `${text.slice(0, 157).trimEnd()}…` : text;
}

export function toProductCard(id: string, data: unknown, categories: CategoryView[]): ProductCardView | null {
  const parsed = produit.safeParse(data);
  if (!parsed.success || parsed.data.status !== 'published') return null;
  const p = parsed.data;
  const category = categories.find((c) => c.slug === p.categoryId);
  const sub = category?.subs.find((s) => s.slug === p.subCategory);
  return {
    id,
    slug: p.slug,
    name: p.name,
    priceCents: p.priceCents,
    categorySlug: category?.slug ?? null,
    categoryName: category?.name ?? '',
    subSlug: sub?.slug ?? null,
    subName: sub?.name ?? '',
    images: [...p.images]
      .filter((img) => IMAGE_URL.test(img.url))
      .sort((a, b) => a.order - b.order)
      .map((img) => ({ url: img.url, alt: img.alt })),
    inStock: p.inStock,
    summary: summaryOf(p.accroche, p.description),
  };
}

export function toProductView(
  id: string,
  data: unknown,
  variants: unknown[],
  categories: CategoryView[],
): ProductView | null {
  const card = toProductCard(id, data, categories);
  if (!card) return null;
  const p = produit.parse(data);
  // Disponibilité : au moins une variante active avec du stock (le nombre exact n'est pas transmis).
  const inStock = variants.some((v) => {
    const parsed = variante.safeParse(v);
    return parsed.success && parsed.data.active && parsed.data.stock > 0;
  });
  return {
    ...card,
    inStock,
    accroche: p.accroche,
    description: p.description,
    details: p.details,
    materials: p.materials,
    entretien: p.entretien,
  };
}

// Rubriques de la fiche (demande de Jaelle du 2026-10-24 : informations réparties).
// Une rubrique sans contenu n'est pas affichée (plus de texte de remplissage non prouvé).
export function productSections(product: ProductView): ProductSection[] {
  const care = [product.materials.join(', '), product.entretien].filter(Boolean).join(' — ');
  const sections: ProductSection[] = [];
  if (product.accroche && product.description) sections.push({ key: 'description', label: 'Description', lines: [product.description] });
  if (care) sections.push({ key: 'matieres', label: 'Matières & Entretien', lines: [care] });
  if (product.details.length) sections.push({ key: 'dimensions', label: 'Dimensions & détails', lines: product.details });
  sections.push({
    key: 'livraison',
    label: 'Livraison & Retours',
    lines: ['Expédition offerte en France métropolitaine. Chaque pièce est préparée à la main dans notre atelier.'],
  });
  return sections;
}

export const productQuote = (product: ProductView) => product.accroche || product.description;

// Prix affiché : « 55 » ou « 45,50 » (euros), comme l'ancien site pour les prix ronds.
export function formatEuros(cents: number): string {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2).replace('.', ',');
}
