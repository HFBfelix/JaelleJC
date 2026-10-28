import { describe, expect, it } from 'vitest';
import { toOffer } from './offers';
import { hashToken, isValidToken, newToken } from './token';

const product = (over: Record<string, unknown> = {}) => ({
  slug: 'cape', name: 'Cape', categoryId: 'bebe', subCategory: null, status: 'published',
  accroche: '', histoire: '', description: 'Cape cousue main.', materials: [], entretien: '', details: [], faq: [],
  images: [], priceCents: 8900, limitedEditionSize: null, giftWrap: true, tags: [], inStock: true,
  aiDraft: { generatedAt: null, reviewed: true }, ...over,
});
const variant = (over: Record<string, unknown> = {}) => ({
  sku: 'C-U', color: null, size: null, priceCents: null, stock: 3, dimensions: null, active: true, order: 0, ...over,
});
const categories = [{ slug: 'bebe', name: 'Bébé', order: 0, subs: [] }];

describe('offre vendable', () => {
  it('produit publié + variante active : prix de base', () => {
    expect(toOffer('p1', product(), 'unique', variant(), categories)).toMatchObject({
      unitPriceCents: 8900, stock: 3, categoryName: 'Bébé', variantLabel: '',
    });
  });

  it('prix de la variante prioritaire, libellé coloris · taille', () => {
    expect(toOffer('p1', product(), 'v', variant({ priceCents: 9500, color: 'Bleu', size: '6 mois' }), categories))
      .toMatchObject({ unitPriceCents: 9500, variantLabel: 'Bleu · 6 mois' });
  });

  it.each([
    ['brouillon', product({ status: 'draft' }), variant()],
    ['archivé', product({ status: 'archived' }), variant()],
    ['prix invalide', product({ priceCents: 0 }), variant()],
    ['variante inactive', product(), variant({ active: false })],
    ['variante absente', product(), undefined],
    ['produit absent', undefined, variant()],
  ])('%s : non vendable', (_, p, v) => {
    expect(toOffer('p1', p, 'unique', v, categories)).toBeUndefined();
  });
});

describe('jeton du cookie', () => {
  it('aléatoire, au bon format, empreinte SHA-256', () => {
    const a = newToken();
    expect(isValidToken(a)).toBe(true);
    expect(a).not.toBe(newToken());
    expect(hashToken(a)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashToken(a)).not.toContain(a);
  });

  it.each([undefined, '', 'court', 'a'.repeat(44), `${'a'.repeat(42)}$`])('jeton invalide refusé : %s', (v) => {
    expect(isValidToken(v)).toBe(false);
  });
});
