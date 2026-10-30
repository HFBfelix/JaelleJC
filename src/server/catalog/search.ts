// Recherche de la page Collections, pure (testée sans navigateur). Par mots, sans accents ni casse : nom, univers,
// famille, accroche et cas d'usage. Chaque mot saisi doit apparaître (« cape bebe » → capes de l'univers Bébé).
// La recherche par usage en langage courant (« un cadeau pour un baptême ») arrive à l'étape 7bis.
import type { ProductCardView } from './types';

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function matchesSearch(product: ProductCardView, term: string): boolean {
  const words = fold(term).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = fold([product.name, product.categoryName, product.subName, product.summary, ...product.usages].join(' '));
  return words.every((w) => haystack.includes(w));
}
