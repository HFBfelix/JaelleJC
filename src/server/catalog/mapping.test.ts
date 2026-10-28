import { describe, expect, it } from 'vitest';
import { formatEuros, toCategoryView, toProductCard, toProductView } from './mapping';
import { productSections } from '@/components/products/ProductInfo';

const categories = [
  { slug: 'coffrets', name: 'Coffrets', order: 0, subs: [{ slug: 'naissance', name: 'naissance' }] },
];

const produit = (over: Record<string, unknown> = {}) => ({
  slug: 'coffret-blanc', name: 'Coffret blanc', categoryId: 'coffrets', subCategory: 'naissance', status: 'published',
  accroche: 'Conçu pour accompagner les premiers moments de bébé.', histoire: '',
  description: 'Un coffret cousu main.', materials: ['coton'], entretien: 'Laver à 30°',
  details: ['Lange : 70 × 70 cm'], faq: [],
  images: [{ path: 'b', url: 'https://x/b.jpg', alt: '', order: 1 }, { path: 'a', url: 'https://x/a.jpg', alt: 'Coffret plié', order: 0 }],
  priceCents: 5500, limitedEditionSize: null, giftWrap: true, tags: [], inStock: true,
  aiDraft: { generatedAt: null, reviewed: false }, ...over,
});

const variante = (stock: number, active = true) => ({
  sku: 'X', color: null, size: null, priceCents: null, stock, dimensions: null, active, order: 0,
});

describe('vue publique d’un produit', () => {
  it('produit publié : carte complète, photos dans l’ordre, noms de catégorie', () => {
    const card = toProductCard('id1', produit(), categories)!;
    expect(card).toMatchObject({ slug: 'coffret-blanc', priceCents: 5500, categoryName: 'Coffrets', subName: 'naissance' });
    expect(card.images.map((i) => i.url)).toEqual(['https://x/a.jpg', 'https://x/b.jpg']);
    expect(card.summary).toBe('Conçu pour accompagner les premiers moments de bébé.');
  });

  it('brouillon, archive : jamais affichés', () => {
    expect(toProductCard('id', produit({ status: 'draft' }), categories)).toBeNull();
    expect(toProductCard('id', produit({ status: 'archived' }), categories)).toBeNull();
  });

  it('document non conforme (prix nul, négatif, texte, slug invalide, ancien format) : jamais affiché', () => {
    for (const over of [{ priceCents: 0 }, { priceCents: -100 }, { priceCents: '55' }, { priceCents: 55.5 }, { slug: 'Avec Espaces' }, { price: 55, priceCents: undefined }]) {
      expect(toProductCard('id', produit(over), categories)).toBeNull();
    }
  });

  it('stock : somme des seules variantes actives', () => {
    const view = toProductView('id', produit(), [variante(2), variante(3), variante(9, false)], categories)!;
    expect(view.stock).toBe(5);
    expect(view.inStock).toBe(true);
    const empty = toProductView('id', produit(), [variante(0), variante(9, false), { stock: 'beaucoup' }], categories)!;
    expect(empty.stock).toBe(0);
    expect(empty.inStock).toBe(false);
  });

  it('catégorie inconnue : affichée sans nom de catégorie', () => {
    expect(toProductCard('id', produit({ categoryId: 'autre' }), categories)).toMatchObject({ categoryName: '', categorySlug: null });
  });

  it('résumé tronqué à 160 caractères', () => {
    const card = toProductCard('id', produit({ accroche: '', description: 'x'.repeat(400) }), categories)!;
    expect(card.summary.length).toBeLessThanOrEqual(160);
  });

  it('catégorie non conforme ignorée', () => {
    expect(toCategoryView('x', { name: '' })).toBeNull();
    expect(toCategoryView('bebe', { name: 'Bébé', order: 0, intro: '', subs: [] })).toMatchObject({ name: 'Bébé' });
  });
});

describe('affichage', () => {
  it('prix en euros comme l’ancien site', () => {
    expect(formatEuros(5500)).toBe('55');
    expect(formatEuros(4550)).toBe('45,50');
    expect(formatEuros(99)).toBe('0,99');
  });

  it('rubriques : description, matières et entretien, dimensions, livraison ; rien de vide', () => {
    const full = toProductView('id', produit(), [variante(1)], categories)!;
    expect(productSections(full).map((s) => s.label)).toEqual(['Description', 'Matières & Entretien', 'Dimensions & détails', 'Livraison & Retours']);
    expect(productSections(full)[1]!.lines).toEqual(['coton — Laver à 30°']);
    const bare = toProductView('id', produit({ accroche: '', materials: [], entretien: '', details: [] }), [variante(1)], categories)!;
    expect(productSections(bare).map((s) => s.label)).toEqual(['Livraison & Retours']);
  });
});
