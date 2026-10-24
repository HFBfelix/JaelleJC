// Remplit le projet de test avec le CATALOGUE PUBLIC de la production (décision de Jaelle, 2026-10-24) :
// produits, catégories, réglages et articles, lus comme le ferait n'importe quel visiteur
// (API publique Firestore, sans aucun identifiant de production). Aucune donnée client n'est lue.
// Commandes, messages, inscriptions et profils du test sont FICTIFS (--fictifs).
//
//   node scripts/copy-catalogue-to-staging.ts --project jaellejc-staging [--fictifs]
//   node scripts/copy-catalogue-to-staging.ts --project demo-jaellejc [--fictifs]   (émulateur)
import { Timestamp } from 'firebase-admin/firestore';
import { PRODUCTION, arg, connect, flag } from './lib/admin.ts';

const target = arg('project');
if (target === PRODUCTION) throw new Error('La copie ne peut viser que le projet de test ou l’émulateur.');
const { db } = connect(target);

const PUBLIC_API = `https://firestore.googleapis.com/v1/projects/${PRODUCTION}/databases/(default)/documents`;
const COLLECTIONS = ['produits', 'categories', 'settings', 'articles_blog'] as const;

type RestValue = Record<string, unknown>;

// Valeur de l'API REST Firestore → valeur JavaScript.
function fromRest(v: RestValue): unknown {
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return Timestamp.fromDate(new Date(String(v.timestampValue)));
  if ('arrayValue' in v) return ((v.arrayValue as { values?: RestValue[] }).values ?? []).map(fromRest);
  if ('mapValue' in v) return fields((v.mapValue as { fields?: Record<string, RestValue> }).fields ?? {});
  return null; // références et coordonnées : absentes du catalogue
}

function fields(f: Record<string, RestValue>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(f).map(([k, v]) => [k, fromRest(v)]));
}

async function readPublic(collection: string) {
  const docs: { id: string; data: Record<string, unknown> }[] = [];
  let pageToken = '';
  do {
    const url = `${PUBLIC_API}/${collection}?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Lecture publique de ${collection} refusée (${res.status}).`);
    const body = (await res.json()) as { documents?: { name: string; fields?: Record<string, RestValue> }[]; nextPageToken?: string };
    for (const d of body.documents ?? []) docs.push({ id: d.name.split('/').pop()!, data: fields(d.fields ?? {}) });
    pageToken = body.nextPageToken ?? '';
  } while (pageToken);
  return docs;
}

for (const collection of COLLECTIONS) {
  const docs = await readPublic(collection);
  const batch = db.batch();
  for (const d of docs) batch.set(db.collection(collection).doc(d.id), d.data);
  await batch.commit();
  console.log(`${collection} : ${docs.length} document(s) copié(s).`);
}

if (flag('fictifs')) {
  // Données fictives à l'ancien format, pour éprouver la migration (aucune vraie personne).
  const at = (days: number) => Timestamp.fromDate(new Date(Date.now() - days * 86400000));
  const batch = db.batch();
  batch.set(db.collection('orders').doc('fictive-1'), {
    userId: 'fictif-uid-1', customerName: 'CLIENTE FICTIVE', customerEmail: 'cliente.fictive@exemple.test', customerPhone: '0600000000',
    shippingAddress: '1 rue de l’Exemple, 75001 Paris', shippingDetail: { address: '1 rue de l’Exemple', complement: '', zipCode: '75001', city: 'Paris' },
    items: [{ id: 'fictif', name: 'PIÈCE FICTIVE', price: 89, quantity: 1, image: '' }], total: 95.9, deliveryFee: 6.9,
    stripeSessionId: 'cs_test_fictif', stripePaymentIntentId: 'pi_test_fictif', cardFingerprint: 'fictif', status: 'paid', createdAt: at(30),
  });
  batch.set(db.collection('orders').doc('fictive-invitee'), {
    userId: 'guest', customerName: 'INVITÉE FICTIVE', customerEmail: 'invitee.fictive@exemple.test', customerPhone: '',
    shippingAddress: '2 avenue Test, 92100 Boulogne', shippingDetail: { address: '2 avenue Test', complement: 'Bât. B', zipCode: '92100', city: 'Boulogne' },
    items: [{ id: 'fictif', name: 'PIÈCE FICTIVE', price: 65, quantity: 2, image: '' }], total: 130, deliveryFee: 0,
    stripeSessionId: 'cs_test_fictif2', stripePaymentIntentId: 'pi_test_fictif2', status: 'shipped', createdAt: at(10),
  });
  batch.set(db.collection('messages').doc('fictif'), { name: 'VISITEUSE FICTIVE', email: 'visiteuse@exemple.test', subject: 'Question', message: 'Message fictif de test.', createdAt: at(5) });
  batch.set(db.collection('newsletter').doc('fictive'), { email: 'abonnee@exemple.test', source: 'footer_site', subscribedAt: at(3) });
  batch.set(db.collection('users').doc('fictif-uid-1'), { uid: 'fictif-uid-1', displayName: 'Cliente Fictive', email: 'cliente.fictive@exemple.test', address: '1 rue de l’Exemple', city: 'Paris', zipCode: '75001', createdAt: at(30) });
  await batch.commit();
  console.log('Données fictives ajoutées (commandes, message, inscription, profil).');
}
