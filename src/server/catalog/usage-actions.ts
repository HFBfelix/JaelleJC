'use server';

// Recherche par usage (lot 6) : action publique appelée par la page Collections. Entrée validée ici ; limites,
// mémoire, appel à Mistral, compteurs et alertes dans usage-service.ts. Tout échec : `null`, la recherche par mots
// reste affichée. La phrase n'est ni enregistrée ni écrite dans le journal.
import { z } from 'zod';
import { USAGE_QUERY_MAX } from './usage-search';
import { searchByUsage } from './usage-service';

export async function searchByUsageAction(input: unknown): Promise<{ ids: string[] | null }> {
  const parsed = z.strictObject({ q: z.string().trim().min(3).max(USAGE_QUERY_MAX) }).safeParse(input);
  if (!parsed.success) return { ids: null };
  try {
    return { ids: await searchByUsage(parsed.data.q) };
  } catch {
    console.error('recherche par usage : erreur interne, recherche par mots seule'); // jamais la phrase
    return { ids: null };
  }
}
