// Jeu de données fictif des tests de parcours (émulateur uniquement), ajouté avant les tests et retiré après.
// Identifiants préfixés « e2e- » : n'interfère pas avec les autres données de l'émulateur.
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

export const FIXTURE = {
  category: { slug: 'naissance-e2e', name: 'Naissance E2E' },
  // Catégorie à part pour les pièces du paiement : la page Collections n'affiche que 6 pièces par catégorie.
  paymentCategory: { slug: 'paiement-e2e', name: 'Paiement E2E' },
  published: { id: 'e2e-publie', slug: 'cape-e2e', name: 'Cape E2E', priceCents: 8900 },
  soldOut: { id: 'e2e-epuise', slug: 'couverture-e2e-epuisee', name: 'Couverture E2E épuisée' },
  draft: { id: 'e2e-brouillon', slug: 'brouillon-e2e' },
  archived: { id: 'e2e-archive', slug: 'archive-e2e' },
  invalid: { id: 'e2e-invalide', slug: 'invalide-e2e' },
  html: { id: 'e2e-html', slug: 'piege-e2e' },
  // Panier (étape 3) : pièce en stock suffisant, et deux pièces modifiées en cours de test (prix, retrait de la vente).
  cabas: { id: 'e2e-cabas', slug: 'cabas-e2e', name: 'Cabas E2E', priceCents: 4500 },
  priced: { id: 'e2e-prix', slug: 'lange-e2e-prix', name: 'Lange E2E prix', priceCents: 3000 },
  withdrawn: { id: 'e2e-retrait', slug: 'bavoir-e2e-retrait', name: 'Bavoir E2E retrait', priceCents: 2000 },
  // Paiement (étape 5) : pièce achetée par les parcours, et dernière pièce disputée par deux clientes.
  buy: { id: 'e2e-zpaiement', slug: 'coffret-e2e-paiement', name: 'Coffret E2E paiement', priceCents: 6000, stock: 50 },
  last: { id: 'e2e-zderniere', slug: 'veste-e2e-derniere', name: 'Veste E2E dernière', priceCents: 7000, stock: 1 },
};

// Réglage de livraison des parcours, créé seulement s'il manque (jamais écrasé sur la base locale de Jaelle).
export const DELIVERY = { freeThresholdCents: 15000, flatRateCents: 690, zones: ['France'], estimatedDays: '' };

export function db() {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Tests de parcours : émulateur Firestore requis (FIRESTORE_EMULATOR_HOST).');
  const app = getApps()[0] ?? initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID ?? 'demo-jaellejc' });
  return getFirestore(app);
}

const base = (slug: string, name: string, status: string, priceCents = 4500) => ({
  slug, name, status, priceCents,
  categoryId: FIXTURE.category.slug, subCategory: 'capes',
  accroche: `${name}, pour les premiers bains.`,
  histoire: '',
  description: 'Une pièce de test cousue main.',
  materials: ['gaze de coton'],
  entretien: 'Laver à 30°',
  details: ['Cape : 80 × 80 cm'],
  faq: [], images: [], limitedEditionSize: null, giftWrap: true, tags: [],
  inStock: true, aiDraft: { generatedAt: null, reviewed: true },
  createdAt: Timestamp.now(),
});

const variant = (stock: number, active = true) => ({
  sku: 'E2E-U', color: null, size: null, priceCents: null, stock, dimensions: null, active, order: 0,
});

export async function seed() {
  const d = db();
  const batch = d.batch();
  batch.set(d.doc(`categories/${FIXTURE.category.slug}`), {
    name: FIXTURE.category.name, order: 99, intro: '', subs: [{ slug: 'capes', name: 'Capes' }],
  });
  batch.set(d.doc(`categories/${FIXTURE.paymentCategory.slug}`), {
    name: FIXTURE.paymentCategory.name, order: 100, intro: '', subs: [{ slug: 'capes', name: 'Capes' }],
  });
  const products: [string, Record<string, unknown>, number][] = [
    [FIXTURE.published.id, base(FIXTURE.published.slug, FIXTURE.published.name, 'published', FIXTURE.published.priceCents), 2],
    [FIXTURE.soldOut.id, { ...base(FIXTURE.soldOut.slug, FIXTURE.soldOut.name, 'published'), inStock: false }, 0],
    [FIXTURE.draft.id, base(FIXTURE.draft.slug, 'Brouillon E2E secret', 'draft'), 5],
    [FIXTURE.archived.id, base(FIXTURE.archived.slug, 'Archive E2E', 'archived'), 5],
    [FIXTURE.invalid.id, { ...base(FIXTURE.invalid.slug, 'Invalide E2E', 'published'), priceCents: 0 }, 5],
    [FIXTURE.html.id, {
      ...base(FIXTURE.html.slug, 'Piège E2E', 'published'),
      accroche: '</script><script>window.__pirate = 1</script>',
      description: '<img src=x onerror="window.__pirate = 2">',
    }, 1],
    ...[FIXTURE.cabas, FIXTURE.priced, FIXTURE.withdrawn].map((p): [string, Record<string, unknown>, number] =>
      [p.id, base(p.slug, p.name, 'published', p.priceCents), 5]),
    ...[FIXTURE.buy, FIXTURE.last].map((p): [string, Record<string, unknown>, number] =>
      [p.id, { ...base(p.slug, p.name, 'published', p.priceCents), categoryId: FIXTURE.paymentCategory.slug }, p.stock]),
  ];
  await d.doc('settings/delivery').create(DELIVERY).catch(() => { /* déjà présent : conservé */ });
  for (const [id, data, stock] of products) {
    batch.set(d.doc(`produits/${id}`), data);
    batch.set(d.doc(`produits/${id}/variantes/unique`), variant(stock));
  }
  // Variante inactive avec du stock : ne doit pas rendre l'épuisé disponible.
  batch.set(d.doc(`produits/${FIXTURE.soldOut.id}/variantes/inactive`), variant(9, false));
  await batch.commit();
}

export async function clean() {
  const d = db();
  const batch = d.batch();
  batch.delete(d.doc(`categories/${FIXTURE.category.slug}`));
  batch.delete(d.doc(`categories/${FIXTURE.paymentCategory.slug}`));
  // Paniers des parcours : ceux qui contiennent une pièce « e2e- » ou que les tests ont vidés.
  for (const c of (await d.collection('carts').get()).docs) {
    const items = (c.get('items') ?? []) as { productId?: string }[];
    if (!items.length || items.some((i) => i.productId?.startsWith('e2e-'))) batch.delete(c.ref);
  }
  // Commandes, paiements en cours et événements Stripe des parcours (pièces « e2e- » seulement).
  for (const col of ['orders', 'checkouts']) {
    for (const o of (await d.collection(col).get()).docs) {
      const items = (o.get(col === 'orders' ? 'items' : 'lines') ?? []) as { productId?: string }[];
      if (!items.some((i) => i.productId?.startsWith('e2e-'))) continue;
      batch.delete(o.ref);
      for (const e of (await d.collection('stripeEvents').where('orderId', '==', o.id).get()).docs) batch.delete(e.ref);
    }
  }
  for (const { id } of [FIXTURE.published, FIXTURE.soldOut, FIXTURE.draft, FIXTURE.archived, FIXTURE.invalid, FIXTURE.html,
    FIXTURE.cabas, FIXTURE.priced, FIXTURE.withdrawn, FIXTURE.buy, FIXTURE.last]) {
    for (const v of (await d.collection(`produits/${id}/variantes`).get()).docs) batch.delete(v.ref);
    batch.delete(d.doc(`produits/${id}`));
  }
  // Pièces créées par les parcours de l'espace créatrice (nom « E2E créatrice … ») et leur journal.
  for (const p of (await d.collection('produits').get()).docs) {
    if (!String(p.get('name') ?? '').startsWith('E2E créatrice')) continue;
    for (const v of (await p.ref.collection('variantes').get()).docs) batch.delete(v.ref);
    for (const a of (await d.collection('auditLog').where('target', '==', p.id).get()).docs) batch.delete(a.ref);
    batch.delete(p.ref);
  }
  await batch.commit();
}
