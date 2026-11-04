'use server';

// Recherche par usage (lot 6) : action publique, entrée validée, appels limités par visiteur et pour tout le site
// (facture Mistral bornée). La phrase de la cliente part chez Mistral (données en Europe) le temps de la réponse :
// elle n'est ni enregistrée ni écrite dans le journal. Tout échec : `null`, la recherche par mots reste affichée.
import { z } from 'zod';
import { aiEnabled, endpoint } from '../createur/ai';
import { clientIp, takeRateLimit } from '../http/rate-limit';
import { listPublishedProducts } from './repository';
import { USAGE_QUERY_MAX, parseUsageIds, usageFacts, usagePrompt } from './usage-search';

const USAGE_PER_VISITOR_PER_HOUR = 30;
const USAGE_PER_SITE_PER_HOUR = 500;
const TIMEOUT_MS = 8_000;

export async function searchByUsageAction(input: unknown): Promise<{ ids: string[] | null }> {
  const parsed = z.strictObject({ q: z.string().trim().min(3).max(USAGE_QUERY_MAX) }).safeParse(input);
  if (!parsed.success || !aiEnabled()) return { ids: null };
  try {
    if (!(await takeRateLimit('recherche-ip', await clientIp(), USAGE_PER_VISITOR_PER_HOUR, 3600_000))) return { ids: null };
    if (!(await takeRateLimit('recherche-site', 'tout', USAGE_PER_SITE_PER_HOUR, 3600_000))) return { ids: null };
    const products = await listPublishedProducts();
    if (!products.length) return { ids: [] };
    const res = await fetch(endpoint('/v1/chat/completions'), {
      method: 'POST',
      headers: { authorization: `Bearer ${process.env.MISTRAL_API_KEY!.trim()}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: process.env.MISTRAL_MODEL?.trim() || 'mistral-small-latest',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: usagePrompt() }, { role: 'user', content: usageFacts(parsed.data.q, products) }],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return { ids: null };
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return { ids: parseUsageIds(body.choices?.[0]?.message?.content ?? '', products) };
  } catch {
    console.error('recherche par usage : indisponible, recherche par mots seule'); // jamais la phrase
    return { ids: null };
  }
}
