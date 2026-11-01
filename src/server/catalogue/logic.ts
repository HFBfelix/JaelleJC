// Export Excel et catalogue PDF de l'Atelier (décision de Jaelle, 2026-11-01), règles pures testées sans base :
// lignes du tableur, pièces du catalogue (variantes en stock seulement), consigne et lecture des textes de l'IA,
// entrée du bouton « Générer le PDF ». Les textes de l'IA ne s'appuient que sur les faits de la fiche et sont relus.
import { z } from 'zod';
import { sizeRank } from '../catalog/sizes';
import type { AdminProduct, AdminVariant } from '../createur/products';

export const CATALOGUE_TEXT_MAX = 320; // texte d'une pièce : tient sous la photo, sur une page A4
export const CATALOGUE_INTRO_MAX = 700;
export const CATALOGUE_PIECES_MAX = 60;
export const CATALOGUE_PHOTOS = 3; // photos par pièce dans le PDF (une seule ne suffit pas à montrer la pièce)
export const STATUS_LABELS = { draft: 'Brouillon', published: 'En ligne', archived: 'Archivé' } as const;

const productId = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);
const clean = (max: number) => z.string().max(max * 2).transform((s) => s.replace(/\s+/g, ' ').trim().slice(0, max));

// --- Export Excel : une ligne par variante (pièce sans variante active : une ligne quand même) ---
export type ExportRow = {
  name: string; sku: string; category: string; family: string; status: string; priceEuros: number;
  color: string; size: string; variantSku: string; stock: number; active: string; totalStock: number;
};

export function exportRows(items: { product: AdminProduct; variants: AdminVariant[]; category: string; family: string }[]): ExportRow[] {
  return items
    .sort((a, b) => a.product.name.localeCompare(b.product.name, 'fr'))
    .flatMap(({ product: p, variants, category, family }) => {
      const totalStock = variants.filter((v) => v.active).reduce((n, v) => n + v.stock, 0);
      const base = {
        name: p.name, sku: p.sku ?? '', category, family, status: STATUS_LABELS[p.status], priceEuros: p.priceCents / 100, totalStock,
      };
      if (!variants.length) return [{ ...base, color: '', size: '', variantSku: '', stock: 0, active: '', totalStock }];
      return variants.map((v) => ({
        ...base, color: v.color ?? '', size: v.size ?? '', variantSku: v.sku, stock: v.stock, active: v.active ? 'Oui' : 'Non',
        priceEuros: (v.priceCents ?? p.priceCents) / 100,
      }));
    });
}

// --- Pièces du catalogue ---
export type CataloguePiece = {
  id: string; name: string; sku: string; status: AdminProduct['status']; category: string; priceCents: number; cover: string | null; photos: string[];
  accroche: string; description: string; materials: string[]; details: string[]; totalStock: number;
  colors: { name: string; hex: string | null }[]; sizes: string[];
};

export function toPiece(p: AdminProduct, variants: AdminVariant[], category: string): CataloguePiece {
  const inStock = variants.filter((v) => v.active && v.stock > 0);
  const colors = [...new Map(inStock.filter((v) => v.color).map((v) => [v.color!, v.colorHex ?? null])).entries()]
    .map(([name, hex]) => ({ name, hex: hex ?? inStock.find((v) => v.color === name && v.colorHex)?.colorHex ?? null }));
  const sizes = [...new Set(inStock.map((v) => v.size ?? '').filter(Boolean))].sort((a, b) => sizeRank(a) - sizeRank(b));
  return {
    id: p.id, name: p.name, sku: p.sku ?? '', status: p.status, category, priceCents: p.priceCents, cover: p.images[0]?.url ?? null,
    photos: p.images.slice(0, CATALOGUE_PHOTOS).map((i) => i.url).filter(Boolean),
    accroche: p.accroche, description: p.description, materials: p.materials, details: p.details,
    totalStock: inStock.reduce((n, v) => n + v.stock, 0), colors, sizes,
  };
}

// Texte par défaut d'une pièce (sans IA) : l'accroche, sinon le début de la description.
export const defaultText = (p: Pick<CataloguePiece, 'accroche' | 'description'>) =>
  (p.accroche || p.description).replace(/\s+/g, ' ').trim().slice(0, CATALOGUE_TEXT_MAX);

// --- Textes rédigés par l'IA ---
export function cataloguePrompt(): string {
  return `Tu rédiges les textes d'un catalogue imprimé de Jaelle & JC, atelier de couture en Île-de-France (cadeaux de
naissance cousus main, séries limitées). Le catalogue suit la charte de la marque : sobre, beaucoup de blanc, phrases courtes.

RÈGLES ABSOLUES
- N'utilise que les FAITS fournis pour chaque pièce. N'ajoute jamais une matière, une dimension, un lieu de fabrication,
  une vertu écologique ou une propriété absents des faits. Ne cite ni prix ni stock.
- Vouvoiement, phrases courtes et concrètes, aucun point d'exclamation, pas d'adjectifs de luxe en série.
- Texte d'une pièce : 1 à 3 phrases, ${CATALOGUE_TEXT_MAX} caractères au plus.
- Introduction : 2 à 4 phrases sur l'atelier et la sélection, ${CATALOGUE_INTRO_MAX} caractères au plus, sans fait inventé.

Réponds uniquement en JSON : {"introduction": "", "pieces": [{"id": "identifiant reçu", "texte": ""}]}`;
}

export const catalogueFacts = (pieces: CataloguePiece[]) => JSON.stringify(pieces.map((p) => ({
  id: p.id, nom: p.name, univers: p.category, accroche: p.accroche, description: p.description, matieres: p.materials,
  details: p.details, couleurs: p.colors.map((c) => c.name), tailles: p.sizes,
})));

const reply = z.object({
  introduction: z.string().optional().catch(undefined),
  pieces: z.array(z.object({ id: z.string(), texte: z.string() }).catch({ id: '', texte: '' })).optional().catch(undefined),
});

// Réponse de l'IA ramenée aux limites ; seules les pièces demandées sont gardées.
export function parseCatalogueTexts(raw: string, ids: string[]): { intro: string; texts: Record<string, string> } | null {
  let json: unknown;
  try { json = JSON.parse(raw); } catch { return null; }
  const parsed = reply.safeParse(json);
  if (!parsed.success) return null;
  const texts: Record<string, string> = {};
  for (const p of parsed.data.pieces ?? []) {
    if (ids.includes(p.id) && p.texte.trim()) texts[p.id] = clean(CATALOGUE_TEXT_MAX).parse(p.texte.slice(0, CATALOGUE_TEXT_MAX * 2));
  }
  return { intro: clean(CATALOGUE_INTRO_MAX).parse((parsed.data.introduction ?? '').slice(0, CATALOGUE_INTRO_MAX * 2)), texts };
}

// --- Bouton « Générer le PDF » : pièces cochées, prix ou non, textes relus ---
export const generateInput = z.strictObject({
  ids: z.array(productId).min(1).max(CATALOGUE_PIECES_MAX),
  showPrices: z.boolean(),
  intro: z.string().max(CATALOGUE_INTRO_MAX),
  texts: z.record(productId, z.string().max(CATALOGUE_TEXT_MAX)),
});
export type GenerateInput = z.infer<typeof generateInput>;

export const textsInput = z.strictObject({ ids: z.array(productId).min(1).max(CATALOGUE_PIECES_MAX) });
