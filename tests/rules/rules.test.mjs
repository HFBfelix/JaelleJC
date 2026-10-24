// Tests des règles Firestore et Storage (étape 0, livraison A), dans l'émulateur.
// Lancer : npm run test:rules   (démarre les émulateurs Firestore + Storage)
import { test, before, after, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment, assertSucceeds, assertFails,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, deleteObject, getMetadata } from 'firebase/storage';

const ADMIN_EMAIL = 'admin@exemple.test';
const CLIENT_EMAIL = 'client@exemple.test';
const INACTIF_EMAIL = 'ancienne-admin@exemple.test';
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
    await setDoc(doc(db, 'autorisations', ADMIN_EMAIL), { actif: true });
    await setDoc(doc(db, 'autorisations', INACTIF_EMAIL), { actif: false });
    await setDoc(doc(db, 'users', 'autre-uid'), { email: 'autre@exemple.test' });
    await setDoc(doc(db, 'produits', 'en-ligne'), { name: 'Cape', status: 'published', price: 89 });
    await setDoc(doc(db, 'produits', 'brouillon'), { name: 'Secret', status: 'draft', price: 50 });
    await uploadBytes(ref(ctx.storage(), 'produits/existante.jpg'), IMAGE, { contentType: 'image/jpeg' });
  });
});

const anonyme = () => env.unauthenticatedContext();
const client = () => env.authenticatedContext('client-uid', { email: CLIENT_EMAIL, email_verified: true });
const admin = () => env.authenticatedContext('admin-uid', { email: ADMIN_EMAIL, email_verified: true });
const adminNonVerifie = () => env.authenticatedContext('admin-uid', { email: ADMIN_EMAIL, email_verified: false });
const adminInactive = () => env.authenticatedContext('inactif-uid', { email: INACTIF_EMAIL, email_verified: true });

// --- Storage : photos produits ---

test('Storage : un anonyme lit une photo produit', async () => {
  await assertSucceeds(getMetadata(ref(anonyme().storage(), 'produits/existante.jpg')));
});

test('Storage : un anonyme ne peut pas envoyer de photo', async () => {
  await assertFails(uploadBytes(ref(anonyme().storage(), 'produits/x.jpg'), IMAGE, { contentType: 'image/jpeg' }));
});

test('Storage : un client connecté (e-mail vérifié) ne peut pas envoyer de photo', async () => {
  await assertFails(uploadBytes(ref(client().storage(), 'produits/x.jpg'), IMAGE, { contentType: 'image/jpeg' }));
});

test('Storage : un client connecté ne peut pas supprimer une photo', async () => {
  await assertFails(deleteObject(ref(client().storage(), 'produits/existante.jpg')));
});

test('Storage : l’admin envoie une photo JPEG', async () => {
  await assertSucceeds(uploadBytes(ref(admin().storage(), 'produits/x.jpg'), IMAGE, { contentType: 'image/jpeg' }));
});

test('Storage : l’admin supprime une photo', async () => {
  await assertSucceeds(deleteObject(ref(admin().storage(), 'produits/existante.jpg')));
});

test('Storage : l’admin ne peut pas envoyer un SVG ni du HTML', async () => {
  await assertFails(uploadBytes(ref(admin().storage(), 'produits/x.svg'), IMAGE, { contentType: 'image/svg+xml' }));
  await assertFails(uploadBytes(ref(admin().storage(), 'produits/x.html'), IMAGE, { contentType: 'text/html' }));
});

test('Storage : l’admin ne peut pas envoyer un fichier de plus de 10 Mo', async () => {
  const big = new Uint8Array(10 * 1024 * 1024 + 1);
  await assertFails(uploadBytes(ref(admin().storage(), 'produits/gros.jpg'), big, { contentType: 'image/jpeg' }));
});

test('Storage : e-mail admin non vérifié refusé', async () => {
  await assertFails(uploadBytes(ref(adminNonVerifie().storage(), 'produits/x.jpg'), IMAGE, { contentType: 'image/jpeg' }));
});

test('Storage : hors du dossier produits/, tout est refusé (même admin)', async () => {
  await assertFails(uploadBytes(ref(admin().storage(), 'autre/x.jpg'), IMAGE, { contentType: 'image/jpeg' }));
});

// --- Firestore : écriture produits (inchangée, vérifiée) ---

test('Firestore : un client ne peut pas modifier un produit', async () => {
  await assertFails(setDoc(doc(client().firestore(), 'produits', 'en-ligne'), { price: 1 }, { merge: true }));
});

test('Firestore : l’admin modifie un produit', async () => {
  await assertSucceeds(setDoc(doc(admin().firestore(), 'produits', 'en-ligne'), { price: 90 }, { merge: true }));
});

test('Storage : autorisation désactivée (actif: false) refusée', async () => {
  await assertFails(uploadBytes(ref(adminInactive().storage(), 'produits/x.jpg'), IMAGE, { contentType: 'image/jpeg' }));
  await assertFails(deleteObject(ref(adminInactive().storage(), 'produits/existante.jpg')));
});

test('Firestore : un anonyme ne peut pas écrire dans produits', async () => {
  await assertFails(setDoc(doc(anonyme().firestore(), 'produits', 'pirate'), { name: 'x', price: 1 }));
});

test('Firestore : admin à e-mail non vérifié ne peut pas écrire dans produits ni settings', async () => {
  await assertFails(setDoc(doc(adminNonVerifie().firestore(), 'produits', 'en-ligne'), { price: 1 }, { merge: true }));
  await assertFails(setDoc(doc(adminNonVerifie().firestore(), 'settings', 'delivery'), { flatRate: 0 }));
});

test('Firestore : autorisation désactivée ne peut pas écrire dans produits', async () => {
  await assertFails(setDoc(doc(adminInactive().firestore(), 'produits', 'en-ligne'), { price: 1 }, { merge: true }));
});

test('Firestore : un client ne peut pas modifier les réglages de livraison', async () => {
  await assertFails(setDoc(doc(client().firestore(), 'settings', 'delivery'), { flatRate: 0 }));
});

test('Firestore : un client ne lit ni ne modifie le profil d’un autre client', async () => {
  await assertFails(getDoc(doc(client().firestore(), 'users', 'autre-uid')));
  await assertFails(setDoc(doc(client().firestore(), 'users', 'autre-uid'), { email: 'x@y.fr' }));
});

test('Firestore : un client lit son propre profil', async () => {
  await assertSucceeds(getDoc(doc(client().firestore(), 'users', 'client-uid')));
});

// --- Firestore : contact (le formulaire écrit maintenant dans `contacts`) ---

const contactValide = () => ({
  name: 'JEANNE', email: 'jeanne@exemple.fr', subject: "DEMANDE D'INFORMATION",
  message: 'Bonjour, une question sur la cape.', createdAt: serverTimestamp(), status: 'unread',
});

test('Firestore : un anonyme crée un message de contact (champs du formulaire)', async () => {
  await assertSucceeds(addDoc(collection(anonyme().firestore(), 'contacts'), contactValide()));
});

for (const [label, data] of [
  ['champ en trop', { ...contactValide(), admin: true }],
  ['message trop long', { ...contactValide(), message: 'x'.repeat(5001) }],
  ['message trop court', { ...contactValide(), message: 'court' }],
  ['message non textuel', { ...contactValide(), message: 12345678901 }],
  ['e-mail invalide', { ...contactValide(), email: '<script>@x' }],
  ['nom trop long', { ...contactValide(), name: 'N'.repeat(101) }],
  ['date choisie par le client', { ...contactValide(), createdAt: new Date('2000-01-01') }],
  ['statut forcé', { ...contactValide(), status: 'read' }],
  ['message absent', (({ message, ...rest }) => rest)(contactValide())],
]) {
  test(`Firestore : contact refusé — ${label}`, async () => {
    await assertFails(addDoc(collection(anonyme().firestore(), 'contacts'), data));
  });
}

// --- Firestore : newsletter ---

test('Firestore : inscription newsletter valide (pied de page et page dédiée)', async () => {
  await assertSucceeds(addDoc(collection(anonyme().firestore(), 'newsletter'), { email: 'a@b.fr', subscribedAt: serverTimestamp(), source: 'footer_site' }));
  await assertSucceeds(addDoc(collection(anonyme().firestore(), 'newsletter'), { email: 'a@b.fr', createdAt: serverTimestamp(), source: 'email_redirect' }));
});

for (const [label, data] of [
  ['e-mail invalide', { email: 'pas-un-email', subscribedAt: serverTimestamp(), source: 'footer_site' }],
  ['source inconnue', { email: 'a@b.fr', subscribedAt: serverTimestamp(), source: 'pirate' }],
  ['champ en trop', { email: 'a@b.fr', subscribedAt: serverTimestamp(), source: 'footer_site', html: '<b>x</b>' }],
  ['e-mail trop long', { email: `${'a'.repeat(250)}@b.fr`, subscribedAt: serverTimestamp(), source: 'footer_site' }],
]) {
  test(`Firestore : newsletter refusée — ${label}`, async () => {
    await assertFails(addDoc(collection(anonyme().firestore(), 'newsletter'), data));
  });
}

test('Firestore : un anonyme ne lit pas la newsletter', async () => {
  await assertFails(getDoc(doc(anonyme().firestore(), 'newsletter', 'x')));
});

test('Firestore : un anonyme ne lit pas les messages de contact', async () => {
  await assertFails(getDoc(doc(anonyme().firestore(), 'contacts', 'x')));
});

test('Firestore : l’ancienne collection `messages` reste fermée', async () => {
  await assertFails(addDoc(collection(anonyme().firestore(), 'messages'), { message: 'x' }));
});

// --- Firestore : compatibilité ancien code (livraison A) ---

test('Firestore : un anonyme ne crée pas de commande', async () => {
  await assertFails(addDoc(collection(anonyme().firestore(), 'orders'), { total: 1 }));
});

test('Firestore : un client ne lit pas une commande', async () => {
  await assertFails(getDoc(doc(client().firestore(), 'orders', 'x')));
});
