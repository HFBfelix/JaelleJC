// Tests des règles Firestore et Storage de la refonte (étape 1bis), dans l'émulateur.
// Lancer : npm run test:rules   (démarre les émulateurs Firestore + Storage)
// Appelants : anonyme, cliente propriétaire, autre cliente, fausse admin, admin (revendication `admin: true`).
import { test, before, after, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment, assertSucceeds, assertFails,
} from '@firebase/rules-unit-testing';
import {
  doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc, collection, query, where, serverTimestamp, collectionGroup,
} from 'firebase/firestore';
import { ref, uploadBytes, deleteObject, getMetadata, updateMetadata } from 'firebase/storage';

const IMAGE = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);

let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-jaellejc',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    storage: { rules: readFileSync('storage.rules', 'utf8') },
  });
});

after(async () => { await env?.cleanup(); });

beforeEach(async () => {
  await env.clearFirestore();
  await env.clearStorage();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'produits', 'en-ligne'), { name: 'Cape', status: 'published', priceCents: 8900 });
    await setDoc(doc(db, 'produits', 'en-ligne', 'variantes', 'unique'), { sku: 'CAPE-U', stock: 3, active: true });
    await setDoc(doc(db, 'produits', 'en-ligne', 'variantes', 'inactive'), { sku: 'CAPE-X', stock: 0, active: false });
    await setDoc(doc(db, 'produits', 'brouillon'), { name: 'Secret', status: 'draft', priceCents: 5000 });
    await setDoc(doc(db, 'produits', 'brouillon', 'variantes', 'unique'), { sku: 'SEC-U', stock: 5, active: true });
    await setDoc(doc(db, 'produits', 'archive'), { name: 'Ancien', status: 'archived', priceCents: 4000 });
    await setDoc(doc(db, 'produits', 'archive', 'variantes', 'unique'), { sku: 'ANC-U', stock: 1, active: true });
    await setDoc(doc(db, 'categories', 'bebe'), { name: 'Bébé', order: 0, intro: '', subs: [] });
    await setDoc(doc(db, 'settings', 'delivery'), { freeThresholdCents: 15000, flatRateCents: 690 });
    await setDoc(doc(db, 'settings', 'interne'), { note: 'réglage privé' });
    await setDoc(doc(db, 'articles_blog', 'publie'), { title: 'A', status: 'published' });
    await setDoc(doc(db, 'articles_blog', 'brouillon'), { title: 'B', status: 'draft' });
    await setDoc(doc(db, 'orders', 'commande-cliente'), { userId: 'cliente-uid', status: 'paid' });
    await setDoc(doc(db, 'orders', 'commande-invitee'), { userId: null, status: 'paid' });
    await setDoc(doc(db, 'users', 'cliente-uid'), { displayName: 'Cliente' });
    await setDoc(doc(db, 'users', 'cliente-uid', 'adresses', 'maison'), { name: 'C', line1: '1 rue', zipCode: '75001', city: 'Paris' });
    await setDoc(doc(db, 'carts', 'panier'), { tokenHash: 'x', items: [] });
    await setDoc(doc(db, 'contacts', 'message'), { email: 'a@b.fr', message: 'Bonjour à vous' });
    await setDoc(doc(db, 'newsletter', 'inscrit'), { email: 'a@b.fr', source: 'footer_site' });
    await setDoc(doc(db, 'autorisations', 'admin@exemple.test'), { actif: true });
    await setDoc(doc(db, 'auditLog', 'log'), { action: 'x' });
    await setDoc(doc(db, 'stripeEvents', 'evt'), { at: 1 });
    await uploadBytes(ref(ctx.storage(), 'produits/existante.jpg'), IMAGE, { contentType: 'image/jpeg' });
    await uploadBytes(ref(ctx.storage(), 'prive/fichier.jpg'), IMAGE, { contentType: 'image/jpeg' });
  });
});

const anonyme = () => env.unauthenticatedContext();
const cliente = () => env.authenticatedContext('cliente-uid', { email: 'cliente@exemple.test', email_verified: true });
const autreCliente = () => env.authenticatedContext('autre-uid', { email: 'autre@exemple.test', email_verified: true });
// Ancien modèle (e-mail dans `autorisations`) sans revendication : ne doit plus rien ouvrir.
const fausseAdmin = () => env.authenticatedContext('fausse-uid', { email: 'admin@exemple.test', email_verified: true, admin: false });
const admin = () => env.authenticatedContext('admin-uid', { email: 'jaelle@exemple.test', email_verified: true, admin: true });
const tous = { anonyme, cliente, autreCliente, fausseAdmin, admin };
const nonAdmins = { anonyme, cliente, autreCliente, fausseAdmin };

const db = (ctx) => ctx().firestore();

// --- Produits et variantes ---

for (const [nom, ctx] of Object.entries(tous)) {
  test(`produits : ${nom} lit un produit publié et ses variantes`, async () => {
    await assertSucceeds(getDoc(doc(db(ctx), 'produits', 'en-ligne')));
    await assertSucceeds(getDoc(doc(db(ctx), 'produits', 'en-ligne', 'variantes', 'unique')));
  });
}

for (const [nom, ctx] of Object.entries(nonAdmins)) {
  test(`produits : ${nom} ne lit ni brouillon, ni archive, ni leurs variantes`, async () => {
    await assertFails(getDoc(doc(db(ctx), 'produits', 'brouillon')));
    await assertFails(getDoc(doc(db(ctx), 'produits', 'archive')));
    await assertFails(getDoc(doc(db(ctx), 'produits', 'brouillon', 'variantes', 'unique')));
  });

  test(`produits : ${nom} ne liste pas tout le catalogue sans filtre`, async () => {
    await assertFails(getDocs(collection(db(ctx), 'produits')));
  });
}

test('produits : un anonyme liste les produits publiés avec le filtre de statut', async () => {
  await assertSucceeds(getDocs(query(collection(db(anonyme), 'produits'), where('status', '==', 'published'))));
});

test('produits : l’admin lit brouillons, archives et variantes', async () => {
  await assertSucceeds(getDoc(doc(db(admin), 'produits', 'brouillon')));
  await assertSucceeds(getDoc(doc(db(admin), 'produits', 'archive')));
  await assertSucceeds(getDoc(doc(db(admin), 'produits', 'brouillon', 'variantes', 'unique')));
  await assertSucceeds(getDocs(collection(db(admin), 'produits')));
});

for (const [nom, ctx] of Object.entries(tous)) {
  test(`produits : ${nom} n'écrit ni produit ni variante depuis le navigateur`, async () => {
    await assertFails(setDoc(doc(db(ctx), 'produits', 'nouveau'), { name: 'X', status: 'published', priceCents: 1 }));
    await assertFails(updateDoc(doc(db(ctx), 'produits', 'en-ligne'), { priceCents: 1 }));
    await assertFails(deleteDoc(doc(db(ctx), 'produits', 'en-ligne')));
    await assertFails(updateDoc(doc(db(ctx), 'produits', 'en-ligne', 'variantes', 'unique'), { stock: 999 }));
  });
}

// --- Catégories, réglages, blog ---

for (const [nom, ctx] of Object.entries(tous)) {
  test(`catalogue : ${nom} lit catégories et réglages sans pouvoir les modifier`, async () => {
    await assertSucceeds(getDoc(doc(db(ctx), 'categories', 'bebe')));
    await assertSucceeds(getDoc(doc(db(ctx), 'settings', 'delivery')));
    await assertFails(setDoc(doc(db(ctx), 'categories', 'pirate'), { name: 'X' }));
    await assertFails(updateDoc(doc(db(ctx), 'settings', 'delivery'), { flatRateCents: 0 }));
  });
}

for (const [nom, ctx] of Object.entries(nonAdmins)) {
  test(`blog : ${nom} lit un article publié, pas un brouillon`, async () => {
    await assertSucceeds(getDoc(doc(db(ctx), 'articles_blog', 'publie')));
    await assertFails(getDoc(doc(db(ctx), 'articles_blog', 'brouillon')));
    await assertFails(setDoc(doc(db(ctx), 'articles_blog', 'x'), { title: 'X', status: 'published' }));
  });
}

test('blog : l’admin lit un brouillon mais n’écrit pas depuis le navigateur', async () => {
  await assertSucceeds(getDoc(doc(db(admin), 'articles_blog', 'brouillon')));
  await assertFails(setDoc(doc(db(admin), 'articles_blog', 'x'), { title: 'X', status: 'draft' }));
});

// --- Commandes ---

test('commandes : la cliente lit sa commande', async () => {
  await assertSucceeds(getDoc(doc(db(cliente), 'orders', 'commande-cliente')));
  await assertSucceeds(getDocs(query(collection(db(cliente), 'orders'), where('userId', '==', 'cliente-uid'))));
});

for (const [nom, ctx] of Object.entries({ anonyme, autreCliente, fausseAdmin })) {
  test(`commandes : ${nom} ne lit pas la commande d'une autre`, async () => {
    await assertFails(getDoc(doc(db(ctx), 'orders', 'commande-cliente')));
    await assertFails(getDoc(doc(db(ctx), 'orders', 'commande-invitee')));
  });
}

test('commandes : la cliente ne lit pas une commande invitée ni toutes les commandes', async () => {
  await assertFails(getDoc(doc(db(cliente), 'orders', 'commande-invitee')));
  await assertFails(getDocs(collection(db(cliente), 'orders')));
});

test('commandes : l’admin lit toutes les commandes', async () => {
  await assertSucceeds(getDocs(collection(db(admin), 'orders')));
});

for (const [nom, ctx] of Object.entries(tous)) {
  test(`commandes : ${nom} ne crée, ne modifie ni ne supprime aucune commande`, async () => {
    await assertFails(addDoc(collection(db(ctx), 'orders'), { userId: 'cliente-uid', status: 'paid' }));
    await assertFails(updateDoc(doc(db(ctx), 'orders', 'commande-cliente'), { status: 'shipped' }));
    await assertFails(deleteDoc(doc(db(ctx), 'orders', 'commande-cliente')));
  });
}

// --- Profils et adresses ---

test('profil : la cliente lit et modifie son profil', async () => {
  await assertSucceeds(getDoc(doc(db(cliente), 'users', 'cliente-uid')));
  await assertSucceeds(updateDoc(doc(db(cliente), 'users', 'cliente-uid'), { displayName: 'Nouveau nom', updatedAt: serverTimestamp() }));
});

test('profil : la cliente ne peut pas se donner de droits ni ajouter de champ inconnu', async () => {
  await assertFails(updateDoc(doc(db(cliente), 'users', 'cliente-uid'), { admin: true }));
  await assertFails(updateDoc(doc(db(cliente), 'users', 'cliente-uid'), { role: 'admin' }));
  await assertFails(updateDoc(doc(db(cliente), 'users', 'cliente-uid'), { displayName: 'x'.repeat(101) }));
});

test('profil : la cliente ne supprime pas son profil depuis le navigateur', async () => {
  await assertFails(deleteDoc(doc(db(cliente), 'users', 'cliente-uid')));
});

for (const [nom, ctx] of Object.entries({ anonyme, autreCliente, fausseAdmin })) {
  test(`profil : ${nom} ne lit ni ne modifie le profil ou les adresses d'une autre`, async () => {
    await assertFails(getDoc(doc(db(ctx), 'users', 'cliente-uid')));
    await assertFails(setDoc(doc(db(ctx), 'users', 'cliente-uid'), { displayName: 'Pirate' }));
    await assertFails(getDoc(doc(db(ctx), 'users', 'cliente-uid', 'adresses', 'maison')));
    await assertFails(setDoc(doc(db(ctx), 'users', 'cliente-uid', 'adresses', 'x'), { name: 'P', line1: '1', zipCode: '75001', city: 'Paris' }));
  });
}

test('adresses : la cliente ajoute une adresse valide et la supprime', async () => {
  const adresse = { name: 'Cliente', line1: '2 rue des Lilas', zipCode: '92100', city: 'Boulogne', country: 'FR' };
  await assertSucceeds(setDoc(doc(db(cliente), 'users', 'cliente-uid', 'adresses', 'bureau'), adresse));
  await assertSucceeds(deleteDoc(doc(db(cliente), 'users', 'cliente-uid', 'adresses', 'bureau')));
});

test('adresses : adresse invalide refusée (code postal, pays, champ inconnu, trop long)', async () => {
  const base = { name: 'C', line1: '1 rue', zipCode: '75001', city: 'Paris' };
  const ref_ = doc(db(cliente), 'users', 'cliente-uid', 'adresses', 'x');
  await assertFails(setDoc(ref_, { ...base, zipCode: '7500' }));
  await assertFails(setDoc(ref_, { ...base, country: 'BE' }));
  await assertFails(setDoc(ref_, { ...base, admin: true }));
  await assertFails(setDoc(ref_, { ...base, line1: 'x'.repeat(201) }));
  await assertFails(setDoc(ref_, { name: 'C', zipCode: '75001', city: 'Paris' }));
});

// --- Contact et newsletter ---

const message = () => ({
  name: 'Camille', email: 'camille@exemple.fr', subject: 'Question', message: 'Bonjour, une question sur la cape.',
  createdAt: serverTimestamp(), status: 'unread',
});

test('contact : un anonyme envoie un message valide', async () => {
  await assertSucceeds(addDoc(collection(db(anonyme), 'contacts'), message()));
});

test('contact : messages invalides refusés', async () => {
  const c = collection(db(anonyme), 'contacts');
  await assertFails(addDoc(c, { ...message(), email: 'pas-un-email' }));
  await assertFails(addDoc(c, { ...message(), email: '<script>@x.fr' }));
  await assertFails(addDoc(c, { ...message(), message: 'court' }));
  await assertFails(addDoc(c, { ...message(), message: 'x'.repeat(5001) }));
  await assertFails(addDoc(c, { ...message(), name: 'x'.repeat(101) }));
  await assertFails(addDoc(c, { ...message(), status: 'read' }));
  await assertFails(addDoc(c, { ...message(), createdAt: new Date('2020-01-01') }));
  await assertFails(addDoc(c, { ...message(), admin: true }));
});

for (const [nom, ctx] of Object.entries(nonAdmins)) {
  test(`contact et newsletter : ${nom} ne lit rien`, async () => {
    await assertFails(getDoc(doc(db(ctx), 'contacts', 'message')));
    await assertFails(getDocs(collection(db(ctx), 'contacts')));
    await assertFails(getDoc(doc(db(ctx), 'newsletter', 'inscrit')));
    await assertFails(getDocs(query(collection(db(ctx), 'newsletter'), where('email', '==', 'a@b.fr'))));
  });
}

test('contact et newsletter : l’admin lit, personne ne modifie ni ne supprime depuis le navigateur', async () => {
  await assertSucceeds(getDoc(doc(db(admin), 'contacts', 'message')));
  await assertSucceeds(getDocs(collection(db(admin), 'newsletter')));
  await assertFails(updateDoc(doc(db(admin), 'contacts', 'message'), { status: 'read' }));
  await assertFails(deleteDoc(doc(db(admin), 'newsletter', 'inscrit')));
});

test('newsletter : un anonyme s’inscrit avec des champs valides', async () => {
  await assertSucceeds(addDoc(collection(db(anonyme), 'newsletter'), { email: 'n@exemple.fr', source: 'footer_site', consentAt: serverTimestamp() }));
});

test('newsletter : inscriptions invalides refusées', async () => {
  const c = collection(db(anonyme), 'newsletter');
  await assertFails(addDoc(c, { email: 'invalide', source: 'footer_site', consentAt: serverTimestamp() }));
  await assertFails(addDoc(c, { email: 'n@exemple.fr', source: 'ailleurs', consentAt: serverTimestamp() }));
  await assertFails(addDoc(c, { email: 'n@exemple.fr', source: 'footer_site', consentAt: new Date('2020-01-01') }));
  await assertFails(addDoc(c, { email: 'n@exemple.fr', source: 'footer_site', consentAt: serverTimestamp(), admin: true }));
});

// --- Collections réservées au serveur ---

for (const [nom, ctx] of Object.entries(tous)) {
  test(`serveur seul : ${nom} n'accède ni aux paniers, ni aux journaux, ni aux anciens droits`, async () => {
    for (const [col, id] of [['carts', 'panier'], ['auditLog', 'log'], ['stripeEvents', 'evt'], ['autorisations', 'admin@exemple.test'], ['messages', 'x']]) {
      await assertFails(getDoc(doc(db(ctx), col, id)));
      await assertFails(setDoc(doc(db(ctx), col, id), { x: 1 }));
    }
  });
}

// --- Storage : photos produits ---

for (const [nom, ctx] of Object.entries(tous)) {
  test(`Storage : ${nom} lit une photo produit, pas un autre dossier`, async () => {
    await assertSucceeds(getMetadata(ref(ctx().storage(), 'produits/existante.jpg')));
    await assertFails(getMetadata(ref(ctx().storage(), 'prive/fichier.jpg')));
  });
}

for (const [nom, ctx] of Object.entries(nonAdmins)) {
  test(`Storage : ${nom} n'envoie ni ne supprime de photo`, async () => {
    await assertFails(uploadBytes(ref(ctx().storage(), 'produits/x.jpg'), IMAGE, { contentType: 'image/jpeg' }));
    await assertFails(deleteObject(ref(ctx().storage(), 'produits/existante.jpg')));
  });
}

test('Storage : l’admin envoie une photo JPEG, PNG ou WebP et la supprime', async () => {
  for (const [nom, type] of [['a.jpg', 'image/jpeg'], ['b.png', 'image/png'], ['c.webp', 'image/webp']]) {
    await assertSucceeds(uploadBytes(ref(admin().storage(), `produits/${nom}`), IMAGE, { contentType: type }));
  }
  await assertSucceeds(deleteObject(ref(admin().storage(), 'produits/existante.jpg')));
});

test('Storage : l’admin ne peut envoyer ni SVG, ni HTML, ni fichier de plus de 10 Mo, ni hors de produits/', async () => {
  await assertFails(uploadBytes(ref(admin().storage(), 'produits/x.svg'), IMAGE, { contentType: 'image/svg+xml' }));
  await assertFails(uploadBytes(ref(admin().storage(), 'produits/x.html'), IMAGE, { contentType: 'text/html' }));
  await assertFails(uploadBytes(ref(admin().storage(), 'produits/gros.jpg'), new Uint8Array(10 * 1024 * 1024 + 1), { contentType: 'image/jpeg' }));
  await assertFails(uploadBytes(ref(admin().storage(), 'ailleurs/x.jpg'), IMAGE, { contentType: 'image/jpeg' }));
});

// --- Compléments demandés par la relecture de sécurité (étape 1bis) ---

for (const [nom, ctx] of Object.entries(nonAdmins)) {
  test(`variantes : ${nom} ne lit ni variante inactive, ni variante d'un produit archivé`, async () => {
    await assertFails(getDoc(doc(db(ctx), 'produits', 'en-ligne', 'variantes', 'inactive')));
    await assertFails(getDoc(doc(db(ctx), 'produits', 'archive', 'variantes', 'unique')));
  });

  test(`variantes : ${nom} ne lit pas toutes les variantes d'un coup, ne crée ni ne supprime de variante`, async () => {
    await assertFails(getDocs(collectionGroup(db(ctx), 'variantes')));
    await assertFails(setDoc(doc(db(ctx), 'produits', 'en-ligne', 'variantes', 'nouvelle'), { sku: 'X', stock: 9, active: true }));
    await assertFails(deleteDoc(doc(db(ctx), 'produits', 'en-ligne', 'variantes', 'unique')));
  });

  test(`réglages et catégories : ${nom} ne lit pas un réglage interne, ne supprime rien`, async () => {
    await assertFails(getDoc(doc(db(ctx), 'settings', 'interne')));
    await assertFails(deleteDoc(doc(db(ctx), 'settings', 'delivery')));
    await assertFails(deleteDoc(doc(db(ctx), 'categories', 'bebe')));
  });

  test(`contact et newsletter : ${nom} ne modifie ni ne supprime`, async () => {
    await assertFails(updateDoc(doc(db(ctx), 'contacts', 'message'), { status: 'read' }));
    await assertFails(deleteDoc(doc(db(ctx), 'contacts', 'message')));
    await assertFails(updateDoc(doc(db(ctx), 'newsletter', 'inscrit'), { email: 'x@y.fr' }));
    await assertFails(deleteDoc(doc(db(ctx), 'newsletter', 'inscrit')));
  });

  test(`Storage : ${nom} ne modifie pas les informations d'une photo`, async () => {
    await assertFails(updateMetadata(ref(ctx().storage(), 'produits/existante.jpg'), { contentType: 'text/html' }));
  });
}

test('variantes : une requête publique filtrée sur les variantes actives passe', async () => {
  await assertSucceeds(getDocs(query(collection(db(anonyme), 'produits', 'en-ligne', 'variantes'), where('active', '==', true))));
});

test('variantes : l’admin lit une variante inactive', async () => {
  await assertSucceeds(getDoc(doc(db(admin), 'produits', 'en-ligne', 'variantes', 'inactive')));
});

for (const [nom, ctx] of Object.entries({ anonyme, autreCliente, fausseAdmin })) {
  test(`commandes : ${nom} ne lit pas les commandes d'une autre, même avec le filtre userId`, async () => {
    await assertFails(getDocs(query(collection(db(ctx), 'orders'), where('userId', '==', 'cliente-uid'))));
  });
}

test('profil : création par sa propriétaire, valide puis invalide', async () => {
  const nouvelle = () => env.authenticatedContext('nouvelle-uid', { email: 'n@exemple.test', email_verified: true });
  const ref_ = doc(db(nouvelle), 'users', 'nouvelle-uid');
  await assertFails(setDoc(ref_, { displayName: 'N', admin: true }));
  await assertFails(setDoc(ref_, { displayName: 'N', createdAt: 'x'.repeat(5000) }));
  await assertFails(setDoc(ref_, { displayName: 'N', updatedAt: 42 }));
  await assertSucceeds(setDoc(ref_, { displayName: 'N', createdAt: serverTimestamp() }));
});

test('profil : une cliente ne liste pas tous les profils', async () => {
  await assertFails(getDocs(collection(db(cliente), 'users')));
});

test('contact : sujet de plus de 100 caractères refusé', async () => {
  await assertFails(addDoc(collection(db(anonyme), 'contacts'), { ...message(), subject: 'x'.repeat(101) }));
});
