// Export Excel et catalogue : variantes en stock seulement, textes de l'IA bornés, entrée du PDF validée.
import { describe, expect, it } from 'vitest';
import type { AdminProduct, AdminVariant } from '../createur/products';
import {
  CATALOGUE_TEXT_MAX, cataloguePrompt, defaultText, exportRows, generateInput, parseCatalogueTexts, toPiece,
} from './logic';

const product = (over: Partial<AdminProduct> = {}): AdminProduct => ({
  id: 'p1', slug: 'gilet', name: 'Gilet', sku: 'GIL-01', categoryId: 'bebe', subCategory: 'vestes', status: 'published',
  accroche: 'Un gilet doux.', histoire: '', description: 'Gilet en laine.', materials: ['laine'], entretien: '', details: [], faq: [],
  images: [{ path: 'p', url: 'https://firebasestorage.googleapis.com/x.jpg', alt: 'Gilet', order: 0 }], priceCents: 5200,
  limitedEditionSize: null, giftWrap: true, tags: [], usages: [], inStock: true, publishedAt: null, aiDraft: { generatedAt: null, reviewed: true },
  ...over,
});
const variant = (id: string, color: string | null, size: string | null, stock: number, over: Partial<AdminVariant> = {}): AdminVariant => ({
  id, sku: `S-${id}`, color, colorHex: null, size, priceCents: null, stock, dimensions: null, active: true, order: 0, ...over,
});

describe('export Excel', () => {
  it('une ligne par variante, statut lisible, stock total de la pièce', () => {
    const rows = exportRows([{ product: product(), category: 'Bébé', family: 'Vestes',
      variants: [variant('a', 'Écru', '3M', 2), variant('b', 'Écru', '6M', 1, { priceCents: 5500 }), variant('c', 'Rose', '3M', 9, { active: false })] }]);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ name: 'Gilet', sku: 'GIL-01', status: 'En ligne', color: 'Écru', size: '3M', stock: 2, totalStock: 3, priceEuros: 52, active: 'Oui' });
    expect(rows[1]!.priceEuros).toBe(55); // prix propre à la variante
    expect(rows[2]!.active).toBe('Non');
  });
  it('pièce sans variante : une ligne quand même', () => {
    expect(exportRows([{ product: product({ status: 'draft' }), variants: [], category: '', family: '' }])).toEqual([
      expect.objectContaining({ status: 'Brouillon', stock: 0, totalStock: 0 }),
    ]);
  });
});

describe('pièces du catalogue', () => {
  it('couleurs et tailles en stock seulement, tailles dans l’ordre de la grille', () => {
    const p = toPiece(product(), [
      variant('a', 'Écru', '6M', 1, { colorHex: '#f3ead8' }), variant('b', 'Écru', '3M', 2), variant('c', 'Rose', '3M', 0),
      variant('d', 'Bleu', '12M', 4, { active: false }),
    ], 'Bébé');
    expect(p.colors).toEqual([{ name: 'Écru', hex: '#f3ead8' }]);
    expect(p.sizes).toEqual(['3M', '6M']);
    expect(p.totalStock).toBe(3);
  });
  it('texte par défaut : l’accroche, sinon la description, borné', () => {
    expect(defaultText({ accroche: 'Accroche.', description: 'Desc.' })).toBe('Accroche.');
    expect(defaultText({ accroche: '', description: 'x'.repeat(500) })).toHaveLength(CATALOGUE_TEXT_MAX);
  });
});

describe('textes de l’IA', () => {
  it('consigne : faits seulement, ni prix ni stock', () => {
    expect(cataloguePrompt()).toContain('N\'utilise que les FAITS');
    expect(cataloguePrompt()).toContain('Ne cite ni prix ni stock');
  });
  it('réponse : pièces demandées seulement, textes bornés ; réponse illisible refusée', () => {
    const r = parseCatalogueTexts(JSON.stringify({
      introduction: '  Bienvenue   à l’atelier. ', pieces: [{ id: 'p1', texte: 'y'.repeat(900) }, { id: 'autre', texte: 'Intrus' }, 'n’importe quoi'],
    }), ['p1'])!;
    expect(r.intro).toBe('Bienvenue à l’atelier.');
    expect(r.texts.p1).toHaveLength(CATALOGUE_TEXT_MAX);
    expect(r.texts.autre).toBeUndefined();
    expect(parseCatalogueTexts('pas du json', ['p1'])).toBeNull();
  });
});

describe('« Générer le PDF » : entrée validée', () => {
  const ok = { ids: ['p1'], showPrices: true, intro: '', texts: { p1: 'Texte.' } };
  it('acceptée', () => expect(generateInput.safeParse(ok).success).toBe(true));
  it.each([
    ['aucune pièce', { ids: [] }],
    ['identifiant piégé', { ids: ['../x'] }],
    ['texte trop long', { texts: { p1: 'x'.repeat(CATALOGUE_TEXT_MAX + 1) } }],
    ['champ en trop (prix envoyé)', { priceCents: 1 }],
    ['trop de pièces', { ids: Array.from({ length: 61 }, (_, i) => `p${i}`) }],
  ])('%s : refusée', (_, over) => expect(generateInput.safeParse({ ...ok, ...over }).success).toBe(false));
});
