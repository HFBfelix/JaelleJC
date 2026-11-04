// Schéma de la nouvelle base Firestore (BACKOFFICE.md §2). Montants en centimes (entiers).
// Toute donnée lue ou écrite côté serveur passe par ces schémas.
import { z } from 'zod';

export const COLLECTIONS = {
  produits: 'produits',
  variantes: 'variantes', // sous-collection de produits/{id}
  categories: 'categories',
  orders: 'orders',
  carts: 'carts',
  users: 'users',
  adresses: 'adresses', // sous-collection de users/{uid}
  contacts: 'contacts',
  newsletter: 'newsletter',
  settings: 'settings',
  articles: 'articles_blog',
  auditLog: 'auditLog',
  stripeEvents: 'stripeEvents', // événements Stripe déjà traités (idempotence du webhook)
  checkouts: 'checkouts', // paiements en cours : instantané du panier relu par le webhook
  stripeCustomers: 'stripeCustomers', // client Stripe de chaque compte (préremplissage de l'adresse) : serveur uniquement
  aiQuota: 'aiQuota', // appels à l'IA par heure (espace créatrice) : serveur uniquement, TTL `expiresAt`
  rateLimits: 'rateLimits', // limites des formulaires publics (clés hachées) : serveur uniquement, TTL `expiresAt`
  emailMarks: 'emailMarks', // e-mails automatiques déjà partis (bienvenue, relances…) : un seul envoi ; serveur uniquement
  emailPrefs: 'emailPrefs', // « ne plus recevoir ces messages » (adresse hachée, jeton du lien) : serveur uniquement
  produitsNotes: 'produitsNotes', // texte libre de la créatrice par pièce (analyse IA) : serveur uniquement, jamais public
  usageCache: 'usageCache', // recherche par usage : pièces trouvées pour une phrase (empreinte seule), 24 h ; serveur uniquement, TTL `expiresAt`
  usageStats: 'usageStats', // recherche par usage : compteurs du jour et alertes parties ; serveur uniquement, TTL `expiresAt` (90 jours)
} as const;

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80);
const cents = z.number().int().nonnegative();
const shortText = (max: number) => z.string().trim().max(max);
const timestamp = z.custom<{ toDate(): Date }>((v) => typeof v === 'object' && v !== null && 'toDate' in v);

export const productStatus = z.enum(['draft', 'published', 'archived']);

export const productImage = z.object({
  path: shortText(300),
  url: z.string().url().max(1000),
  alt: shortText(200), // vide après migration : à compléter avant toute nouvelle publication
  order: z.number().int().nonnegative(),
});

export const produit = z.object({
  slug,
  name: shortText(120).min(1),
  // Référence de la pièce (SKU) donnée par Jaelle, unique dans la boutique ; vide tant qu'elle n'est pas saisie.
  sku: shortText(40).nullable().optional(),
  // Modèle (décision de Jaelle, 2026-11-04) : une fiche par couleur ; les fiches d'un même modèle partagent cet
  // identifiant et affichent les pastilles des autres couleurs. Absent ou null : fiche seule.
  modelId: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/).nullable().optional(),
  categoryId: slug.nullable(),
  subCategory: slug.nullable(),
  status: productStatus,
  accroche: shortText(200),
  histoire: shortText(800),
  description: shortText(4000),
  materials: z.array(shortText(80)).max(10),
  entretien: shortText(400),
  // « Dimensions & détails » : une ligne par élément (ex. « Lange : 70 × 70 cm »).
  details: z.array(shortText(160)).max(20),
  faq: z.array(z.object({ question: shortText(200), reponse: shortText(800) })).max(10),
  images: z.array(productImage).max(12),
  priceCents: cents.min(1),
  limitedEditionSize: z.number().int().positive().nullable(),
  giftWrap: z.boolean(),
  tags: z.array(shortText(40)).max(20),
  // Cas d'usage (« baptême », « naissance », « vacances ») : base de la recherche par usage (étape 7bis).
  usages: z.array(shortText(40)).max(20).default([]),
  inStock: z.boolean(),
  aiDraft: z.object({ generatedAt: timestamp.nullable(), reviewed: z.boolean() }),
});
export type Produit = z.infer<typeof produit>;

export const variante = z.object({
  sku: shortText(40).min(1),
  color: shortText(40).nullable(),
  colorHex: z.string().regex(/^#[0-9a-f]{6}$/).nullable().optional(), // teinte de la pastille (absente des anciennes fiches)
  size: shortText(40).nullable(),
  priceCents: cents.min(1).nullable(), // remplace le prix de base si renseigné
  stock: z.number().int().nonnegative(),
  dimensions: shortText(80).nullable(),
  active: z.boolean(),
  order: z.number().int().nonnegative(),
});
export type Variante = z.infer<typeof variante>;

export const categorie = z.object({
  name: shortText(60).min(1),
  order: z.number().int().nonnegative(),
  intro: shortText(1000),
  subs: z.array(z.object({ slug, name: shortText(60).min(1) })).max(20),
});
export type Categorie = z.infer<typeof categorie>;

export const cartItem = z.object({
  productId: shortText(128).min(1),
  variantId: shortText(128).min(1),
  quantity: z.number().int().min(1).max(99),
});

// Visiteur : `carts/{tokenHash}`, l'identifiant est l'empreinte du jeton du cookie, jamais le jeton lui-même.
// Compte : `carts/u_{uid}`, `tokenHash` à null. `expiresAt` porte la politique TTL de Firestore
// (suppression automatique) et est vérifié à chaque lecture.
export const cart = z.object({
  tokenHash: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  userId: z.string().max(128).nullable(),
  items: z.array(cartItem).max(30),
  expiresAt: timestamp,
  updatedAt: timestamp,
});

export const orderStatus = z.enum(['paid', 'preparing', 'shipped', 'delivered', 'refunded', 'cancelled']);

export const order = z.object({
  userId: z.string().max(128).nullable(), // propriétaire (règles : lecture si userId == uid)
  items: z.array(z.object({
    productId: z.string(),
    variantId: z.string(),
    sku: z.string(),
    name: z.string(),
    variantLabel: z.string(),
    unitPriceCents: cents,
    quantity: z.number().int().min(1),
    image: z.string(),
  })).min(1),
  amounts: z.object({ subtotalCents: cents, deliveryCents: cents, totalCents: cents }),
  // `customer` : la personne qui achète (e-mails, suivi). Commandes d'avant le 2026-11-04 : nom et téléphone de la
  // livraison. `shipping.name` / `shipping.phone` : le destinataire (absents des commandes d'avant ; repli sur `customer`).
  customer: z.object({ uid: z.string().nullable(), email: z.string().email(), name: z.string(), phone: z.string() }),
  shipping: z.object({
    line1: z.string(), line2: z.string(), zipCode: z.string(), city: z.string(), country: z.string(),
    name: z.string().optional(), phone: z.string().optional(),
  }),
  gift: z.object({ wrap: z.boolean(), message: shortText(300) }),
  stripe: z.object({ sessionId: z.string(), paymentIntentId: z.string(), eventId: z.string() }),
  status: orderStatus,
  tracking: z.object({ carrier: z.string(), number: z.string(), url: z.string() }).nullable(),
  // Commandes de la refonte (absent des commandes migrées de l'ancien site).
  reference: z.string().optional(),
  // Remboursement automatique (stock insuffisant ou montant inattendu) : `id` null tant que Stripe n'a pas confirmé.
  refund: z.object({ reason: z.enum(['stock', 'montant']), id: z.string().nullable() }).nullable().optional(),
  // E-mails : « en_attente » tant que l'expéditeur n'est pas branché ou si l'envoi a échoué (renvoi possible).
  // `preparation` et `expedition` : posés par le changement de statut dans l'espace créatrice.
  emails: z.object({
    cliente: z.enum(['en_attente', 'envoye']), boutique: z.enum(['en_attente', 'envoye']),
    preparation: z.enum(['en_attente', 'envoye']).optional(), expedition: z.enum(['en_attente', 'envoye']).optional(),
  }).optional(),
});

// Paiement en cours : instantané du panier au moment de créer la session Stripe (`checkouts/{sessionId}`),
// relu par le webhook. Serveur uniquement (règles : tout refusé). Supprimé automatiquement (TTL `expiresAt`).
export const checkoutSnapshot = z.object({
  uid: z.string().min(1).max(128),
  email: z.string().email(),
  cartId: z.string().min(1).max(160),
  lines: z.array(z.object({
    productId: z.string(),
    variantId: z.string(),
    sku: z.string(),
    name: z.string(),
    variantLabel: z.string(),
    image: z.string(),
    unitPriceCents: cents.min(1),
    quantity: z.number().int().min(1).max(99),
  })).min(1).max(30),
  amounts: z.object({ subtotalCents: cents, deliveryCents: cents, totalCents: cents }),
  gift: z.object({ wrap: z.boolean(), message: shortText(300) }),
  // Adresse de livraison vérifiée sur la page panier (Stripe ne la redemande plus). Absente des paiements ouverts
  // avant ce changement : le webhook reprend alors celle saisie chez Stripe.
  shipping: z.object({
    name: shortText(100), line1: shortText(200), line2: shortText(200), zipCode: z.string().regex(/^[0-9]{5}$/),
    city: shortText(100), phone: z.string().max(30),
  }).optional(),
  // Personne qui achète (profil complet exigé au clic « Payer », 2026-11-04). Absente des paiements ouverts avant.
  buyer: z.object({ name: shortText(140), phone: z.string().max(30) }).optional(),
});
export type CheckoutSnapshot = z.infer<typeof checkoutSnapshot>;

// Adresse de livraison enregistrée par la cliente (`users/{uid}/adresses`), écrite par le serveur seulement.
export const ADDRESSES_MAX = 5; // décision de Jaelle (2026-10-30)
export const adresse = z.strictObject({
  label: shortText(40),
  name: shortText(100).min(1),
  line1: shortText(200).min(1),
  line2: shortText(200),
  zipCode: z.string().trim().regex(/^[0-9]{5}$/),
  city: shortText(100).min(1),
  country: z.literal('FR'),
  phone: shortText(30),
});
export type Adresse = z.infer<typeof adresse>;

export const deliverySettings = z.object({
  freeThresholdCents: cents,
  flatRateCents: cents,
  zones: z.array(shortText(40)).min(1),
  estimatedDays: shortText(40),
});

export const contact = z.object({
  name: shortText(100),
  email: z.string().email().max(254),
  subject: shortText(100),
  message: z.string().trim().min(10).max(5000),
  status: z.enum(['unread', 'read']),
});

export const newsletterEntry = z.object({
  email: z.string().email().max(254),
  source: z.enum(['footer_site', 'page_newsletter']),
});
