// Atelier : « Générer le PDF » du catalogue. Entrée validée (pièces cochées, prix ou non, textes relus) ; les pièces
// sont relues en base et seules celles encore en stock sont imprimées. Même origine exigée, droit admin relu.
import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/server/auth/session';
import { defaultText, generateInput } from '@/server/catalogue/logic';
import { catalogueBuffer } from '@/server/catalogue/pdf';
import { piecesFor } from '@/server/catalogue/service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  if (!origin || new URL(origin).host !== req.headers.get('host')) return NextResponse.json({ status: 'interdit' }, { status: 403 });
  if (!(await requireAdmin())) return NextResponse.json({ status: 'connexion' }, { status: 401 });
  const length = Number(req.headers.get('content-length'));
  if (!Number.isFinite(length) || length <= 0 || length > 256 * 1024) return NextResponse.json({ status: 'invalide' }, { status: 413 });
  const parsed = generateInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ status: 'invalide' }, { status: 400 });
  try {
    const pieces = await piecesFor(parsed.data.ids);
    if (!pieces.length) return NextResponse.json({ status: 'vide' }, { status: 400 });
    const pdf = await catalogueBuffer({
      pieces: pieces.map((p) => ({ ...p, text: parsed.data.texts[p.id] ?? defaultText(p) })),
      intro: parsed.data.intro, showPrices: parsed.data.showPrices, date: new Date(),
    });
    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `attachment; filename="catalogue-jaellejc-${date}.pdf"`,
        'cache-control': 'no-store',
      },
    });
  } catch {
    console.error('atelier : catalogue impossible');
    return NextResponse.json({ status: 'erreur' }, { status: 500 });
  }
}
