import { describe, expect, it } from 'vitest';
import { esc } from './report';

describe('échappement du texte dans le rapport de migration', () => {
  it('neutralise le HTML', () => {
    expect(esc('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;');
    expect(esc('Lin & coton')).toBe('Lin &amp; coton');
  });

  it('pas de titre, de liste ni de citation parasite en début de ligne', () => {
    expect(esc('# Titre')).toBe('\\# Titre');
    expect(esc('- puce')).toBe('\\- puce');
    expect(esc('1. numéro')).toBe('\\1. numéro');
    expect(esc('> citation')).toBe('&gt; citation');
  });

  it('une seule ligne, colonnes de tableau protégées', () => {
    expect(esc('a\n# b | c')).toBe('a # b \\| c');
  });
});
