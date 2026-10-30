// Règles de l'espace créatrice, pures (testées sans base) : saisie d'une fiche, variantes, liste de contrôle
// avant publication, slug et SKU. Montants en centimes. Aucune de ces fonctions ne lit ni n'écrit en base.
import { z } from 'zod';
import { produit, variante, type Categorie, type Produit, type Variante } from '../db/schema';

export const PHOTO_MAX_BYTES = 4 * 1024 * 1024; // après réduction dans le navigateur (limite Vercel : 4,5 Mo)
export const PHOTOS_MAX = 12;
export const VARIANTS_MAX = 40;

const text = (max: number) => z.string().trim().max(max);
const list = (maxItem: number, maxLen: number) => z.array(text(maxLen).min(1)).max(maxItem);
export const productId = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);
const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80);

// Saisie d'une fiche (étapes 2, 3 et 5). Brouillon : champs vides permis ; la liste de contrôle décide de la publication.
export const productFields = z.strictObject({
  name: text(120).min(1),
  slug: slugSchema.optional(), // modifiable tant que la pièce n'a jamais été publiée
  categoryId: slugSchema.nullable(),
  subCategory: slugSchema.nullable(),
  priceCents: z.number().int().min(0).max(1_000_000),
  accroche: text(200),
  histoire: text(800),
  description: text(4000),
  materials: list(10, 80),
  entretien: text(400),
  details: list(20, 160),
  faq: z.array(z.strictObject({ question: text(200).min(1), reponse: text(800).min(1) })).max(10),
  limitedEditionSize: z.number().int().positive().max(10_000).nullable(),
  giftWrap: z.boolean(),
  tags: list(20, 40),
  usages: list(20, 40),
});
export type ProductFields = z.infer<typeof productFields>;

// Variantes (étape 4) : stock attendu = valeur lue à l'ouverture de la fiche. Si une vente a eu lieu entre-temps,
// l'enregistrement est refusé pour cette variante plutôt que d'écraser le décompte du webhook.
export const variantRow = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]{1,60}$/).optional(),
  color: text(40),
  size: text(40),
  stock: z.number().int().min(0).max(9999),
  expectedStock: z.number().int().min(0).nullable(), // null : variante nouvelle
  dimensions: text(80),
  priceCents: z.number().int().min(1).max(1_000_000).nullable(),
  active: z.boolean(),
});
export const variantsInput = z.strictObject({ productId, rows: z.array(variantRow).min(1).max(VARIANTS_MAX) });
export type VariantRow = z.infer<typeof variantRow>;

// « Coffret Lune & Étoile » → « coffret-lune-etoile ».
export function slugify(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/, '') || 'piece';
}

// Identifiant de variante lisible et stable : « ecru-0-3-mois », « unique ».
export const variantIdFor = (color: string, size: string) =>
  (color.trim() || size.trim() ? slugify(`${color} ${size}`).slice(0, 60) : 'unique');

// SKU : préfixe du slug + coloris + taille, en capitales (« COFFRET-LUNE-ECRU-0-3M »).
export function skuFor(slug: string, color: string, size: string): string {
  const part = (s: string) => slugify(s).toUpperCase().slice(0, 12);
  return [slugify(slug).toUpperCase().split('-').slice(0, 2).join('-'), color && part(color), size && part(size)]
    .filter(Boolean).join('-').slice(0, 40);
}

// Grille coloris × tailles : une ligne par case ; sans coloris ni taille, une variante « Unique ».
export function gridRows(colors: string[], sizes: string[]): Pick<VariantRow, 'color' | 'size'>[] {
  const cs = colors.length ? colors : [''];
  const ss = sizes.length ? sizes : [''];
  return cs.flatMap((color) => ss.map((size) => ({ color, size })));
}

export const inStockOf = (variants: Pick<Variante, 'active' | 'stock'>[]) => variants.some((v) => v.active && v.stock > 0);

export type ChecklistItem = { key: string; label: string; ok: boolean };

// Liste de contrôle avant « Mettre en ligne » (BACKOFFICE.md §4). Rejouée côté serveur à la publication.
export function checklist(p: Partial<Produit> & { aiDraft?: Produit['aiDraft'] }, variants: Variante[], categories: { slug: string; data: Categorie }[]): ChecklistItem[] {
  const images = p.images ?? [];
  const category = categories.find((c) => c.slug === p.categoryId);
  return [
    { key: 'photos', label: 'Au moins une photo', ok: images.length > 0 },
    { key: 'alt', label: 'Un texte alternatif pour chaque photo', ok: images.length > 0 && images.every((i) => i.alt.trim().length > 0) },
    { key: 'prix', label: 'Un prix', ok: (p.priceCents ?? 0) >= 1 },
    { key: 'categorie', label: 'Un univers et une famille', ok: !!category && !!category.data.subs.find((s) => s.slug === p.subCategory) },
    { key: 'stock', label: 'Au moins une variante active en stock', ok: inStockOf(variants) },
    { key: 'accroche', label: 'Une accroche', ok: !!p.accroche?.trim() },
    { key: 'description', label: 'Une description', ok: !!p.description?.trim() },
    { key: 'ia', label: 'Le brouillon IA relu', ok: !p.aiDraft?.generatedAt || p.aiDraft.reviewed },
  ];
}

export const canPublish = (items: ChecklistItem[]) => items.every((i) => i.ok);

// Document complet et conforme au schéma public (sinon il ne s'afficherait pas) : dernier contrôle avant publication.
export const publishable = (data: unknown) => produit.safeParse(data).success;
export const validVariant = (data: unknown) => variante.safeParse(data).success;

// Photo envoyée : type réel lu dans les premiers octets (jamais le nom ni le type annoncé par le navigateur).
export function imageType(bytes: Uint8Array): 'jpg' | 'png' | 'webp' | null {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg';
  if (bytes.length > 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b)) return 'png';
  if (bytes.length > 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return 'webp';
  return null;
}

export const photosInput = z.strictObject({
  productId,
  images: z.array(z.strictObject({ path: z.string().max(300), alt: text(200) })).max(PHOTOS_MAX),
});
