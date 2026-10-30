// Brouillon IA d'une fiche (BACKOFFICE.md §5) : déclenché par un clic, côté serveur, à partir des seuls faits saisis.
// Rien n'est écrit dans la fiche : les propositions reviennent à l'écran, Jaelle choisit « Utiliser ».
// Fournisseur : OpenAI (clé OPENAI_API_KEY, environnement serveur) ; un faux serveur (OPENAI_API_HOST) sert aux
// parcours locaux, accepté seulement avec les émulateurs.
import 'server-only';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';
import { COLLECTIONS } from '../db/schema';
import { adminDb } from '../firebase/admin';
import { audit, listCategoriesAdmin, loadProductAdmin } from './products';

export const AI_CALLS_PER_HOUR = 10;
const env = (name: string) => process.env[name]?.trim() || null;

const proposals = z.object({
  accroches: z.array(z.string().trim().min(1).max(200)).min(1).max(2),
  histoires: z.array(z.string().trim().min(1).max(800)).min(1).max(2),
  descriptions: z.array(z.string().trim().min(1).max(4000)).min(1).max(2),
});
export type AiProposals = z.infer<typeof proposals>;

const SYSTEM = `Tu rédiges les textes d'une fiche produit pour Jaelle & JC, atelier de couture en Île-de-France
(cadeaux de naissance cousus main, séries limitées). Ton : vouvoiement, phrases courtes et concrètes, aucun point
d'exclamation, pas d'adjectifs de luxe en série ; on montre la matière et les gestes, on ne proclame pas.
INTERDIT : ajouter une matière, un label, une dimension, un lieu de fabrication, une vertu écologique ou une
propriété (lavable, hypoallergénique…) absents des FAITS. Si un fait manque, n'en parle pas.
Réponds uniquement en JSON : {"accroches": [2 textes d'une phrase], "histoires": [2 textes de 2 à 3 phrases],
"descriptions": [2 textes de 3 à 6 phrases]}.`;

// Quota par heure et par administratrice, tenu en transaction (collection serveur, règles : tout refusé).
async function takeQuota(uid: string): Promise<boolean> {
  const hour = new Date().toISOString().slice(0, 13).replace(/[-T]/g, '');
  const ref = adminDb().collection(COLLECTIONS.aiQuota).doc(`${uid}_${hour}`);
  return adminDb().runTransaction(async (tx) => {
    const count = ((await tx.get(ref)).get('count') as number | undefined) ?? 0;
    if (count >= AI_CALLS_PER_HOUR) return false;
    tx.set(ref, { count: count + 1, expiresAt: Timestamp.fromMillis(Date.now() + 2 * 3600_000) });
    return true;
  });
}

function endpoint() {
  const fake = env('OPENAI_API_HOST');
  if (fake) {
    if (env('VERCEL_ENV') || !env('FIRESTORE_EMULATOR_HOST')) throw new Error('OPENAI_API_HOST réservé aux tests locaux.');
    return `http://${fake}/v1/chat/completions`;
  }
  return 'https://api.openai.com/v1/chat/completions';
}

export type DraftResult = { status: 'ok'; proposals: AiProposals } | { status: 'introuvable' | 'quota' | 'faits' | 'indisponible' };

export async function draftTexts(uid: string, id: string): Promise<DraftResult> {
  const key = env('OPENAI_API_KEY');
  if (!key) return { status: 'indisponible' };
  const loaded = await loadProductAdmin(id);
  if (!loaded) return { status: 'introuvable' };
  const p = loaded.product;
  if (!p.name || (!p.materials.length && !p.details.length)) return { status: 'faits' }; // trop peu de faits : pas d'invention
  if (!(await takeQuota(uid))) return { status: 'quota' };

  const category = (await listCategoriesAdmin()).find((c) => c.slug === p.categoryId);
  const facts = {
    nom: p.name,
    univers: category?.data.name ?? null,
    famille: category?.data.subs.find((s) => s.slug === p.subCategory)?.name ?? null,
    matieres: p.materials,
    dimensions_et_details: p.details,
    entretien: p.entretien || null,
    serie_limitee: p.limitedEditionSize,
    cas_d_usage: p.usages,
  };
  const res = await fetch(endpoint(), {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: env('OPENAI_MODEL') ?? 'gpt-4o-mini',
      temperature: 0.6,
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: `FAITS : ${JSON.stringify(facts)}` }],
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) return { status: 'indisponible' };
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  let parsed: AiProposals;
  try {
    parsed = proposals.parse(JSON.parse(body.choices?.[0]?.message?.content ?? '{}'));
  } catch {
    return { status: 'indisponible' };
  }
  // La fiche retient seulement qu'un brouillon existe et n'est pas encore relu (bloque la publication).
  await adminDb().collection(COLLECTIONS.produits).doc(id).update({
    aiDraft: { generatedAt: FieldValue.serverTimestamp(), reviewed: false }, updatedBy: uid,
  });
  await audit(uid, 'produit.brouillon-ia', id);
  return { status: 'ok', proposals: parsed };
}
