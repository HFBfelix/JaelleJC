// Export Excel et catalogue de l'Atelier (Admin SDK). Appelé seulement par des routes et actions qui ont vérifié
// le droit admin. Lecture seule : rien n'est écrit en base, hormis le quota d'appels à l'IA.
import 'server-only';
import ExcelJS from 'exceljs';
import { COLLECTIONS } from '../db/schema';
import { endpoint, takeQuota } from '../createur/ai';
import { listCategoriesAdmin, toAdminProduct, toAdminVariants, type AdminProduct, type AdminVariant } from '../createur/products';
import { adminDb } from '../firebase/admin';
import { cataloguePrompt, catalogueFacts, exportRows, parseCatalogueTexts, toPiece, type CataloguePiece } from './logic';

export const CATALOGUE_AI_PER_HOUR = 10;
const env = (name: string) => process.env[name]?.trim() || null;

type Item = { product: AdminProduct; variants: AdminVariant[]; category: string; family: string };

async function loadItems(): Promise<Item[]> {
  const [snap, categories] = await Promise.all([adminDb().collection(COLLECTIONS.produits).get(), listCategoriesAdmin()]);
  return Promise.all(snap.docs.map(async (d) => {
    const product = toAdminProduct(d.id, d.data());
    const variants = toAdminVariants((await d.ref.collection(COLLECTIONS.variantes).get()).docs);
    const cat = categories.find((c) => c.slug === product.categoryId);
    return { product, variants, category: cat?.data.name ?? '', family: cat?.data.subs.find((s) => s.slug === product.subCategory)?.name ?? '' };
  }));
}

// Pièces proposées sur la page du catalogue : toutes sauf les archivées, en stock d'abord.
export async function listCataloguePieces(): Promise<CataloguePiece[]> {
  return (await loadItems())
    .filter((i) => i.product.status !== 'archived')
    .map((i) => toPiece(i.product, i.variants, i.category))
    .sort((a, b) => Number(b.totalStock > 0) - Number(a.totalStock > 0) || a.name.localeCompare(b.name, 'fr'));
}

// Pièces retenues pour le PDF : relues en base, et seulement celles qui ont encore du stock.
export async function piecesFor(ids: string[]): Promise<CataloguePiece[]> {
  const all = await listCataloguePieces();
  return ids.flatMap((id) => all.filter((p) => p.id === id && p.totalStock > 0));
}

// Tableur de tous les produits (états et stocks), une ligne par variante.
export async function productsWorkbook(): Promise<Buffer> {
  const rows = exportRows(await loadItems());
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Jaelle & JC';
  const ws = wb.addWorksheet('Produits', { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = [
    { header: 'Nom', key: 'name', width: 34 }, { header: 'Référence (SKU)', key: 'sku', width: 18 },
    { header: 'Univers', key: 'category', width: 16 }, { header: 'Famille', key: 'family', width: 16 },
    { header: 'Statut', key: 'status', width: 12 }, { header: 'Prix (€)', key: 'priceEuros', width: 10, style: { numFmt: '#,##0.00' } },
    { header: 'Couleur', key: 'color', width: 14 }, { header: 'Taille', key: 'size', width: 10 },
    { header: 'SKU variante', key: 'variantSku', width: 24 }, { header: 'Stock', key: 'stock', width: 8 },
    { header: 'Variante active', key: 'active', width: 14 }, { header: 'Stock total de la pièce', key: 'totalStock', width: 20 },
  ];
  // Texte saisi : jamais interprété comme une formule par le tableur.
  const safe = (v: unknown) => (typeof v === 'string' && /^[=+\-@\t\r]/.test(v) ? `'${v}` : v);
  for (const r of rows) ws.addRow(Object.fromEntries(Object.entries(r).map(([k, v]) => [k, safe(v)])));
  ws.getRow(1).font = { bold: true };
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export type TextsResult = { status: 'ok'; intro: string; texts: Record<string, string> } | { status: 'quota' | 'indisponible' | 'vide' };

// Textes du catalogue proposés par l'IA (Mistral), à relire sur la page avant de générer le PDF.
export async function catalogueTexts(uid: string, ids: string[]): Promise<TextsResult> {
  const key = env('MISTRAL_API_KEY');
  if (!key) return { status: 'indisponible' };
  const pieces = await piecesFor(ids);
  if (!pieces.length) return { status: 'vide' };
  if (!(await takeQuota(uid, 'catalogue', CATALOGUE_AI_PER_HOUR))) return { status: 'quota' };
  try {
    const res = await fetch(endpoint('/v1/chat/completions'), {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: env('MISTRAL_MODEL') ?? 'mistral-small-latest',
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: cataloguePrompt() }, { role: 'user', content: `FAITS : ${catalogueFacts(pieces)}` }],
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) return { status: 'indisponible' };
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const parsed = parseCatalogueTexts(body.choices?.[0]?.message?.content ?? '', pieces.map((p) => p.id));
    return parsed ? { status: 'ok', ...parsed } : { status: 'indisponible' };
  } catch {
    return { status: 'indisponible' };
  }
}
