import { describe, expect, it } from 'vitest';
import { formatEuros, isValidSlug, productSections, toCategoryView, toProductCard, toProductView } from './mapping';

const BUCKET = 'https://firebasestorage.googleapis.com/v0/b/jaellejc.firebasestorage.app/o/produits%2F';

const categories = [
  { slug: 'coffrets', name: 'Coffrets', order: 0, subs: [{ slug: 'naissance', name: 'naissance' }] },
];

const produit = (over: Record<string, unknown> = {}) => ({
  slug: 'coffret-blanc', name: 'Coffret blanc', categoryId: 'coffrets', subCategory: 'naissance', status: 'published',
  accroche: 'Conçu pour accompagner les premiers moments de bébé.', histoire: '',
  description: 'Un coffret cousu main.', materials: ['coton'], entretien: 'Laver à 30°',
  details: ['Lange : 70 × 70 cm'], faq: [],
  images: [{ path: 'b', url: `${BUCKET}b.jpg`, alt: '', order: 1 }, { path: 'a', url: `${BUCKET}a.jpg`, alt: 'Coffret plié', order: 0 }],
  priceCents: 5500, limitedEditionSize: null, giftWrap: true, tags: [], inStock: true,
  aiDraft: { generatedAt: null, reviewed: false }, ...over,
});

const variante = (stock: number, active = true, over: Record<string, unknown> = {}) => ({
  id: `v-${stock}-${active}`,
  data: { sku: 'X', color: null, size: null, priceCents: null, stock, dimensions: null, active, order: 0, ...over },
});

describe('vue publique d’un produit', () => {
  it('produit publié : carte complète, photos dans l’ordre, noms de catégorie', () => {
    const card = toProductCard('id1', produit(), categories)!;
    expect(card).toMatchObject({ slug: 'coffret-blanc', priceCents: 5500, categoryName: 'Coffrets', subName: 'naissance' });
    expect(card.images.map((i) => i.url)).toEqual([`${BUCKET}a.jpg`, `${BUCKET}b.jpg`]);
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

  it('disponibilité : seules les variantes actives comptent, le nombre exact n’est jamais transmis', () => {
    const view = toProductView('id', produit(), [variante(2), variante(9, false)], categories)!;
    expect(view.inStock).toBe(true);
    expect(view).not.toHaveProperty('stock');
    expect(view).not.toHaveProperty('updatedAt');
    const empty = toProductView('id', produit(), [variante(0), variante(9, false), { id: 'x', data: { stock: 'beaucoup' } }], categories)!;
    expect(empty.inStock).toBe(false);
  });

  it('variantes proposées au panier : actives seulement, dans l’ordre, disponibilité sans stock exact', () => {
    const view = toProductView('id', produit(), [
      variante(0, true, { color: 'Bleu', order: 1 }),
      variante(3, true, { color: 'Écru', size: '6 mois', order: 0 }),
      variante(9, false),
    ], categories)!;
    expect(view.variants).toEqual([
      { id: 'v-3-true', label: 'Écru · 6 mois', inStock: true },
      { id: 'v-0-true', label: 'Bleu', inStock: false },
    ]);
  });

  it('aucun champ interne transmis (legacy, aiDraft, tags, histoire, faq)', () => {
    const view = toProductView('id', produit({ legacy: { price: 55 }, tags: ['interne'], histoire: 'brouillon' }), [variante(1)], categories)!;
    for (const key of ['legacy', 'aiDraft', 'tags', 'histoire', 'faq', 'status']) expect(view).not.toHaveProperty(key);
  });

  it('photo hors des buckets de la boutique ignorée (la page ne doit pas échouer)', () => {
    const card = toProductCard('id', produit({ images: [{ path: 'x', url: 'https://autre-site.example/x.jpg', alt: '', order: 0 }] }), categories)!;
    expect(card.images).toEqual([]);
  });

  it('adresse de fiche : forme du slug vérifiée avant toute lecture', () => {
    expect(isValidSlug('coffret-blanc')).toBe(true);
    for (const bad of ['', 'A-Majuscule', 'x'.repeat(81), '<script>', 'a--b', '../settings', 'é']) expect(isValidSlug(bad)).toBe(false);
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
