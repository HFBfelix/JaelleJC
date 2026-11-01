// Atelier, onglet Produits : « Exporter (Excel) ». Tous les produits, leur statut et leur stock (une ligne par
// variante). Droit admin relu ; jamais mis en cache.
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/server/auth/session';
import { productsWorkbook } from '@/server/catalogue/service';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ status: 'connexion' }, { status: 401 });
  try {
    const file = await productsWorkbook();
    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(new Uint8Array(file), {
      headers: {
        'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'content-disposition': `attachment; filename="produits-jaellejc-${date}.xlsx"`,
        'cache-control': 'no-store',
      },
    });
  } catch {
    console.error('atelier : export Excel impossible');
    return NextResponse.json({ status: 'erreur' }, { status: 500 });
  }
}
