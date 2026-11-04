// Pièce mise en avant dans l'e-mail d'inscription à la newsletter : la plus récente en ligne et en stock, avec une
// photo. Une photo JPEG ou PNG est préférée (les WebP de l'ancien site ne s'affichent pas dans toutes les messageries).
import 'server-only';
import { listPublishedProductsNewestFirst } from '../catalog/repository';
import type { ProductCardView } from '../catalog/types';
import type { MailPiece } from './templates';

const webp = (url: string) => /\.webp(\?|$)/i.test(decodeURIComponent(url));

export function pickFeatured(cards: ProductCardView[], origin: string): MailPiece | null {
  const withPhoto = cards.filter((c) => c.inStock && c.images[0]?.url);
  const card = withPhoto.find((c) => !webp(c.images[0]!.url)) ?? withPhoto[0];
  return card ? { name: card.name, priceCents: card.priceCents, image: card.images[0]!.url, url: `${origin}/produits/${card.slug}` } : null;
}

export async function featuredPiece(origin: string): Promise<MailPiece | null> {
  return pickFeatured(await listPublishedProductsNewestFirst(), origin);
}
