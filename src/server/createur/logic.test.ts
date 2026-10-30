// Espace créatrice : saisie d'une fiche, variantes, liste de contrôle, slug, SKU, type réel des photos.
import { describe, expect, it } from 'vitest';
import {
  canPublish, checklist, gridRows, imageType, inStockOf, productFields, skuFor, slugify, variantIdFor, variantsInput,
} from './logic';

const fields = {
  name: 'Cape de bain écrue', categoryId: 'bebe', subCategory: 'capes', priceCents: 8900, accroche: 'a', histoire: '',
  description: 'd', materials: ['gaze de coton'], entretien: '', details: [], faq: [], limitedEditionSize: null,
  giftWrap: true, tags: [], usages: ['naissance'],
};
const categories = [{ slug: 'bebe', data: { name: 'Bébé', order: 0, intro: '', subs: [{ slug: 'capes', name: 'Capes' }] } }];
const variant = (over = {}) => ({ sku: 'S', color: null, size: null, priceCents: null, stock: 2, dimensions: null, active: true, order: 0, ...over });
const image = { path: 'produits/p/x.jpg', url: 'https://x', alt: 'Cape pliée', order: 0 };

describe('saisie d’une fiche', () => {
  it('fiche complète : acceptée', () => expect(productFields.safeParse(fields).success).toBe(true));
  it.each([
    ['prix négatif', { priceCents: -1 }],
    ['prix décimal', { priceCents: 45.5 }],
    ['champ inconnu (statut)', { status: 'published' }],
    ['images envoyées avec les champs', { images: [image] }],
    ['stock envoyé avec les champs', { inStock: true }],
    ['slug avec majuscules', { slug: 'Cape' }],
    ['catégorie piégée', { categoryId: '../x' }],
    ['nom vide', { name: ' ' }],
    ['accroche trop longue', { accroche: 'x'.repeat(201) }],
  ])('%s : refusée', (_, over) => expect(productFields.safeParse({ ...fields, ...over }).success).toBe(false));
});

describe('variantes', () => {
  const row = { color: 'Écru', size: '0-3 mois', stock: 3, expectedStock: null, dimensions: '', priceCents: null, active: true };
  it('stock négatif, énorme ou décimal : refusé', () => {
    for (const stock of [-1, 10_000, 1.5]) expect(variantsInput.safeParse({ productId: 'p1', rows: [{ ...row, stock }] }).success).toBe(false);
  });
  it('identifiant de variante piégé : refusé', () => {
    expect(variantsInput.safeParse({ productId: 'p1', rows: [{ ...row, id: '../../orders/x' }] }).success).toBe(false);
  });
  it('grille coloris × tailles ; sans rien, une variante unique', () => {
    expect(gridRows(['Écru', 'Rose'], ['S', 'M'])).toHaveLength(4);
    expect(gridRows([], [])).toEqual([{ color: '', size: '' }]);
  });
  it('identifiant et SKU lisibles', () => {
    expect(variantIdFor('Écru', '0-3 mois')).toBe('ecru-0-3-mois');
    expect(variantIdFor('', '')).toBe('unique');
    expect(skuFor('cape-de-bain-ecrue', 'Écru', 'S')).toBe('CAPE-DE-ECRU-S');
  });
  it('en stock : au moins une variante active avec du stock', () => {
    expect(inStockOf([variant({ stock: 0 }), variant({ active: false })])).toBe(false);
    expect(inStockOf([variant({ stock: 0 }), variant()])).toBe(true);
  });
});

it('slug : accents, esperluette et ponctuation', () => {
  expect(slugify('Coffret Lune & Étoile !')).toBe('coffret-lune-etoile');
  expect(slugify('***')).toBe('piece');
});

describe('liste de contrôle', () => {
  const full = { ...fields, images: [image], aiDraft: { generatedAt: null, reviewed: false } };
  it('fiche complète : publiable', () => expect(canPublish(checklist(full, [variant()], categories))).toBe(true));
  it.each([
    ['sans photo', { images: [] }, 'photos'],
    ['photo sans texte alternatif', { images: [{ ...image, alt: ' ' }] }, 'alt'],
    ['sans prix', { priceCents: 0 }, 'prix'],
    ['famille inconnue', { subCategory: 'autre' }, 'categorie'],
    ['sans accroche', { accroche: '' }, 'accroche'],
    ['brouillon IA non relu', { aiDraft: { generatedAt: { toDate: () => new Date() }, reviewed: false } }, 'ia'],
  ])('%s : bloquée', (_, over, key) => {
    const items = checklist({ ...full, ...over } as never, [variant()], categories);
    expect(canPublish(items)).toBe(false);
    expect(items.find((i) => i.key === key)?.ok).toBe(false);
  });
  it('aucune variante en stock : bloquée', () => {
    expect(checklist(full, [variant({ stock: 0 })], categories).find((i) => i.key === 'stock')?.ok).toBe(false);
  });
});

describe('type réel des photos', () => {
  it('JPEG, PNG, WebP reconnus par leurs premiers octets', () => {
    expect(imageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0]))).toBe('jpg');
    expect(imageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe('png');
    expect(imageType(new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 '))).toBe('webp');
  });
  it('SVG, HTML, PDF déguisés en image : refusés', () => {
    for (const s of ['<svg xmlns="http://www.w3.org/2000/svg">', '<html><script>', '%PDF-1.7']) expect(imageType(new TextEncoder().encode(s))).toBeNull();
  });
});
