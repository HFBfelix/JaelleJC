// IA de l'espace créatrice (BACKOFFICE.md §5), côté serveur, déclenchée par un clic :
// - analyse d'une pièce : texte libre de la créatrice + photos → propositions pour toute la fiche (analysis.ts) ;
// - dictée : enregistrement du micro → texte, ajouté au champ libre.
// Rien n'est écrit dans la fiche à partir des réponses : elles préremplissent le formulaire, la créatrice vérifie
// puis enregistre. Seuls le texte libre (collection serveur `produitsNotes`) et la trace du brouillon IA sont gardés.
// Fournisseur : Mistral (données traitées en Europe ; clé MISTRAL_API_KEY, environnement serveur), seule IA du site
// depuis le 2026-10-31 (décision de Jaelle). Un faux serveur (MISTRAL_API_HOST) sert aux parcours locaux, accepté
// seulement avec les émulateurs.
import 'server-only';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { COLLECTIONS } from '../db/schema';
import { adminDb } from '../firebase/admin';
import { ANALYSIS_PHOTOS_MAX, analysisPrompt, parseAnalysis, type Analysis } from './analysis';
import { audit, listCategoriesAdmin, loadProductAdmin } from './products';

export const AI_CALLS_PER_HOUR = 10;
export const DICTATIONS_PER_HOUR = 30;
const env = (name: string) => process.env[name]?.trim() || null;

export const aiEnabled = () => !!env('MISTRAL_API_KEY');

// Quota par heure et par administratrice, tenu en transaction (collection serveur, règles : tout refusé).
export async function takeQuota(uid: string, kind: 'analyse' | 'dictee' | 'catalogue', limit: number): Promise<boolean> {
  const hour = new Date().toISOString().slice(0, 13).replace(/[-T]/g, '');
  const ref = adminDb().collection(COLLECTIONS.aiQuota).doc(kind === 'analyse' ? `${uid}_${hour}` : `${uid}_${kind}_${hour}`);
  return adminDb().runTransaction(async (tx) => {
    const count = ((await tx.get(ref)).get('count') as number | undefined) ?? 0;
    if (count >= limit) return false;
    tx.set(ref, { count: count + 1, expiresAt: Timestamp.fromMillis(Date.now() + 2 * 3600_000) });
    return true;
  });
}

export function endpoint(path: string) {
  const fake = env('MISTRAL_API_HOST');
  if (fake) {
    if (env('VERCEL_ENV') || !env('FIRESTORE_EMULATOR_HOST')) throw new Error('MISTRAL_API_HOST réservé aux tests locaux.');
    return `http://${fake}${path}`;
  }
  return `https://api.mistral.ai${path}`;
}

export type AnalyzeResult = { status: 'ok'; analysis: Analysis } | { status: 'introuvable' | 'quota' | 'vide' | 'indisponible' };

export async function analyzeProduct(uid: string, id: string, notes: string): Promise<AnalyzeResult> {
  const key = env('MISTRAL_API_KEY');
  if (!key) return { status: 'indisponible' };
  const loaded = await loadProductAdmin(id);
  if (!loaded) return { status: 'introuvable' };
  const photos = loaded.product.images.slice(0, ANALYSIS_PHOTOS_MAX);
  if (!notes.trim() && !photos.length) return { status: 'vide' };

  // Le texte libre est gardé (privé, jamais lu par le site public) pour compléter et relancer plus tard.
  await adminDb().collection(COLLECTIONS.produitsNotes).doc(id).set({ notes, updatedAt: FieldValue.serverTimestamp(), updatedBy: uid });
  if (!(await takeQuota(uid, 'analyse', AI_CALLS_PER_HOUR))) return { status: 'quota' };

  const categories = (await listCategoriesAdmin()).map((c) => ({ slug: c.slug, name: c.data.name, subs: c.data.subs }));
  const content = [
    { type: 'text', text: `NOTES : ${notes.trim() || '(aucune note : seulement les photos)'}\nNOMBRE DE PHOTOS : ${photos.length}` },
    ...photos.map((p) => ({ type: 'image_url', image_url: p.url })),
  ];
  let res: Response;
  try {
    res = await fetch(endpoint('/v1/chat/completions'), {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: env('MISTRAL_MODEL') ?? 'mistral-small-latest',
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: analysisPrompt(categories) }, { role: 'user', content }],
      }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    return { status: 'indisponible' };
  }
  if (!res.ok) return { status: 'indisponible' };
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const analysis = parseAnalysis(body.choices?.[0]?.message?.content ?? '', categories, photos.length);
  if (!analysis) return { status: 'indisponible' };

  // La fiche retient seulement qu'un brouillon IA existe et n'est pas encore relu (bloque la publication).
  await adminDb().collection(COLLECTIONS.produits).doc(id).update({
    aiDraft: { generatedAt: FieldValue.serverTimestamp(), reviewed: false }, updatedBy: uid,
  });
  await audit(uid, 'produit.analyse-ia', id);
  return { status: 'ok', analysis };
}

export type DictationResult = { status: 'ok'; text: string } | { status: 'quota' | 'indisponible' };

export async function transcribe(uid: string, audio: Blob, filename: string): Promise<DictationResult> {
  const key = env('MISTRAL_API_KEY');
  if (!key) return { status: 'indisponible' };
  if (!(await takeQuota(uid, 'dictee', DICTATIONS_PER_HOUR))) return { status: 'quota' };
  const form = new FormData();
  form.set('model', env('MISTRAL_TRANSCRIPTION_MODEL') ?? 'voxtral-mini-latest');
  form.set('language', 'fr');
  form.set('file', audio, filename);
  try {
    const res = await fetch(endpoint('/v1/audio/transcriptions'), {
      method: 'POST', headers: { authorization: `Bearer ${key}` }, body: form, signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) return { status: 'indisponible' };
    const text = ((await res.json()) as { text?: unknown }).text;
    return typeof text === 'string' ? { status: 'ok', text: text.trim().slice(0, 6000) } : { status: 'indisponible' };
  } catch {
    return { status: 'indisponible' };
  }
}
