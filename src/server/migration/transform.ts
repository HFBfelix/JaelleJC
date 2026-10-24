// Conversions ancien modèle → nouveau modèle (BACKOFFICE.md §2 et §6). Fonctions pures, rejouables :
// si un document a déjà été migré, la source est son champ `legacy` (valeurs d'origine conservées).
import { produit as produitSchema, variante as varianteSchema, categorie as categorieSchema } from '../db/schema.ts';
import { splitDescription, type DescriptionProposal } from './description.ts';
import { normalizeSpaces, slugify, uniqueSlug } from './text.ts';

export type Doc = { id: string; data: Record<string, unknown> };
export type Issue = { level: 'erreur' | 'alerte'; message: string };

export type ProductDecision = {
  status?: 'draft' | 'published' | 'archived';
  descriptionApproved?: boolean;
  // Corrections de Jaelle, prioritaires sur la proposition automatique.
  overrides?: Partial<Pick<DescriptionProposal, 'accroche' | 'description' | 'details' | 'materials' | 'entretien'>>;
};

export type Decisions = { products?: Record<string, ProductDecision> };

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

// Euros (nombre ou texte « 55,90 ») → centimes. null si invalide.
export function toCents(value: unknown, { allowZero = false } = {}): { cents: number | null; issue?: Issue } {
  const n = typeof value === 'string' && value.trim() ? Number(value.replace(',', '.')) : value;
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || (n === 0 && !allowZero)) {
    return { cents: null, issue: { level: 'erreur', message: `prix invalide (${JSON.stringify(value)})` } };
  }
  const cents = Math.round(n * 100);
  if (Math.abs(n * 100 - cents) > 1e-6) {
    return { cents, issue: { level: 'alerte', message: `prix ${n} avec plus de deux décimales, arrondi à ${cents / 100} €` } };
  }
  return { cents };
}

// --- Catégories ---

export type CategoryMap = Map<string, { slug: string; subs: Map<string, string> }>;

export function migrateCategories(docs: Doc[]): { writes: Doc[]; map: CategoryMap; issues: Issue[] } {
  const taken = new Set<string>();
  const map: CategoryMap = new Map();
  const writes: Doc[] = [];
  const issues: Issue[] = [];
  // Rejouable : une catégorie déjà migrée porte `legacy.oldId`, son ancien document `migratedTo`.
  // On garde une seule source par ancien identifiant.
  const byOldId = new Map<string, Doc>();
  for (const doc of docs) {
    const oldId = str((doc.data.legacy as Record<string, unknown> | undefined)?.oldId) || doc.id;
    if (doc.data.migratedTo && byOldId.has(oldId)) continue;
    if (!byOldId.has(oldId) || !doc.data.migratedTo) byOldId.set(oldId, doc);
  }
  [...byOldId.entries()].sort(([a], [b]) => a.localeCompare(b, 'fr')).forEach(([oldId, doc], index) => {
    const legacy = (doc.data.legacy ?? {}) as Record<string, unknown>;
    const name = str(doc.data.name) || oldId;
    const slug = uniqueSlug(slugify(oldId), taken);
    const oldSubs = legacy.oldSubs !== undefined ? strList(legacy.oldSubs) : strList(doc.data.subs);
    const subTaken = new Set<string>();
    const subs = oldSubs.map((s) => ({ slug: uniqueSlug(slugify(s), subTaken), name: normalizeSpaces(s) }));
    const data = {
      name,
      order: typeof doc.data.order === 'number' ? doc.data.order : index,
      intro: str(doc.data.intro),
      subs,
    };
    const parsed = categorieSchema.safeParse(data);
    if (!parsed.success) issues.push({ level: 'erreur', message: `catégorie ${oldId} : ${parsed.error.issues[0]?.message}` });
    map.set(oldId, { slug, subs: new Map(oldSubs.map((s, i) => [s, subs[i]!.slug])) });
    writes.push({ id: slug, data: { ...data, legacy: { oldId, oldSubs } } });
  });
  return { writes, map, issues };
}

// --- Produits ---

export type ProductResult = {
  id: string;
  name: string;
  write: Record<string, unknown>;
  variantes: Doc[];
  proposal: DescriptionProposal;
  original: { description: string; matieres: string; dimensions: string; entretien: string };
  oldStatus: string;
  newStatus: 'draft' | 'published' | 'archived';
  issues: Issue[];
};

function imagePath(url: string): string {
  // https://firebasestorage.googleapis.com/v0/b/<bucket>/o/produits%2Fx.jpg?alt=media → produits/x.jpg
  const match = url.match(/\/o\/([^?]+)/);
  return match ? decodeURIComponent(match[1]!) : url.replace(/^https?:\/\/[^/]+\//, '');
}

export function migrateProduct(doc: Doc, categories: CategoryMap, slugs: Set<string>, decision: ProductDecision = {}): ProductResult {
  const d = doc.data;
  const legacy = (d.legacy ?? null) as Record<string, unknown> | null;
  // Source : valeurs d'origine (premier passage) ou conservées dans `legacy` (passages suivants).
  const src = legacy ?? d;
  const issues: Issue[] = [];
  const name = normalizeSpaces(str(d.name));
  if (!name) issues.push({ level: 'erreur', message: 'nom absent' });

  const price = toCents(legacy ? legacy.price : d.price);
  if (price.issue) issues.push(price.issue);

  const oldCategory = str(src.category);
  const cat = categories.get(oldCategory);
  if (!cat) issues.push({ level: 'alerte', message: `catégorie inconnue (« ${oldCategory} ») : à choisir` });
  const oldSub = str(src.subCategory);
  const subCategory = oldSub ? (cat?.subs.get(oldSub) ?? slugify(oldSub)) : null;
  if (oldSub && !cat?.subs.has(oldSub)) issues.push({ level: 'alerte', message: `famille « ${oldSub} » absente de la catégorie` });

  const original = {
    description: str(src.description),
    matieres: str(src.matieres),
    dimensions: str(src.dimensions),
    entretien: str(src.entretien),
  };
  const auto = splitDescription(original);
  const proposal: DescriptionProposal = { ...auto, ...decision.overrides };
  for (const field of proposal.toComplete) issues.push({ level: 'alerte', message: `${field} à compléter` });
  // Tailles (« 6-9m, 9-12m ») : une variante par taille, stock à répartir par Jaelle.
  const sizes = [...`${original.dimensions} ${original.description}`.matchAll(/\b(\d{1,2})\s?-\s?(\d{1,2})\s?m(?:ois)?\b/giu)].map((m) => `${m[1]}-${m[2]} mois`);
  if (sizes.length) {
    issues.push({ level: 'alerte', message: `tailles détectées (${[...new Set(sizes)].join(', ')}) : créer une variante par taille et y répartir le stock` });
  }

  const oldImages = legacy ? strList(legacy.images) : strList(d.images);
  const images = oldImages.map((url, order) => ({ path: imagePath(url), url, alt: '', order }));
  if (images.length === 0) issues.push({ level: 'alerte', message: 'aucune photo' });
  else issues.push({ level: 'alerte', message: `texte alternatif à écrire pour ${images.length} photo(s)` });

  const rawStock = legacy ? legacy.stock : d.stock;
  const stock = typeof rawStock === 'number' && Number.isInteger(rawStock) && rawStock >= 0 ? rawStock : 0;
  if (stock !== rawStock) issues.push({ level: 'alerte', message: `stock invalide (${JSON.stringify(rawStock)}), mis à 0` });

  // Statut : publié reste publié (choix déjà fait par Jaelle), le reste en brouillon, sauf décision contraire.
  const oldStatus = str(legacy ? legacy.status : d.status) || '(aucun)';
  let newStatus: ProductResult['newStatus'] = decision.status ?? (oldStatus === 'published' ? 'published' : 'draft');
  if (issues.some((i) => i.level === 'erreur') && newStatus === 'published') {
    newStatus = 'draft';
    issues.push({ level: 'erreur', message: 'remis en brouillon à cause des erreurs ci-dessus' });
  }

  const existingSlug = typeof d.slug === 'string' && legacy ? d.slug : null;
  const slug = existingSlug && !slugs.has(existingSlug) ? (slugs.add(existingSlug), existingSlug) : uniqueSlug(slugify(name), slugs);

  const tags = [...new Set(str(src.seo_tags).split(/[,;#\n]/).map((t) => normalizeSpaces(t).toLocaleLowerCase('fr-FR')).filter(Boolean))].slice(0, 20);

  const nouveau = {
    slug,
    name,
    categoryId: cat?.slug ?? null,
    subCategory,
    status: newStatus,
    accroche: proposal.accroche,
    histoire: str(d.histoire),
    description: proposal.description,
    materials: proposal.materials,
    entretien: proposal.entretien,
    details: proposal.details,
    faq: [],
    images,
    priceCents: price.cents ?? 0,
    limitedEditionSize: null,
    giftWrap: true,
    tags,
    inStock: stock > 0,
    aiDraft: { generatedAt: null, reviewed: decision.descriptionApproved === true },
  };
  const parsed = produitSchema.safeParse(nouveau);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) issues.push({ level: 'erreur', message: `${issue.path.join('.')} : ${issue.message}` });
  }

  const variante = {
    sku: `${slug.toUpperCase().replace(/-/g, '').slice(0, 24)}-U`,
    color: null,
    size: null,
    priceCents: null,
    stock,
    dimensions: proposal.details.length === 1 && /cm$/.test(proposal.details[0]!) ? proposal.details[0]!.replace(/^.*: /, '') : null,
    active: true,
    order: 0,
  };
  varianteSchema.parse(variante);

  const legacyFields = legacy ?? {
    price: d.price ?? null,
    stock: d.stock ?? null,
    status: d.status ?? null,
    category: d.category ?? null,
    subCategory: d.subCategory ?? null,
    description: d.description ?? null,
    matieres: d.matieres ?? null,
    dimensions: d.dimensions ?? null,
    entretien: d.entretien ?? null,
    images: d.images ?? [],
    seo_tags: d.seo_tags ?? null,
  };

  return {
    id: doc.id,
    name,
    write: { ...nouveau, legacy: legacyFields },
    variantes: [{ id: 'unique', data: variante }],
    proposal,
    original,
    oldStatus,
    newStatus,
    issues,
  };
}

// --- Réglages de livraison ---

export function migrateDelivery(data: Record<string, unknown>): { write: Record<string, unknown>; issues: Issue[] } {
  const legacy = (data.legacy ?? data) as Record<string, unknown>;
  const issues: Issue[] = [];
  const free = toCents(legacy.freeThreshold, { allowZero: true });
  const flat = toCents(legacy.flatRate, { allowZero: true });
  if (free.cents === null) issues.push({ level: 'erreur', message: 'seuil de livraison gratuite invalide' });
  if (flat.cents === null) issues.push({ level: 'erreur', message: 'forfait de livraison invalide' });
  if (flat.cents === 0) issues.push({ level: 'alerte', message: 'forfait de livraison à 0 € : livraison gratuite pour toutes les commandes, à confirmer' });
  const zones = str(legacy.zones).split(/[,;]/).map((z) => normalizeSpaces(z)).filter(Boolean);
  issues.push({ level: 'alerte', message: 'délai de livraison estimé à compléter' });
  return {
    write: {
      freeThresholdCents: free.cents ?? 0,
      flatRateCents: flat.cents ?? 0,
      zones: zones.length ? zones : ['France'],
      estimatedDays: str(data.estimatedDays),
      legacy: { freeThreshold: legacy.freeThreshold ?? null, flatRate: legacy.flatRate ?? null, zones: legacy.zones ?? null },
    },
    issues,
  };
}

// --- Commandes (instantané converti en centimes ; l'empreinte de carte n'est pas reprise) ---

export function migrateOrder(doc: Doc): { write: Record<string, unknown>; issues: Issue[] } {
  const d = (doc.data.legacy ?? doc.data) as Record<string, unknown>;
  const issues: Issue[] = [];
  const items = (Array.isArray(d.items) ? d.items : []).map((raw) => {
    const item = raw as Record<string, unknown>;
    const unit = toCents(item.price);
    if (unit.cents === null) issues.push({ level: 'alerte', message: `ligne « ${str(item.name)} » : prix invalide` });
    return {
      productId: str(item.id),
      variantId: 'unique',
      sku: '',
      name: str(item.name),
      variantLabel: '',
      unitPriceCents: unit.cents ?? 0,
      quantity: typeof item.quantity === 'number' ? item.quantity : 1,
      image: str(item.image),
    };
  });
  const delivery = toCents(d.deliveryFee, { allowZero: true }).cents ?? 0;
  const total = toCents(d.total, { allowZero: true }).cents ?? 0;
  const subtotal = items.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0);
  if (total && subtotal + delivery !== total) {
    issues.push({ level: 'alerte', message: `total enregistré ${total / 100} € ≠ lignes + livraison ${(subtotal + delivery) / 100} €` });
  }
  const userId = str(d.userId);
  const detail = (d.shippingDetail ?? {}) as Record<string, unknown>;
  return {
    write: {
      userId: userId && userId !== 'guest' ? userId : null,
      items,
      amounts: { subtotalCents: subtotal, deliveryCents: delivery, totalCents: total || subtotal + delivery },
      customer: { uid: userId && userId !== 'guest' ? userId : null, email: str(d.customerEmail), name: str(d.customerName), phone: str(d.customerPhone) },
      shipping: { line1: str(detail.address) || str(d.shippingAddress), line2: str(detail.complement), zipCode: str(detail.zipCode), city: str(detail.city), country: 'FR' },
      gift: { wrap: false, message: '' },
      stripe: { sessionId: str(d.stripeSessionId), paymentIntentId: str(d.stripePaymentIntentId), eventId: '' },
      status: str(d.status) || 'paid',
      tracking: null,
      legacy: {
        total: d.total ?? null, deliveryFee: d.deliveryFee ?? null, items: d.items ?? [], userId: d.userId ?? null,
        customerName: d.customerName ?? null, customerEmail: d.customerEmail ?? null, customerPhone: d.customerPhone ?? null,
        shippingAddress: d.shippingAddress ?? null, shippingDetail: d.shippingDetail ?? null,
        stripeSessionId: d.stripeSessionId ?? null, stripePaymentIntentId: d.stripePaymentIntentId ?? null, status: d.status ?? null,
      },
    },
    issues,
  };
}

// Champs anciens à retirer d'une commande migrée (minimisation RGPD : `cardFingerprint`).
export const ORDER_FIELDS_TO_DELETE = [
  'cardFingerprint', 'total', 'deliveryFee', 'customerName', 'customerEmail', 'customerPhone',
  'shippingAddress', 'shippingDetail', 'stripeSessionId', 'stripePaymentIntentId',
];

// --- Messages (`messages` → `contacts`) et newsletter ---

export function migrateMessage(doc: Doc): Doc {
  const d = doc.data;
  return {
    id: `messages-${doc.id}`,
    data: {
      name: str(d.name).slice(0, 100),
      email: str(d.email).toLowerCase().slice(0, 254),
      subject: str(d.subject).slice(0, 100),
      message: str(d.message).slice(0, 5000),
      status: d.status === 'read' ? 'read' : 'unread',
      createdAt: d.createdAt ?? null,
      legacy: { from: 'messages', id: doc.id },
    },
  };
}

export function migrateNewsletter(doc: Doc): Record<string, unknown> {
  const d = doc.data;
  return {
    email: str(d.email).toLowerCase(),
    source: d.source === 'email_redirect' ? 'page_newsletter' : 'footer_site',
    consentAt: d.consentAt ?? d.subscribedAt ?? d.createdAt ?? null,
  };
}

// --- Profils : l'adresse passe dans la sous-collection `adresses` ---

export function migrateUser(doc: Doc): { profile: Record<string, unknown>; address: Record<string, unknown> | null } {
  const d = doc.data;
  const line1 = str(d.address);
  return {
    profile: { displayName: str(d.displayName).slice(0, 100), createdAt: d.createdAt ?? null },
    address: line1
      ? { label: 'Principale', name: str(d.displayName).slice(0, 100), line1, line2: '', zipCode: str(d.zipCode), city: str(d.city), country: 'FR' }
      : null,
  };
}

export const USER_FIELDS_TO_DELETE = ['uid', 'email', 'address', 'city', 'zipCode'];

// --- Articles de blog ---

export function migrateArticle(doc: Doc, slugs: Set<string>): Record<string, unknown> {
  const d = doc.data;
  const title = normalizeSpaces(str(d.title));
  const content = str(d.content);
  const productId = str(d.productId);
  const existing = typeof d.slug === 'string' && d.slug && !slugs.has(d.slug) ? (slugs.add(d.slug), d.slug) : null;
  return {
    slug: existing ?? uniqueSlug(slugify(title, `article-${doc.id.toLowerCase()}`), slugs),
    title,
    excerpt: str(d.excerpt) || normalizeSpaces(content).slice(0, 200),
    content,
    // Les brouillons générés automatiquement restent des brouillons (EDITORIAL.md §8).
    status: d.status === 'published' ? 'published' : 'draft',
    productIds: Array.isArray(d.productIds) ? d.productIds : productId ? [productId] : [],
  };
}
