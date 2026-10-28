// Typographie française des noms déjà migrés (EDITORIAL.md) : produits, familles, titres d'articles.
// Simulation par défaut : rien n'est écrit.
//
//   node scripts/corriger-typographie.ts --project demo-jaellejc              (émulateur, simulation)
//   node scripts/corriger-typographie.ts --project jaellejc-staging --apply   (test, écriture après sauvegarde)
//   Production : refusé. À la bascule, la migration (scripts/migrate-v2.ts) applique la même règle.
//
// Sûretés : rejouable (un nom déjà correct n'est pas réécrit), sauvegarde des documents modifiés dans backups/
// avant écriture, chaque écriture exige que le document n'ait pas changé depuis sa lecture (`lastUpdateTime`).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { arg, connect, flag, PRODUCTION } from './lib/admin.ts';
import { planTypography } from '../src/server/migration/typography.ts';
import type { Decisions, Doc } from '../src/server/migration/transform.ts';

const project = arg('project');
if (project === PRODUCTION) throw new Error('Production refusée : la migration de la bascule applique cette règle.');
const apply = flag('apply');
const { db } = connect(project);

const decisionsPath = 'scripts/migration/decisions.json';
const decisions: Decisions = existsSync(decisionsPath) ? JSON.parse(readFileSync(decisionsPath, 'utf8')) : {};

const readTimes = new Map<string, Timestamp>();
async function readAll(path: string): Promise<Doc[]> {
  const snap = await db.collection(path).get();
  return snap.docs.map((d) => { readTimes.set(d.ref.path, d.updateTime); return { id: d.id, data: d.data() }; });
}

const source = { produits: await readAll('produits'), categories: await readAll('categories'), articles: await readAll('articles_blog') };
const changes = planTypography(source, decisions);

console.log(`${changes.length} correction(s) ${apply ? 'à écrire' : 'proposée(s) (simulation)'} sur ${project} :`);
for (const c of changes) console.log(`- ${c.collection}/${c.id} ${c.field} : « ${c.before} » → « ${c.after} »`);

if (apply && changes.length) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backups = resolve('backups');
  const dir = resolve(join('backups', `${project}-typographie-${stamp}`));
  if (!dir.startsWith(backups + sep)) throw new Error('La sauvegarde doit être écrite dans le dossier backups/.');
  mkdirSync(dir, { recursive: true });
  const all = [...source.produits.map((d) => ['produits', d] as const), ...source.categories.map((d) => ['categories', d] as const), ...source.articles.map((d) => ['articles_blog', d] as const)];
  const touched = new Set(changes.map((c) => `${c.collection}/${c.id}`));
  const saved = all.filter(([col, d]) => touched.has(`${col}/${d.id}`)).map(([col, d]) => ({ path: `${col}/${d.id}`, data: d.data }));
  writeFileSync(join(dir, 'sauvegarde.json'), JSON.stringify(saved, (_k, v) => (v instanceof Timestamp ? { __timestamp: v.toDate().toISOString() } : v), 2));
  console.log(`Sauvegarde écrite : ${dir}${sep}sauvegarde.json`);

  // Un document (catégorie) peut porter plusieurs corrections : les données sont fusionnées, une seule écriture.
  const byDoc = new Map<string, Record<string, unknown>>();
  for (const c of changes) byDoc.set(`${c.collection}/${c.id}`, { ...byDoc.get(`${c.collection}/${c.id}`), ...c.data });
  const batch = db.batch();
  for (const [path, data] of byDoc) {
    const time = readTimes.get(path);
    if (!time) throw new Error(`Document non lu avant écriture : ${path}`);
    batch.update(db.doc(path), data, { lastUpdateTime: time });
    batch.set(db.collection('auditLog').doc(), { who: 'scripts/corriger-typographie', action: 'typographie', target: path, at: FieldValue.serverTimestamp() });
  }
  await batch.commit();
  console.log(`${byDoc.size} document(s) mis à jour.`);
}
