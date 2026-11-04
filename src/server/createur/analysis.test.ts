// Analyse IA d'une pièce : la réponse de l'IA n'est jamais crue sur parole (types, limites, catégories existantes),
// et les variantes proposées ne font jamais perdre de stock.
import { describe, expect, it } from 'vitest';
import { analysisPrompt, clip, mergeVariants, parseAnalysis, type GridRow } from './analysis';
import { audioType } from './logic';

const categories = [{ slug: 'naissance', name: 'Naissance', subs: [{ slug: 'capes', name: 'Capes' }, { slug: 'langes', name: 'Langes' }] }];
const reply = (o: Record<string, unknown>) => JSON.stringify(o);

describe('consigne envoyée à l’IA', () => {
  it('interdit l’invention et ne propose que les univers existants', () => {
    const p = analysisPrompt(categories);
    expect(p).toContain('N\'utilise que ce que disent les NOTES');
    expect(p).toContain('Prix et stock : seulement s\'ils sont écrits clairement');
    expect(p).toContain('"slug":"naissance"');
  });
});

describe('lecture de la réponse', () => {
  it('réponse complète : fiche préremplie, prix en centimes', () => {
    const a = parseAnalysis(reply({
      nom: 'Cape de bain en gaze', univers: 'naissance', famille: 'capes', prixEuros: 45.5, matieres: ['gaze de coton', 'gaze de coton'],
      details: ['Cape : 80 × 80 cm'], usages: ['naissance', 'baptême'], accroche: 'Une cape douce.', description: 'Cape en gaze.',
      variantes: [{ coloris: 'écru', taille: '', stock: 3, prixEuros: null }], textesAlternatifs: ['Cape pliée', 'Détail', 'En trop'],
      manquants: ['Entretien non précisé'],
    }), categories, 2)!;
    expect(a).toMatchObject({
      name: 'Cape de bain en gaze', categoryId: 'naissance', subCategory: 'capes', priceCents: 4550, materials: ['gaze de coton'],
      usages: ['naissance', 'baptême'], variants: [{ color: 'écru', size: '', stock: 3, priceCents: null }], stock: null,
      alts: ['Cape pliée', 'Détail'], missing: ['Entretien non précisé'],
    });
  });

  it('univers ou famille inventés : ignorés', () => {
    const a = parseAnalysis(reply({ univers: 'luxe', famille: 'capes' }), categories, 0)!;
    expect(a.categoryId).toBeNull();
    expect(a.subCategory).toBeNull();
    expect(parseAnalysis(reply({ univers: 'naissance', famille: 'bijoux' }), categories, 0)!.subCategory).toBeNull();
  });

  it('prix et stock douteux : null, jamais devinés', () => {
    for (const prixEuros of [-5, 0, 'quarante', 1e9]) expect(parseAnalysis(reply({ prixEuros }), categories, 0)!.priceCents).toBeNull();
    const a = parseAnalysis(reply({ variantes: [{ coloris: 'rose', taille: '3M', stock: -2 }, { coloris: 'rose', taille: '6M', stock: 2.5 }, { coloris: 'rose', taille: '9M', stock: '3' }] }), categories, 0)!;
    expect(a.variants.map((v) => v.stock)).toEqual([null, null, null]);
  });

  it('stock d’une pièce sans variantes', () => {
    expect(parseAnalysis(reply({ stock: 4 }), categories, 0)!.stock).toBe(4);
    expect(parseAnalysis(reply({ stock: 4, variantes: [{ coloris: 'rose', stock: 1 }] }), categories, 0)!.stock).toBeNull();
  });

  it('textes ramenés aux limites du schéma, sans couper un mot', () => {
    const a = parseAnalysis(reply({ nom: 'mot '.repeat(60), usages: ['cadeau de naissance pour une amie très chère qui attend', ''] }), categories, 0)!;
    expect(a.name.length).toBeLessThanOrEqual(120);
    expect(a.name.endsWith('mot')).toBe(true);
    expect(a.usages).toEqual(['cadeau de naissance pour une amie très']);
  });

  it('une fiche, une couleur : la première gardée, les autres signalées', () => {
    const a = parseAnalysis(reply({ variantes: [{ coloris: 'écru', taille: '3M' }, { coloris: 'rose', taille: '3M' }, { coloris: 'Écru', taille: '6M' }] }), categories, 0)!;
    expect(a.variants.map((v) => `${v.color} ${v.size}`)).toEqual(['écru 3M', 'Écru 6M']);
    expect(a.missing).toContain('Une fiche par couleur : « rose » à créer dans une autre fiche, reliée au même modèle');
  });

  it('variantes en double ou vides retirées', () => {
    const a = parseAnalysis(reply({ variantes: [{ coloris: 'Écru' }, { coloris: 'écru' }, { coloris: '', taille: '' }, 'x'] }), categories, 0)!;
    expect(a.variants).toEqual([{ color: 'Écru', size: '', stock: null, priceCents: null }]);
  });

  it('réponse illisible ou de mauvais type : refusée ou tolérée champ par champ', () => {
    expect(parseAnalysis('pas du json', categories, 0)).toBeNull();
    expect(parseAnalysis('[1,2]', categories, 0)).toBeNull();
    expect(parseAnalysis(reply({ nom: 42, matieres: 'coton' }), categories, 0)).toMatchObject({ name: '', materials: [] });
  });

  it('clip : espaces normalisés', () => {
    expect(clip('  Cape   de bain  ', 80)).toBe('Cape de bain');
    expect(clip(undefined, 10)).toBe('');
  });
});

describe('variantes proposées appliquées à la grille', () => {
  const row = (o: Partial<GridRow>): GridRow => ({
    key: o.id ?? 'k', color: '', colorHex: null, size: '', stock: 0, expectedStock: 0, dimensions: '', priceCents: null, active: true, ...o,
  });
  const keyOf = (n: number) => `new-${n}`;

  it('variante existante : stock repris, stock attendu inchangé (vente détectée à l’enregistrement)', () => {
    const rows = [row({ id: 'ecru', color: 'écru', stock: 1, expectedStock: 1 })];
    const next = mergeVariants(rows, { stock: null, variants: [{ color: 'Écru', size: '', stock: 5, priceCents: null }] }, keyOf);
    expect(next).toEqual([expect.objectContaining({ id: 'ecru', stock: 5, expectedStock: 1, active: true })]);
  });

  it('stock non donné : on garde celui de la grille', () => {
    const rows = [row({ id: 'ecru', color: 'écru', stock: 2, expectedStock: 2 })];
    expect(mergeVariants(rows, { stock: null, variants: [{ color: 'écru', size: '', stock: null, priceCents: null }] }, keyOf)[0]!.stock).toBe(2);
  });

  it('nouvelle variante ajoutée ; variante unique vide désactivée ; variante avec stock jamais désactivée', () => {
    const rows = [row({ id: 'unique' }), row({ id: 'bleu', color: 'bleu', stock: 4, expectedStock: 4 })];
    const next = mergeVariants(rows, { stock: null, variants: [{ color: 'rose', size: 'M', stock: null, priceCents: 5000 }] }, keyOf);
    expect(next).toEqual([
      expect.objectContaining({ id: 'unique', active: false }),
      expect.objectContaining({ id: 'bleu', active: true, stock: 4 }),
      expect.objectContaining({ key: 'new-0', color: 'rose', size: 'M', stock: 0, expectedStock: null, priceCents: 5000, active: true }),
    ]);
  });

  it('sans variantes : le stock de la pièce va à la variante unique, sinon rien ne change', () => {
    const one = [row({ id: 'unique' })];
    expect(mergeVariants(one, { stock: 3, variants: [] }, keyOf)[0]!.stock).toBe(3);
    const two = [row({ id: 'a', color: 'a' }), row({ id: 'b', color: 'b' })];
    expect(mergeVariants(two, { stock: 3, variants: [] }, keyOf)).toBe(two);
    expect(mergeVariants(one, { stock: null, variants: [] }, keyOf)).toBe(one);
  });
});

describe('dictée : type réel de l’enregistrement', () => {
  const bytes = (...parts: (number[] | string)[]) =>
    new Uint8Array(parts.flatMap((p) => (typeof p === 'string' ? [...p].map((c) => c.charCodeAt(0)) : p)));
  it.each([
    ['webm', bytes([0x1a, 0x45, 0xdf, 0xa3, 0, 0])],
    ['mp4', bytes([0, 0, 0, 0x20], 'ftypM4A ', [0, 0])],
    ['ogg', bytes('OggS', [0, 2])],
    ['wav', bytes('RIFF', [0, 0, 0, 0], 'WAVE', [0])],
  ])('%s reconnu', (type, b) => expect(audioType(b)).toBe(type));
  it('autre fichier refusé (photo, texte)', () => {
    expect(audioType(bytes([0xff, 0xd8, 0xff, 0xe0, 0]))).toBeNull();
    expect(audioType(bytes('<html>'))).toBeNull();
  });
});

describe('tailles et teintes proposées par l’IA', () => {
  it('consigne : tailles des grilles seulement', () => {
    const p = analysisPrompt(categories);
    expect(p).toContain('Femme : S, M, L, XL, XXL');
    expect(p).toContain('Bébé : 3M, 6M, 9M, 12M, 18M, 24M, 30M, 36M');
    expect(p).toContain('Enfant : 3A, 4A, 6A, 8A, 10A, 12A');
  });

  it('taille ramenée à la grille ; hors grille écartée et signalée', () => {
    const a = parseAnalysis(reply({
      variantes: [{ coloris: 'bleu', taille: '3 mois', stock: 2 }, { coloris: 'bleu', taille: 'xl' }, { coloris: 'rose', taille: '0-3 mois', stock: 1 }],
    }), categories, 0)!;
    expect(a.variants.map((v) => v.size)).toEqual(['3M', 'XL']);
    expect(a.missing).toContain('Taille « 0-3 mois » hors des grilles : à choisir dans la grille');
  });

  it('nouvelle variante d’un coloris déjà teinté : même teinte', () => {
    const rows: GridRow[] = [{ key: 'b', id: 'bleu-3m', color: 'Bleu', colorHex: '#1f3a5f', size: '3M', stock: 1, expectedStock: 1, dimensions: '', priceCents: null, active: true }];
    const next = mergeVariants(rows, { stock: null, variants: [{ color: 'bleu', size: '6M', stock: 2, priceCents: null }] }, (n) => `new-${n}`);
    expect(next[1]).toMatchObject({ color: 'bleu', size: '6M', colorHex: '#1f3a5f' });
  });
});
