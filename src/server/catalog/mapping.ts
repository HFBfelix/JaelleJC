// Conversion document Firestore → vue publique. Pure (testée sans base).
// Un document qui ne respecte pas le schéma n'est jamais affiché : mieux vaut une pièce absente
// qu'un prix ou un stock faux.
import { categorie, produit, variante } from '../db/schema';
import type { CategoryView, ProductCardView, ProductView } from './types';

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
    images: [...p.images].sort((a, b) => a.order - b.order).map((img) => ({ url: img.url, alt: img.alt })),
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
  const stock = variants
    .map((v) => variante.safeParse(v))
    .filter((v) => v.success && v.data.active)
    .reduce((sum, v) => sum + (v.success ? v.data.stock : 0), 0);
  const updated = (data as { updatedAt?: { toDate?: () => Date } }).updatedAt;
  return {
    ...card,
    inStock: stock > 0,
    stock,
    accroche: p.accroche,
    description: p.description,
    details: p.details,
    materials: p.materials,
    entretien: p.entretien,
    updatedAt: typeof updated?.toDate === 'function' ? updated.toDate().toISOString() : null,
  };
}

// Prix affiché : « 55 » ou « 45,50 » (euros), comme l'ancien site pour les prix ronds.
export function formatEuros(cents: number): string {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2).replace('.', ',');
}
