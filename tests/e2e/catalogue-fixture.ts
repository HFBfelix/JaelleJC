// Jeu de données fictif des tests de parcours (émulateur uniquement), ajouté avant les tests et retiré après.
// Identifiants préfixés « e2e- » : n'interfère pas avec les autres données de l'émulateur.
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

export const FIXTURE = {
  category: { slug: 'naissance-e2e', name: 'Naissance E2E' },
  published: { id: 'e2e-publie', slug: 'cape-e2e', name: 'Cape E2E', priceCents: 8900 },
  soldOut: { id: 'e2e-epuise', slug: 'couverture-e2e-epuisee', name: 'Couverture E2E épuisée' },
  draft: { id: 'e2e-brouillon', slug: 'brouillon-e2e' },
  archived: { id: 'e2e-archive', slug: 'archive-e2e' },
  invalid: { id: 'e2e-invalide', slug: 'invalide-e2e' },
  html: { id: 'e2e-html', slug: 'piege-e2e' },
};

function db() {
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
  ];
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
  for (const { id } of [FIXTURE.published, FIXTURE.soldOut, FIXTURE.draft, FIXTURE.archived, FIXTURE.invalid, FIXTURE.html]) {
    for (const v of (await d.collection(`produits/${id}/variantes`).get()).docs) batch.delete(v.ref);
    batch.delete(d.doc(`produits/${id}`));
  }
  await batch.commit();
}
