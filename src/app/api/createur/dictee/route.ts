// Dictée de l'espace créatrice : l'enregistrement du micro est transcrit en texte par Mistral (données en Europe),
// puis ajouté au champ libre de la fiche. Route dédiée (comme les photos) : la limite de corps des Server Actions
// reste à 1 Mo pour tout le site. Même origine exigée, droit admin relu, type réel et taille revérifiés.
// L'audio n'est jamais conservé.
import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/server/auth/session';
import { transcribe } from '@/server/createur/ai';
import { AUDIO_MAX_BYTES, audioType } from '@/server/createur/logic';

const MAX_BODY = AUDIO_MAX_BYTES + 16 * 1024;

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  if (!origin || new URL(origin).host !== req.headers.get('host')) return NextResponse.json({ status: 'interdit' }, { status: 403 });
  const length = Number(req.headers.get('content-length'));
  if (!Number.isFinite(length) || length <= 0 || length > MAX_BODY) return NextResponse.json({ status: 'taille' }, { status: 413 });
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ status: 'connexion' }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ status: 'invalide' }, { status: 400 });
  }
  const file = form.get('audio');
  if (!(file instanceof File) || file.size > AUDIO_MAX_BYTES) return NextResponse.json({ status: 'invalide' }, { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = audioType(bytes);
  if (!type) return NextResponse.json({ status: 'type' }, { status: 400 });
  try {
    const mime = { webm: 'audio/webm', mp4: 'audio/mp4', ogg: 'audio/ogg', wav: 'audio/wav' }[type];
    const result = await transcribe(admin.uid, new Blob([bytes], { type: mime }), `dictee.${type === 'mp4' ? 'm4a' : type}`);
    return NextResponse.json(result, { status: result.status === 'ok' ? 200 : result.status === 'quota' ? 429 : 503 });
  } catch {
    console.error('espace créatrice : dictée impossible'); // aucun contenu dans le journal
    return NextResponse.json({ status: 'erreur' }, { status: 500 });
  }
}
