import { describe, expect, it } from 'vitest';
import { chooseColor, initialChoice, missingMessage, missingOf, selectedVariant } from './choice';
import type { VariantView } from './types';

const v = (color: string, size: string, inStock = true): VariantView =>
  ({ id: `${color || 'x'}-${size || 'x'}`, label: [color, size].filter(Boolean).join(' · '), color, colorHex: null, size, inStock });

describe('choix de la pièce : rien n’est choisi à la place de la cliente', () => {
  it('ni couleur ni taille : ajout direct', () => {
    const vs = [v('', '')];
    expect(missingOf(vs, initialChoice(vs))).toEqual([]);
    expect(selectedVariant(vs, initialChoice(vs))?.id).toBe('x-x');
  });

  it('fiche d’une couleur (une fiche par couleur) : couleur cochée, taille à choisir', () => {
    const vs = [v('Noir', 'S'), v('Noir', 'M'), v('Noir', 'L', false)];
    const start = initialChoice(vs);
    expect(start).toEqual({ color: 'Noir', size: '', notice: null });
    expect(missingOf(vs, start)).toEqual(['taille']);
    expect(selectedVariant(vs, start)).toBeNull();
    expect(selectedVariant(vs, { color: 'Noir', size: 'M' })?.id).toBe('Noir-M');
    expect(selectedVariant(vs, { color: 'Noir', size: 'L' })).toBeNull(); // épuisée : jamais ajoutée
  });

  it('couleur sans taille : couleur seule cochée, ajout direct', () => {
    const vs = [v('Écru', '')];
    expect(missingOf(vs, initialChoice(vs))).toEqual([]);
  });

  it('tailles sans couleur : taille à choisir ; une seule taille en stock : cochée', () => {
    expect(missingOf([v('', '3M'), v('', '6M')], initialChoice([v('', '3M'), v('', '6M')]))).toEqual(['taille']);
    const one = [v('', '3M'), v('', '6M', false)];
    expect(initialChoice(one).size).toBe('3M');
  });

  it('ancienne fiche à plusieurs couleurs : rien de coché, couleur et taille demandées', () => {
    const vs = [v('Écru', '3M'), v('Rose', '6M')];
    const start = initialChoice(vs);
    expect(start).toEqual({ color: '', size: '', notice: null });
    expect(missingOf(vs, start)).toEqual(['couleur', 'taille']);
    expect(missingMessage(['couleur', 'taille'])).toBe('Choisissez une couleur et une taille.');
    expect(missingMessage(['taille'])).toBe('Choisissez une taille.');
  });

  it('changement de couleur : taille gardée si en stock, sinon décochée avec un message (jamais remplacée)', () => {
    const vs = [v('Écru', '3M'), v('Écru', '6M'), v('Rose', '6M'), v('Rose', '3M', false)];
    expect(chooseColor(vs, { color: 'Écru', size: '6M' }, 'Rose')).toEqual({ color: 'Rose', size: '6M', notice: null });
    expect(chooseColor(vs, { color: 'Écru', size: '3M' }, 'Rose'))
      .toEqual({ color: 'Rose', size: '', notice: 'Taille 3M épuisée dans cette couleur : choisissez une autre taille.' });
  });

  it('taille venue de la fiche d’une autre couleur : gardée si en stock, sinon message ; texte inconnu ignoré', () => {
    const vs = [v('Bleu', 'S'), v('Bleu', 'M', false), v('Bleu', 'L')];
    expect(initialChoice(vs, 'S')).toEqual({ color: 'Bleu', size: 'S', notice: null });
    expect(initialChoice(vs, 'M')).toEqual({ color: 'Bleu', size: '', notice: 'Taille M épuisée dans cette couleur : choisissez une autre taille.' });
    expect(initialChoice(vs, '<b>Offre</b>')).toEqual({ color: 'Bleu', size: '', notice: null });
  });
});
