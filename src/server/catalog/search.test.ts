// Recherche de la collection : accents, casse, univers, famille, cas d'usage, plusieurs mots.
import { expect, it } from 'vitest';
import { matchesSearch } from './search';
import type { ProductCardView } from './types';

const cape: ProductCardView = {
  id: 'p', slug: 'cape', name: 'Cape de bain écrue', priceCents: 8900, categorySlug: 'bebe', categoryName: 'Bébé',
  subSlug: 'capes', subName: 'Capes', images: [], inStock: true, summary: 'Pour le premier bain.', usages: ['naissance', 'baptême'],
};

it.each(['cape', 'CAPE', 'ecrue', 'bebe', 'Bébé', 'naissance', 'bapteme', 'cape bebe', 'premier bain', ''])('« %s » : trouvée', (q) =>
  expect(matchesSearch(cape, q)).toBe(true));

it.each(['cabas', 'cape cabas', 'vacances'])('« %s » : non trouvée', (q) => expect(matchesSearch(cape, q)).toBe(false));
