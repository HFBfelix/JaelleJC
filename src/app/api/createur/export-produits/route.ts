// Atelier, onglet Produits : « Exporter (Excel) ». Tous les produits, leur statut et leur stock (une ligne par
// variante), en CSV ouvert par Excel. Droit admin relu ; jamais mis en cache.
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/server/auth/session';
import { productsCsv } from '@/server/catalogue/service';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ status: 'connexion' }, { status: 401 });
  try {
    const csv = await productsCsv();
    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(csv, {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="produits-jaellejc-${date}.csv"`,
        'cache-control': 'no-store',
      },
    });
  } catch {
    console.error('atelier : export des produits impossible');
    return NextResponse.json({ status: 'erreur' }, { status: 500 });
  }
}
