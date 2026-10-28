// Migration vers la nouvelle base (BACKOFFICE.md §6). Simulation par défaut : rien n'est écrit.
//
//   node scripts/migrate-v2.ts --project demo-jaellejc               (émulateur, simulation)
//   node scripts/migrate-v2.ts --project jaellejc-staging --apply    (test, écriture après sauvegarde)
//   Production : seulement à la bascule, par Jaelle, boutique gelée, avec --confirmation (voir scripts/lib/admin.ts).
//
// Sûretés :
// - Rejouable : un document déjà migré est ignoré, jamais réécrit (un produit migré sans variante est réparé).
// - À chaud : chaque écriture sur un document existant exige qu'il n'ait pas changé depuis sa lecture
//   (précondition `lastUpdateTime`) ; sinon le lot échoue sans rien écrire et le script s'arrête. Relancer.
// - Un produit et ses variantes sont écrits dans le même lot (tout ou rien).
// - Sauvegarde complète (sous-collections comprises) dans backups/ (ignoré par git) avant toute écriture.
// Les décisions de Jaelle (statuts, textes corrigés) sont lues dans scripts/migration/decisions.json.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import {
  FieldValue, Timestamp, type DocumentData, type DocumentReference, type Firestore, type WriteBatch,
} from 'firebase-admin/firestore';
import { arg, connect, flag } from './lib/admin.ts';
import {
  ORDER_FIELDS_TO_DELETE, PRODUCT_FIELDS_TO_DELETE, USER_FIELDS_TO_DELETE, migrateArticle, migrateCategories,
  migrateDelivery, migrateMessage, migrateNewsletter, migrateOrder, migrateProduct, migrateUser,
  type Decisions, type Doc, type Issue, type ProductResult,
} from '../src/server/migration/transform.ts';
import { buildReport } from '../src/server/migration/report.ts';

const project = arg('project');
const apply = flag('apply');
const { db } = connect(project);
const now = new Date();
const stamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);

const decisionsPath = 'scripts/migration/decisions.json';
const decisions: Decisions = existsSync(decisionsPath) ? JSON.parse(readFileSync(decisionsPath, 'utf8')) : {};

// Dernière mise à jour de chaque document lu : précondition des écritures (aucun écrasement d'un changement).
const readTimes = new Map<string, Timestamp>();

async function readAll(fs: Firestore, path: string): Promise<Doc[]> {
  const snap = await fs.collection(path).get();
  return snap.docs.map((d) => {
    readTimes.set(d.ref.path, d.updateTime);
    return { id: d.id, data: d.data() };
  });
}

// Sous-collection lue pour tous les parents (variantes, adresses), indexée par chemin complet.
async function readGroup(fs: Firestore, group: string): Promise<Doc[]> {
  const snap = await fs.collectionGroup(group).get();
  return snap.docs.map((d) => {
    readTimes.set(d.ref.path, d.updateTime);
    return { id: d.ref.path, data: d.data() };
  });
}

// Sauvegarde JSON lisible (horodatages convertis).
function serialize(value: unknown): unknown {
  if (value instanceof Timestamp) return { __timestamp: value.toDate().toISOString() };
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, serialize(v)]));
  return value;
}

const source = {
  categories: await readAll(db, 'categories'),
  produits: await readAll(db, 'produits'),
  variantes: await readGroup(db, 'variantes'),
  settings: await readAll(db, 'settings'),
  orders: await readAll(db, 'orders'),
  messages: await readAll(db, 'messages'),
  contacts: await readAll(db, 'contacts'),
  newsletter: await readAll(db, 'newsletter'),
  users: await readAll(db, 'users'),
  adresses: await readGroup(db, 'adresses'),
  articles: await readAll(db, 'articles_blog'),
};

const globalIssues: Issue[] = [];

const cats = migrateCategories(source.categories);
globalIssues.push(...cats.issues);

// Produits : migré = `legacy` présent ET variante créée. Un produit migré sans variante est réparé.
const variantPaths = new Set(source.variantes.map((v) => v.id));
const hasVariant = (id: string) => [...variantPaths].some((p) => p.startsWith(`produits/${id}/variantes/`));
const slugs = new Set<string>();
const skippedProducts: string[] = [];
const toRepair: Doc[] = [];
for (const p of source.produits) {
  if (!p.data.legacy) continue;
  if (typeof p.data.slug === 'string') slugs.add(p.data.slug);
  if (hasVariant(p.id)) skippedProducts.push(p.id);
  else toRepair.push(p);
}
const products: ProductResult[] = source.produits
  .filter((p) => !p.data.legacy)
  .map((p) => migrateProduct(p, cats.map, slugs, decisions.products?.[p.id]));
// Réparation : variante recalculée depuis `legacy`, le produit lui-même n'est pas réécrit.
const repairs = toRepair.map((p) => migrateProduct(p, cats.map, new Set(), decisions.products?.[p.id]));
for (const r of repairs) globalIssues.push({ level: 'alerte', message: `produit ${r.id} migré sans variante : variante recréée` });

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
  'Variantes réparées': repairs.length,
  'Commandes à convertir': orderResults.length,
  'Messages copiés vers contacts': messagesToCopy.length,
  'Inscriptions newsletter à convertir': newsletterToMigrate.length,
  'Profils à convertir': usersToMigrate.length,
  'Articles à convertir': articlesToMigrate.length,
};

if (apply) {
  // Sauvegarde toujours sous backups/ (ignoré par git), jamais ailleurs.
  const backups = resolve('backups');
  const dir = resolve(arg('backup-dir') ?? join('backups', `${project}-${stamp}`));
  if (!dir.startsWith(backups + sep)) throw new Error('La sauvegarde doit être écrite dans le dossier backups/.');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'sauvegarde.json'), JSON.stringify(serialize(source), null, 2));
  console.log(`Sauvegarde écrite : ${dir}${sep}sauvegarde.json`);

  // Lots de 400 opérations au plus (limite Firestore : 500). Un groupe (produit + variantes) n'est jamais coupé.
  let batch: WriteBatch = db.batch();
  let ops = 0;
  const reserve = async (n: number) => {
    if (ops + n > 400) { await batch.commit(); batch = db.batch(); ops = 0; }
    ops += n;
  };
  // Document existant : mise à jour seulement s'il n'a pas changé depuis la lecture.
  const guardedUpdate = (ref: DocumentReference, data: DocumentData) => {
    const time = readTimes.get(ref.path);
    if (!time) throw new Error(`Document non lu avant écriture : ${ref.path}`);
    batch.update(ref, data, { lastUpdateTime: time });
  };
  const audit = (action: string, target: string) =>
    batch.set(db.collection('auditLog').doc(), { who: 'scripts/migrate-v2', action, target, at: FieldValue.serverTimestamp() });

  const existingCategories = new Map(source.categories.map((c) => [c.id, c.data]));
  for (const c of cats.writes) {
    const existing = existingCategories.get(c.id);
    const ref = db.collection('categories').doc(c.id);
    if (!existing) {
      await reserve(1); batch.create(ref, c.data);
    } else if (!existing.legacy) {
      // Ancien identifiant déjà égal au slug : document converti sur place.
      await reserve(1); guardedUpdate(ref, c.data);
    }
    const oldId = String((c.data.legacy as { oldId: string }).oldId);
    if (oldId !== c.id && existingCategories.has(oldId) && !existingCategories.get(oldId)?.migratedTo) {
      await reserve(1); guardedUpdate(db.collection('categories').doc(oldId), { migratedTo: c.id });
    }
  }
  const productDeletions = Object.fromEntries(PRODUCT_FIELDS_TO_DELETE.map((f) => [f, FieldValue.delete()]));
  for (const p of products) {
    const ref = db.collection('produits').doc(p.id);
    await reserve(2 + p.variantes.length);
    guardedUpdate(ref, { ...p.write, ...productDeletions, updatedAt: FieldValue.serverTimestamp(), updatedBy: 'migration' });
    // Variante restée d'un passage précédent (produit recopié depuis) : remplacée.
    for (const v of p.variantes) batch.set(ref.collection('variantes').doc(v.id), v.data);
    audit('migration produit', p.id);
  }
  for (const r of repairs) {
    const ref = db.collection('produits').doc(r.id);
    await reserve(1 + r.variantes.length);
    for (const v of r.variantes) batch.create(ref.collection('variantes').doc(v.id), v.data);
    audit('réparation variante', r.id);
  }
  if (deliveryResult) { await reserve(1); guardedUpdate(db.collection('settings').doc('delivery'), deliveryResult.write); }
  const orderDeletions = Object.fromEntries(ORDER_FIELDS_TO_DELETE.map((f) => [f, FieldValue.delete()]));
  for (const o of orderResults) { await reserve(1); guardedUpdate(db.collection('orders').doc(o.id), { ...o.write, ...orderDeletions }); }
  for (const m of messagesToCopy) { await reserve(1); batch.create(db.collection('contacts').doc(m.id), m.data as DocumentData); }
  for (const n of newsletterToMigrate) {
    await reserve(1);
    const deletions = Object.fromEntries(Object.keys(n.data).filter((k) => !['email', 'source'].includes(k)).map((k) => [k, FieldValue.delete()]));
    guardedUpdate(db.collection('newsletter').doc(n.id), { ...deletions, ...migrateNewsletter(n) });
  }
  const userDeletions = Object.fromEntries(USER_FIELDS_TO_DELETE.map((f) => [f, FieldValue.delete()]));
  const existingAddresses = new Set(source.adresses.map((a) => a.id));
  for (const u of usersToMigrate) {
    const { profile, address } = migrateUser(u);
    const ref = db.collection('users').doc(u.id);
    await reserve(2);
    guardedUpdate(ref, { ...profile, ...userDeletions });
    // Adresse principale déjà créée (passage précédent, ou ajoutée par la cliente) : jamais écrasée.
    const addressRef = ref.collection('adresses').doc('principale');
    if (address && !existingAddresses.has(addressRef.path)) batch.create(addressRef, address);
  }
  for (const a of articlesToMigrate) {
    await reserve(1); guardedUpdate(db.collection('articles_blog').doc(a.id), migrateArticle(a, articleSlugs));
  }
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
console.log(`Produits : ${products.length} migrés, ${skippedProducts.length} déjà migrés, ${repairs.length} réparés. Erreurs : ${products.filter((p) => p.issues.some((i) => i.level === 'erreur')).length}.`);
