// Choix de la pièce sur la fiche (décision de Jaelle, 2026-11-04) : rien n'est choisi à la place de la cliente,
// sauf quand une seule possibilité existe. La variante ajoutée au panier est celle qu'elle a désignée (couleur et
// taille), jamais une autre. Pur : utilisé par la fiche (navigateur) et testé.
import { sizeRank } from './sizes';
import type { VariantView } from './types';

export type Choice = { color: string; size: string };
export type Missing = 'couleur' | 'taille';

const uniq = (values: string[]) => [...new Set(values.filter(Boolean))];

export const colorsOf = (variants: VariantView[]) => uniq(variants.map((v) => v.color));
export const sizesOf = (variants: VariantView[]) => uniq(variants.map((v) => v.size)).sort((a, b) => sizeRank(a) - sizeRank(b));

// Couleur : en stock dans au moins une taille. Taille : en stock dans la couleur choisie (toutes couleurs si aucune).
export const colorAvailable = (variants: VariantView[], color: string) => variants.some((v) => v.color === color && v.inStock);
export const sizeAvailable = (variants: VariantView[], color: string, size: string) =>
  variants.some((v) => v.size === size && v.inStock && (!color || v.color === color));

// La taille n'est demandée que si les variantes de la couleur choisie (ou de la fiche) en ont.
function needsSize(variants: VariantView[], color: string) {
  return variants.some((v) => (!color || v.color === color) && v.size);
}

// Ouverture de la fiche. `wanted` : taille gardée en passant d'une couleur à l'autre (lien d'une pastille).
export function initialChoice(variants: VariantView[], wanted = ''): Choice & { notice: string | null } {
  const colors = colorsOf(variants).filter((c) => colorAvailable(variants, c));
  const color = colors.length === 1 ? colors[0]! : '';
  const sizes = sizesOf(variants).filter((s) => sizeAvailable(variants, color, s));
  if (wanted && sizes.includes(wanted)) return { color, size: wanted, notice: null };
  // Taille demandée connue de la fiche mais épuisée dans cette couleur (jamais un texte arbitraire de l'adresse).
  const notice = wanted && sizesOf(variants).includes(wanted) ? `Taille ${wanted} épuisée dans cette couleur : choisissez une autre taille.` : null;
  return { color, size: sizes.length === 1 ? sizes[0]! : '', notice };
}

// Changement de couleur : la taille choisie est gardée si elle existe en stock dans la nouvelle couleur, sinon
// décochée (jamais remplacée par une autre).
export function chooseColor(variants: VariantView[], choice: Choice, color: string): Choice & { notice: string | null } {
  if (!choice.size || sizeAvailable(variants, color, choice.size)) return { color, size: choice.size, notice: null };
  return { color, size: '', notice: `Taille ${choice.size} épuisée dans cette couleur : choisissez une autre taille.` };
}

export function missingOf(variants: VariantView[], choice: Choice): Missing[] {
  return [
    ...(colorsOf(variants).length && !choice.color ? ['couleur' as const] : []),
    ...(!choice.size && needsSize(variants, choice.color) ? ['taille' as const] : []),
  ];
}

export const missingMessage = (missing: Missing[]) =>
  missing.length === 2 ? 'Choisissez une couleur et une taille.' : missing[0] === 'couleur' ? 'Choisissez une couleur.' : 'Choisissez une taille.';

// Variante désignée par la cliente, en stock ; null tant que le choix est incomplet.
export function selectedVariant(variants: VariantView[], choice: Choice): VariantView | null {
  if (missingOf(variants, choice).length) return null;
  return variants.find((v) => v.inStock && v.color === choice.color && v.size === (needsSize(variants, choice.color) ? choice.size : '')) ?? null;
}
