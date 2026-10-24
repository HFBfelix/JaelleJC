// Migration vers la nouvelle base (BACKOFFICE.md §6). Simulation par défaut : rien n'est écrit.
//
//   node scripts/migrate-v2.ts --project demo-jaellejc               (émulateur, simulation)
//   node scripts/migrate-v2.ts --project jaellejc-staging --apply    (test, écriture après sauvegarde)
//   Production : seulement à la bascule, par Jaelle, avec --confirmation (voir scripts/lib/admin.ts).
//
// Rejouable : un document déjà migré est ignoré, jamais réécrit.
// Les décisions de Jaelle (statuts, textes corrigés) sont lues dans scripts/migration/decisions.json.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { FieldValue, Timestamp, type DocumentData, type Firestore } from 'firebase-admin/firestore';
import { arg, connect, flag } from './lib/admin.ts';
import {
  ORDER_FIELDS_TO_DELETE, USER_FIELDS_TO_DELETE, migrateArticle, migrateCategories, migrateDelivery, migrateMessage,
  migrateNewsletter, migrateOrder, migrateProduct, migrateUser, type Decisions, type Doc, type Issue, type ProductResult,
} from '../src/server/migration/transform.ts';
import { buildReport } from '../src/server/migration/report.ts';

const project = arg('project');
const apply = flag('apply');
const { db } = connect(project);
const now = new Date();
const stamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);

const decisionsPath = 'scripts/migration/decisions.json';
const decisions: Decisions = existsSync(decisionsPath) ? JSON.parse(readFileSync(decisionsPath, 'utf8')) : {};

async function readAll(fs: Firestore, path: string): Promise<Doc[]> {
  const snap = await fs.collection(path).get();
  return snap.docs.map((d) => ({ id: d.id, data: d.data() }));
}

// Sauvegarde JSON lisible (horodatages convertis), dans backups/ (ignoré par git).
function serialize(value: unknown): unknown {
  if (value instanceof Timestamp) return { __timestamp: value.toDate().toISOString() };
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, serialize(v)]));
  return value;
}

const source = {
  categories: await readAll(db, 'categories'),
  produits: await readAll(db, 'produits'),
  settings: await readAll(db, 'settings'),
  orders: await readAll(db, 'orders'),
  messages: await readAll(db, 'messages'),
  contacts: await readAll(db, 'contacts'),
  newsletter: await readAll(db, 'newsletter'),
  users: await readAll(db, 'users'),
  articles: await readAll(db, 'articles_blog'),
};

const globalIssues: Issue[] = [];

// Catégories (toujours recalculées : résultat identique à chaque passage).
const cats = migrateCategories(source.categories);
globalIssues.push(...cats.issues);

// Produits : déjà migrés (`legacy` présent) = ignorés, leurs slugs réservés.
const slugs = new Set<string>();
const skippedProducts: string[] = [];
for (const p of source.produits) if (p.data.legacy && typeof p.data.slug === 'string') { slugs.add(p.data.slug); skippedProducts.push(p.id); }
const products: ProductResult[] = source.produits
  .filter((p) => !p.data.legacy)
  .map((p) => migrateProduct(p, cats.map, slugs, decisions.products?.[p.id]));

const delivery = source.settings.find((s) => s.id === 'delivery');
const deliveryResult = delivery && delivery.data.freeThresholdCents === undefined ? migrateDelivery(delivery.data) : null;
if (deliveryResult) globalIssues.push(...deliveryResult.issues);
if (!delivery) globalIssues.push({ level: 'erreur', message: 'settings/delivery absent : le paiement ne pourra pas calculer la livraison' });

const ordersToMigrate = source.orders.filter((o) => !o.data.legacy);
const orderResults = ordersToMigrate.map((o) => ({ id: o.id, ...migrateOrder(o) }));
for (const o of orderResults) for (const i of o.issues) globalIssues.push({ ...i, message: `commande ${o.id} : ${i.message}` });

const existingContacts = new Set(source.contacts.map((c) => c.id));
const messagesToCopy = source.messages.map(migrateMessage).filter((m) => !existingContacts.has(m.id));
const newsletterToMigrate = source.newsletter.filter((n) => n.data.consentAt === undefined);
const usersToMigrate = source.users.filter((u) => USER_FIELDS_TO_DELETE.some((f) => u.data[f] !== undefined));
const articleSlugs = new Set(source.articles.map((a) => a.data.slug).filter((s): s is string => typeof s === 'string'));
const articlesToMigrate = source.articles.filter((a) => typeof a.data.slug !== 'string');

const counts = {
  'Commandes à convertir': orderResults.length,
  'Messages copiés vers contacts': messagesToCopy.length,
  'Inscriptions newsletter à convertir': newsletterToMigrate.length,
  'Profils à convertir': usersToMigrate.length,
  'Articles à convertir': articlesToMigrate.length,
};

if (apply) {
  const dir = arg('backup-dir') ?? join('backups', `${project}-${stamp}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'sauvegarde.json'), JSON.stringify(serialize(source), null, 2));
  console.log(`Sauvegarde écrite : ${dir}/sauvegarde.json`);

  let batch = db.batch();
  let ops = 0;
  const commitIfFull = async () => {
    if (++ops >= 400) { await batch.commit(); batch = db.batch(); ops = 0; }
  };
  const audit = (action: string, target: string) =>
    batch.set(db.collection('auditLog').doc(), { who: 'scripts/migrate-v2', action, target, at: FieldValue.serverTimestamp() });

  const existingCategories = new Set(source.categories.map((c) => c.id));
  for (const c of cats.writes) {
    // Jamais de réécriture d'une catégorie déjà créée (elle a pu être modifiée depuis).
    if (!existingCategories.has(c.id)) { batch.create(db.collection('categories').doc(c.id), c.data); await commitIfFull(); }
    const oldId = String((c.data.legacy as { oldId: string }).oldId);
    if (oldId !== c.id && source.categories.some((d) => d.id === oldId)) {
      batch.set(db.collection('categories').doc(oldId), { migratedTo: c.id }, { merge: true }); await commitIfFull();
    }
  }
  for (const p of products) {
    const ref = db.collection('produits').doc(p.id);
    batch.set(ref, { ...p.write, updatedAt: FieldValue.serverTimestamp(), updatedBy: 'migration' }, { merge: true }); await commitIfFull();
    for (const v of p.variantes) { batch.create(ref.collection('variantes').doc(v.id), v.data); await commitIfFull(); }
    audit('migration produit', p.id); await commitIfFull();
  }
  if (deliveryResult) { batch.set(db.collection('settings').doc('delivery'), deliveryResult.write, { merge: true }); await commitIfFull(); }
  for (const o of orderResults) {
    const deletions = Object.fromEntries(ORDER_FIELDS_TO_DELETE.map((f) => [f, FieldValue.delete()]));
    batch.set(db.collection('orders').doc(o.id), { ...o.write, ...deletions }, { merge: true }); await commitIfFull();
  }
  for (const m of messagesToCopy) { batch.create(db.collection('contacts').doc(m.id), m.data as DocumentData); await commitIfFull(); }
  for (const n of newsletterToMigrate) { batch.set(db.collection('newsletter').doc(n.id), migrateNewsletter(n)); await commitIfFull(); }
  for (const u of usersToMigrate) {
    const { profile, address } = migrateUser(u);
    const deletions = Object.fromEntries(USER_FIELDS_TO_DELETE.map((f) => [f, FieldValue.delete()]));
    batch.set(db.collection('users').doc(u.id), { ...profile, ...deletions }, { merge: true }); await commitIfFull();
    if (address) { batch.set(db.collection('users').doc(u.id).collection('adresses').doc('principale'), address); await commitIfFull(); }
  }
  for (const a of articlesToMigrate) { batch.set(db.collection('articles_blog').doc(a.id), migrateArticle(a, articleSlugs), { merge: true }); await commitIfFull(); }
  await batch.commit();
}

const report = buildReport({
  project: project!,
  mode: apply ? 'écriture' : 'simulation',
  date: now.toISOString().slice(0, 16).replace('T', ' '),
  categories: cats.writes.map((c) => ({
    oldId: String((c.data.legacy as { oldId: string }).oldId),
    slug: c.id,
    subs: (c.data.subs as { name: string }[]).map((s) => s.name),
  })),
  products,
  skippedProducts,
  counts,
  globalIssues,
});
mkdirSync('reports/migration', { recursive: true });
const reportPath = join('reports/migration', `${project}-${apply ? 'ecriture' : 'simulation'}-${stamp}.md`);
writeFileSync(reportPath, report);
console.log(`${apply ? 'Migration écrite' : 'Simulation terminée (rien n’a été écrit)'}. Rapport : ${reportPath}`);
console.log(`Produits : ${products.length} migrés, ${skippedProducts.length} déjà migrés. Erreurs : ${products.filter((p) => p.issues.some((i) => i.level === 'erreur')).length}.`);
