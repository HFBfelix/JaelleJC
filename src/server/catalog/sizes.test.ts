import { describe, expect, it } from 'vitest';
import { gridForCategory, gridOf, isGridSize, normalizeSize, sizeRank } from './sizes';

describe('grilles de tailles', () => {
  it('tailles reconnues : femme, bébé, enfant ; rien d’autre', () => {
    for (const s of ['S', 'XXL', '3M', '36M', '3A', '12A']) expect(isGridSize(s)).toBe(true);
    for (const s of ['XS', '1M', '0-3 mois', '14A', '', 's']) expect(isGridSize(s)).toBe(false);
  });

  it('grille proposée selon l’univers', () => {
    expect(gridForCategory('femmes')).toBe('femme');
    expect(gridForCategory('bebe')).toBe('bebe');
    expect(gridForCategory('coffrets')).toBeNull();
    expect(gridForCategory(null)).toBeNull();
  });

  it('grille retrouvée à partir des tailles d’une fiche', () => {
    expect(gridOf(['', '6M'])).toBe('bebe');
    expect(gridOf(['M'])).toBe('femme');
    expect(gridOf(['4A'])).toBe('enfant');
    expect(gridOf(['', 'unique'])).toBeNull();
  });

  it('écritures courantes ramenées à la grille', () => {
    expect(normalizeSize('3 mois')).toBe('3M');
    expect(normalizeSize('03A')).toBe('3A');
    expect(normalizeSize('4 ans')).toBe('4A');
    expect(normalizeSize('xl')).toBe('XL');
    expect(normalizeSize('0-3 mois')).toBeNull();
    expect(normalizeSize('taille unique')).toBeNull();
  });

  it('ordre d’affichage : celui de la grille, tailles inconnues à la fin', () => {
    expect(['12M', '3M', '6M'].sort((a, b) => sizeRank(a) - sizeRank(b))).toEqual(['3M', '6M', '12M']);
    expect(['XL', 'S', 'M'].sort((a, b) => sizeRank(a) - sizeRank(b))).toEqual(['S', 'M', 'XL']);
    expect(sizeRank('ancienne')).toBeGreaterThan(sizeRank('12A'));
  });
});
