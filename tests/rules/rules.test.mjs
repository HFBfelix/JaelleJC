// Tests des règles Firestore et Storage (étape 0, livraison A), dans l'émulateur.
// Lancer : npm run test:rules   (démarre les émulateurs Firestore + Storage)
import { test, before, after, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment, assertSucceeds, assertFails,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, addDoc, collection } from 'firebase/firestore';
import { ref, uploadBytes, deleteObject, getMetadata } from 'firebase/storage';

const ADMIN_EMAIL = 'admin@exemple.test';
const CLIENT_EMAIL = 'client@exemple.test';
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
    await setDoc(doc(db, 'produits', 'en-ligne'), { name: 'Cape', status: 'published', price: 89 });
    await setDoc(doc(db, 'produits', 'brouillon'), { name: 'Secret', status: 'draft', price: 50 });
    await uploadBytes(ref(ctx.storage(), 'produits/existante.jpg'), IMAGE, { contentType: 'image/jpeg' });
  });
});

const anonyme = () => env.unauthenticatedContext();
const client = () => env.authenticatedContext('client-uid', { email: CLIENT_EMAIL, email_verified: true });
const admin = () => env.authenticatedContext('admin-uid', { email: ADMIN_EMAIL, email_verified: true });
const adminNonVerifie = () => env.authenticatedContext('admin-uid', { email: ADMIN_EMAIL, email_verified: false });

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

// --- Firestore : contact (le formulaire écrit maintenant dans `contacts`) ---

test('Firestore : un anonyme crée un message de contact', async () => {
  await assertSucceeds(addDoc(collection(anonyme().firestore(), 'contacts'), { name: 'A', email: 'a@b.fr', message: 'Bonjour à vous' }));
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
