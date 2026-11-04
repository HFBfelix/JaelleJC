// Pièce de l'e-mail d'inscription : en stock, avec photo, JPEG ou PNG de préférence.
import { expect, it, vi } from 'vitest';
import type { ProductCardView } from '../catalog/types';

vi.mock('server-only', () => ({}));
vi.mock('../catalog/repository', () => ({ listPublishedProductsNewestFirst: vi.fn() }));
const { pickFeatured } = await import('./featured');

const card = (id: string, inStock: boolean, url?: string): ProductCardView => ({
  id, slug: id, name: id, priceCents: 1000, categorySlug: null, categoryName: '', subSlug: null, subName: '',
  images: url ? [{ url, alt: '' }] : [], inStock,
} as unknown as ProductCardView);

it('plus récente en stock avec photo ; WebP évité si une autre photo existe ; aucune : null', () => {
  const o = 'https://www.jaellejc.com';
  expect(pickFeatured([card('epuise', false, 'a.jpg'), card('sans-photo', true), card('webp', true, 'b.webp'), card('jpeg', true, 'c.jpg')], o))
    .toEqual({ name: 'jpeg', priceCents: 1000, image: 'c.jpg', url: `${o}/produits/jpeg` });
  expect(pickFeatured([card('webp', true, 'b.webp')], o)?.image).toBe('b.webp');
  expect(pickFeatured([card('epuise', false, 'a.jpg')], o)).toBeNull();
});
