// Document produit + variante → offre vendable. Pure (testée sans base) : même validation que le catalogue,
// un document non conforme, non publié ou une variante inactive ne se vend pas.
import { toProductCard } from '../catalog/mapping';
import type { CategoryView } from '../catalog/types';
import { variante } from '../db/schema';
import type { Offer } from './types';

export const variantLabel = (v: { color: string | null; size: string | null }) =>
  [v.color, v.size].filter(Boolean).join(' · ');

export function toOffer(
  productId: string,
  productData: unknown,
  variantId: string,
  variantData: unknown,
  categories: CategoryView[],
): Offer | undefined {
  const card = toProductCard(productId, productData, categories);
  const v = variante.safeParse(variantData);
  if (!card || !v.success || !v.data.active) return undefined;
  return {
    productId,
    variantId,
    slug: card.slug,
    name: card.name,
    variantLabel: variantLabel(v.data),
    categoryName: card.categoryName,
    image: card.images[0] ?? null,
    sku: v.data.sku,
    unitPriceCents: v.data.priceCents ?? card.priceCents,
    stock: v.data.stock,
  };
}
