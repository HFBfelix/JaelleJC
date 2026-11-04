// Paragraphe personnalisé par Mistral (lot 5), ajouté après le texte fixe des e-mails qui le proposent, si Jaelle l'a
// laissé coché dans l'Atelier. Le moindre échec (pas de clé, quota, délai, réponse refusée) : null, le texte fixe
// part seul. Jamais pour un e-mail envoyé pendant le paiement (confirmation, excuses).
import 'server-only';
import { COLLECTIONS, produit } from '../db/schema';
import { MAX_TOKENS, aiEnabled, endpoint, takeQuota } from '../createur/ai';
import { adminDb } from '../firebase/admin';
import { parsePersonal, personalFacts, personalPrompt, type PieceFacts } from './personal-logic';
import type { EmailKind } from './texts';

export const EMAIL_AI_PER_HOUR = 100; // pour tout le site : borne la facture si un envoi s'emballe
const TIMEOUT_MS = 8_000;

// Faits du catalogue pour les pièces d'un e-mail (pièce supprimée ou illisible : nom et variante seulement).
export async function piecesFacts(items: { productId: string; name: string; variantLabel: string }[]): Promise<PieceFacts[]> {
  const unique = items.slice(0, 6);
  if (!unique.length) return [];
  const snaps = await adminDb().getAll(...unique.map((i) => adminDb().collection(COLLECTIONS.produits).doc(i.productId)));
  return unique.map((item, n) => {
    const p = produit.safeParse(snaps[n]?.data());
    return {
      nom: item.name, variante: item.variantLabel,
      accroche: p.success ? p.data.accroche : '', matieres: p.success ? p.data.materials : [], usages: p.success ? p.data.usages : [],
    };
  });
}

export async function personalParagraph(kind: EmailKind, pieces: PieceFacts[]): Promise<string | null> {
  if (!aiEnabled() || !pieces.length) return null;
  try {
    if (!(await takeQuota('site', 'e-mail', EMAIL_AI_PER_HOUR))) return null;
    const res = await fetch(endpoint('/v1/chat/completions'), {
      method: 'POST',
      headers: { authorization: `Bearer ${process.env.MISTRAL_API_KEY!.trim()}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: process.env.MISTRAL_MODEL?.trim() || 'mistral-small-latest',
        temperature: 0.4,
        max_tokens: MAX_TOKENS.paragraphe,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: personalPrompt(kind) }, { role: 'user', content: personalFacts(pieces) }],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return parsePersonal(body.choices?.[0]?.message?.content ?? '', pieces);
  } catch {
    console.error('e-mail : paragraphe personnalisé indisponible, texte fixe seul');
    return null;
  }
}
