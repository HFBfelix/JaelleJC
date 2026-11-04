// Recherche par usage (étape 7bis, lot 6), partie pure et testée. Quand la recherche par mots ne trouve rien
// (« cadeau pour le baptême de mon neveu », « je pars en vacances »), Mistral choisit parmi les pièces en ligne
// celles qui conviennent, d'après leurs seuls faits (nom, univers, famille, usages, accroche). Il ne peut proposer
// qu'une pièce du catalogue fourni ; tout autre identifiant est ignoré.
import { z } from 'zod';
import type { ProductCardView } from './types';

export const USAGE_QUERY_MAX = 200;
export const USAGE_RESULTS_MAX = 24;
const CATALOGUE_MAX = 80;

// Mistral n'est sollicité que si les mots seuls ne trouvent rien, pour une vraie phrase (3 caractères au moins).
export const shouldAskUsage = (term: string, keywordMatches: number) => keywordMatches === 0 && term.trim().length >= 3;

export function usagePrompt(): string {
  return `Tu aides une cliente de Jaelle & JC (atelier de couture en Île-de-France : cadeaux de naissance cousus main,
petites séries) à trouver une pièce. Tu reçois sa RECHERCHE, en langage courant, et le CATALOGUE des pièces en ligne.

RÈGLES
- Choisis seulement des pièces du CATALOGUE qui conviennent vraiment à la recherche, d'après leurs faits (nom, univers,
  famille, usages, accroche). N'invente aucune pièce ni aucun fait.
- Un cadeau pour une naissance, un baptême ou une arrivée de bébé : les pièces d'univers ou d'usage naissance, bébé,
  coffret. Des vacances, la plage, un voyage : les cabas et pièces d'usage vacances.
- Classe de la plus pertinente à la moins pertinente. Rien ne convient : liste vide.

Réponds uniquement en JSON : {"ids": ["identifiant reçu", ...]}`;
}

export const usageFacts = (query: string, products: ProductCardView[]) => JSON.stringify({
  recherche: query.slice(0, USAGE_QUERY_MAX),
  catalogue: products.slice(0, CATALOGUE_MAX).map((p) => ({
    id: p.id, nom: p.name, univers: p.categoryName, famille: p.subName, usages: p.usages, accroche: p.summary,
  })),
});

const reply = z.object({ ids: z.array(z.unknown()) });

// Identifiants du catalogue seulement, sans doublon, dans l'ordre de Mistral ; réponse illisible : null.
export function parseUsageIds(raw: string, products: ProductCardView[]): string[] | null {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = reply.safeParse(json);
  if (!parsed.success) return null;
  const known = new Set(products.map((p) => p.id));
  return [...new Set(parsed.data.ids.filter((id): id is string => typeof id === 'string' && known.has(id)))].slice(0, USAGE_RESULTS_MAX);
}
