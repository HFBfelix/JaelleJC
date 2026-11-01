// Grilles de tailles de la boutique (décision de Jaelle, 2026-11-01). La créatrice coche ses tailles dans une grille ;
// la fiche les affiche dans l'ordre de la grille. Pur : utilisé par le serveur, l'espace créatrice et la fiche.
export const SIZE_GRIDS = {
  femme: { label: 'Femme', sizes: ['S', 'M', 'L', 'XL', 'XXL'] },
  bebe: { label: 'Bébé', sizes: ['3M', '6M', '9M', '12M', '18M', '24M', '30M', '36M'] },
  enfant: { label: 'Enfant', sizes: ['3A', '4A', '6A', '8A', '10A', '12A'] },
} as const;
export type SizeGrid = keyof typeof SIZE_GRIDS;
export const SIZE_GRID_KEYS = Object.keys(SIZE_GRIDS) as SizeGrid[];

const ALL_SIZES: string[] = SIZE_GRID_KEYS.flatMap((g) => [...SIZE_GRIDS[g].sizes]);
export const isGridSize = (size: string) => ALL_SIZES.includes(size);

// Grille proposée d'office selon l'univers (modifiable par la créatrice) : Femmes → Femme, Bébé → Bébé.
export const gridForCategory = (categoryId: string | null): SizeGrid | null =>
  categoryId === 'femmes' ? 'femme' : categoryId === 'bebe' ? 'bebe' : null;

// Grille d'une liste de tailles déjà saisies (la première reconnue), pour rouvrir une fiche sur la bonne grille.
export const gridOf = (sizes: string[]): SizeGrid | null =>
  SIZE_GRID_KEYS.find((g) => sizes.some((s) => (SIZE_GRIDS[g].sizes as readonly string[]).includes(s))) ?? null;

// « 3 mois » → « 3M », « 4 ans » → « 4A », « xl » → « XL » ; hors grille → null.
export function normalizeSize(value: string): string | null {
  const v = value.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, '')
    .replace(/^0+(?=\d)/, '').replace(/MOIS$/, 'M').replace(/ANS?$/, 'A');
  return isGridSize(v) ? v : null;
}

// Rang d'une taille pour l'affichage (ordre de la grille) ; taille inconnue (anciennes fiches) : après, ordre gardé.
export const sizeRank = (size: string) => {
  const i = ALL_SIZES.indexOf(size);
  return i === -1 ? ALL_SIZES.length : i;
};
