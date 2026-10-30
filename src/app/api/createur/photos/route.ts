// Envoi d'une photo produit (espace créatrice). Route dédiée plutôt qu'une Server Action : la limite de corps
// des Server Actions reste à 1 Mo pour tout le site (formulaires publics compris), seule cette route accepte
// une photo réduite (4 Mo au plus). Même origine exigée, droit admin relu, type réel et taille revérifiés.
import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/server/auth/session';
import { PHOTO_MAX_BYTES, productId } from '@/server/createur/logic';
import { addPhoto } from '@/server/createur/products';

const MAX_BODY = PHOTO_MAX_BYTES + 64 * 1024; // photo + champs du formulaire

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
  const id = productId.safeParse(form.get('productId'));
  const file = form.get('photo');
  if (!id.success || !(file instanceof File) || file.size > PHOTO_MAX_BYTES) return NextResponse.json({ status: 'invalide' }, { status: 400 });
  try {
    const status = await addPhoto(admin.uid, id.data, new Uint8Array(await file.arrayBuffer()));
    return NextResponse.json({ status }, { status: status === 'ok' ? 200 : 400 });
  } catch {
    console.error('espace créatrice : envoi de photo impossible');
    return NextResponse.json({ status: 'erreur' }, { status: 500 });
  }
}
