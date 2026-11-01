// Analyse d'une pièce par l'IA (espace créatrice) : à partir du texte libre de la créatrice (tapé ou dicté) et de
// ses photos, l'IA propose de quoi préremplir toute la fiche. Fonctions pures (testées sans base ni réseau) :
// consigne, lecture de la réponse, mise aux limites du schéma. Rien n'est écrit en base à partir de la réponse :
// elle préremplit le formulaire, la créatrice vérifie puis enregistre.
import { z } from 'zod';
import { SIZE_GRIDS, normalizeSize } from '../catalog/sizes';

export const NOTES_MAX = 6000;
export const ANALYSIS_PHOTOS_MAX = 4;

export type AnalysisCategory = { slug: string; name: string; subs: { slug: string; name: string }[] };

export type AnalysisVariant = { color: string; size: string; stock: number | null; priceCents: number | null };
export type Analysis = {
  name: string;
  categoryId: string | null;
  subCategory: string | null;
  priceCents: number | null;
  materials: string[];
  details: string[];
  entretien: string;
  limitedEditionSize: number | null;
  giftWrap: boolean | null;
  usages: string[];
  tags: string[];
  accroche: string;
  histoire: string;
  description: string;
  faq: { question: string; reponse: string }[];
  stock: number | null; // pièce sans variantes
  variants: AnalysisVariant[];
  alts: string[];
  missing: string[];
};

export function analysisPrompt(categories: AnalysisCategory[]): string {
  const univers = categories.map((c) => ({ slug: c.slug, nom: c.name, familles: c.subs.map((s) => ({ slug: s.slug, nom: s.name })) }));
  return `Tu prépares la fiche produit d'une pièce de Jaelle & JC, atelier de couture en Île-de-France (cadeaux de naissance
cousus main, séries limitées), à partir des NOTES de la créatrice (tapées ou dictées, parfois désordonnées) et de ses photos.

RÈGLES ABSOLUES
- N'utilise que ce que disent les NOTES. N'ajoute jamais une matière, un label, une dimension, un lieu de fabrication,
  une vertu écologique ou une propriété (lavable, hypoallergénique…) absents des NOTES.
- Les photos servent seulement à ce qui se voit : coloris et texte alternatif. Jamais à deviner une matière ou une taille.
- Prix et stock : seulement s'ils sont écrits clairement dans les NOTES ; sinon null. Ne devine jamais.
- Univers et famille : choisis uniquement parmi la liste fournie (slugs exacts), sinon null.
- Ce qui manque ou reste incertain va dans "manquants" (phrases courtes : « Prix non indiqué », « Entretien non précisé »).

STYLE DES TEXTES : vouvoiement, phrases courtes et concrètes, aucun point d'exclamation, pas d'adjectifs de luxe en
série ; on montre la matière et les gestes. Nom en français, une seule capitale en début (« Cabas imprimé bleu »).

UNIVERS DISPONIBLES : ${JSON.stringify(univers)}

TAILLES : uniquement celles des grilles suivantes, écrites exactement ainsi (sinon "" et une ligne dans "manquants") :
${Object.values(SIZE_GRIDS).map((g) => `${g.label} : ${g.sizes.join(', ')}`).join(' ; ')}.

Réponds uniquement en JSON, avec exactement ces clés :
{"nom": "", "univers": "slug ou null", "famille": "slug ou null", "prixEuros": nombre ou null,
 "matieres": ["une matière par élément"], "details": ["une dimension ou un détail par élément (« Lange : 70 × 70 cm »)"],
 "entretien": "", "serieLimitee": nombre ou null, "emballageCadeau": true, false ou null,
 "usages": ["occasions d'achat courtes : naissance, baptême, vacances…"], "motsCles": [""],
 "accroche": "une phrase", "histoire": "2 à 3 phrases", "description": "3 à 6 phrases",
 "faq": [{"question": "", "reponse": ""}] (seulement si les NOTES y répondent, sinon []),
 "stock": nombre ou null (quantité disponible s'il n'y a qu'une seule version),
 "variantes": [{"coloris": "", "taille": "", "stock": nombre ou null, "prixEuros": nombre ou null}] ([] si une seule version),
 "textesAlternatifs": ["ce que montre chaque photo, dans l'ordre"], "manquants": [""]}`;
}

// Réponse brute de l'IA : tout est facultatif et toléré (types faux ignorés), puis ramené aux limites du schéma.
const loose = <T extends z.ZodTypeAny>(schema: T) => schema.optional().catch(undefined);
const raw = z.object({
  nom: loose(z.string()), univers: loose(z.string().nullable()), famille: loose(z.string().nullable()),
  prixEuros: loose(z.number().nullable()), matieres: loose(z.array(z.unknown())), details: loose(z.array(z.unknown())),
  entretien: loose(z.string()), serieLimitee: loose(z.number().nullable()), emballageCadeau: loose(z.boolean().nullable()),
  usages: loose(z.array(z.unknown())), motsCles: loose(z.array(z.unknown())), accroche: loose(z.string()),
  histoire: loose(z.string()), description: loose(z.string()), faq: loose(z.array(z.unknown())), stock: loose(z.number().nullable()),
  variantes: loose(z.array(z.unknown())), textesAlternatifs: loose(z.array(z.unknown())), manquants: loose(z.array(z.unknown())),
});

// Coupe à la limite sans couper un mot.
export function clip(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  const s = value.replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max + 1).replace(/\s+\S*$/, '').trim();
  return (cut || s.slice(0, max)).trim();
}
// Les textes longs gardent leurs paragraphes.
function clipText(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  const s = value.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  return s.length <= max ? s : clip(s, max);
}
const strings = (value: unknown[] | undefined, maxItems: number, maxLen: number) =>
  [...new Set((value ?? []).map((v) => clip(v, maxLen)).filter(Boolean))].slice(0, maxItems);
const cents = (euros: number | null | undefined) =>
  typeof euros === 'number' && Number.isFinite(euros) && euros > 0 && euros <= 10_000 ? Math.round(euros * 100) : null;
const wholeNumber = (v: unknown, max: number) => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max ? v : null);

export function parseAnalysis(content: string, categories: AnalysisCategory[], photoCount: number): Analysis | null {
  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch {
    return null;
  }
  const parsed = raw.safeParse(json);
  if (!parsed.success) return null;
  const r = parsed.data;
  const category = categories.find((c) => c.slug === r.univers);
  const sub = category?.subs.find((s) => s.slug === r.famille);

  const seen = new Set<string>();
  const offGrid: string[] = []; // tailles hors grille : écartées, signalées à la créatrice
  const variants = (r.variantes ?? []).flatMap((v): AnalysisVariant[] => {
    if (!v || typeof v !== 'object') return [];
    const o = v as Record<string, unknown>;
    const color = clip(o.coloris, 40);
    const rawSize = clip(o.taille, 40);
    const size = rawSize ? normalizeSize(rawSize) : '';
    if (size === null) { offGrid.push(rawSize); return []; }
    const key = `${color.toLowerCase()}|${size.toLowerCase()}`;
    if ((!color && !size) || seen.has(key)) return [];
    seen.add(key);
    return [{ color, size, stock: wholeNumber(o.stock, 9999), priceCents: cents(typeof o.prixEuros === 'number' ? o.prixEuros : null) }];
  }).slice(0, 40);

  const faq = (r.faq ?? []).flatMap((f) => {
    if (!f || typeof f !== 'object') return [];
    const o = f as Record<string, unknown>;
    const question = clip(o.question, 200);
    const reponse = clipText(o.reponse, 800);
    return question && reponse ? [{ question, reponse }] : [];
  }).slice(0, 5);

  const limited = wholeNumber(r.serieLimitee, 10_000);
  return {
    name: clip(r.nom, 120),
    categoryId: category?.slug ?? null,
    subCategory: sub?.slug ?? null,
    priceCents: cents(r.prixEuros),
    materials: strings(r.matieres, 10, 80),
    details: strings(r.details, 20, 160),
    entretien: clipText(r.entretien, 400),
    limitedEditionSize: limited && limited > 0 ? limited : null,
    giftWrap: r.emballageCadeau ?? null,
    usages: strings(r.usages, 20, 40),
    tags: strings(r.motsCles, 20, 40),
    accroche: clip(r.accroche, 200),
    histoire: clipText(r.histoire, 800),
    description: clipText(r.description, 4000),
    faq,
    stock: variants.length ? null : wholeNumber(r.stock, 9999),
    variants,
    alts: (r.textesAlternatifs ?? []).slice(0, photoCount).map((a) => clip(a, 200)),
    missing: [...strings(r.manquants, 12, 160),
      ...[...new Set(offGrid)].slice(0, 4).map((s) => clip(`Taille « ${s} » hors des grilles : à choisir dans la grille`, 160))],
  };
}

// Variantes proposées par l'IA appliquées à la grille du formulaire (jamais en base : la créatrice enregistre).
// - variante existante (même coloris et taille) : stock et prix repris seulement s'ils sont donnés, réactivée ;
//   le stock attendu reste celui lu en base (une vente pendant la saisie est toujours détectée à l'enregistrement) ;
// - nouvelle variante : ajoutée, stock 0 si non donné ;
// - variante absente de la proposition : désactivée seulement si son stock est à 0 (jamais de stock perdu).
// Sans variantes proposées : le stock donné pour la pièce va à la variante unique.
export type GridRow = {
  key: string; id?: string; color: string; colorHex: string | null; size: string; stock: number; expectedStock: number | null;
  dimensions: string; priceCents: number | null; active: boolean;
};

// Teinte déjà choisie pour ce coloris (une teinte par coloris, toutes tailles confondues).
export const hexOf = (rows: Pick<GridRow, 'color' | 'colorHex'>[], color: string) =>
  rows.find((r) => r.color.trim().toLowerCase() === color.trim().toLowerCase() && r.colorHex)?.colorHex ?? null;

const variantKey = (color: string, size: string) => `${color.trim().toLowerCase()}|${size.trim().toLowerCase()}`;

export function mergeVariants(rows: GridRow[], analysis: Pick<Analysis, 'variants' | 'stock'>, newKey: (n: number) => string): GridRow[] {
  if (!analysis.variants.length) {
    if (analysis.stock === null) return rows;
    const active = rows.filter((r) => r.active);
    if (active.length !== 1) return rows;
    return rows.map((r) => (r === active[0] ? { ...r, stock: analysis.stock! } : r));
  }
  const proposed = new Map(analysis.variants.map((v) => [variantKey(v.color, v.size), v]));
  const next = rows.map((r) => {
    const v = proposed.get(variantKey(r.color, r.size));
    if (v) {
      proposed.delete(variantKey(r.color, r.size));
      return { ...r, active: true, stock: v.stock ?? r.stock, priceCents: v.priceCents ?? r.priceCents };
    }
    return r.stock === 0 ? { ...r, active: false } : r;
  });
  let n = 0;
  for (const v of proposed.values()) {
    next.push({ key: newKey(n++), color: v.color, colorHex: hexOf(rows, v.color), size: v.size, stock: v.stock ?? 0, expectedStock: null, dimensions: '', priceCents: v.priceCents, active: true });
  }
  return next;
}
