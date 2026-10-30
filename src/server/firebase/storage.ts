// Firebase Storage côté serveur (Admin SDK) : photos produits de l'espace créatrice. Jamais importé par le navigateur.
// - Local : émulateur Storage si FIREBASE_STORAGE_EMULATOR_HOST est défini (avec les autres émulateurs seulement).
// - Test et production : bucket du projet (`<projet>.firebasestorage.app`), ou FIREBASE_STORAGE_BUCKET.
import 'server-only';
import { randomUUID } from 'node:crypto';
import { getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { adminDb } from './admin';

const env = (name: string) => process.env[name]?.trim() || null;

function emulatorHost() {
  const host = env('FIREBASE_STORAGE_EMULATOR_HOST');
  if (host && (env('VERCEL_ENV') || !env('FIRESTORE_EMULATOR_HOST'))) throw new Error('FIREBASE_STORAGE_EMULATOR_HOST réservé aux émulateurs locaux.');
  return host;
}

function bucketName() {
  adminDb(); // initialise l'application Admin (projet lu dans la configuration)
  const project = getApps()[0]!.options.projectId ?? 'demo-jaellejc';
  return env('FIREBASE_STORAGE_BUCKET') ?? (emulatorHost() ? `${project}.appspot.com` : `${project}.firebasestorage.app`);
}

const bucket = () => getStorage(getApps()[0]!).bucket(bucketName());

// Adresse publique d'une photo (règles Storage : lecture publique de `produits/`), au format Firebase.
function publicUrl(path: string, token: string) {
  const host = emulatorHost();
  const base = host ? `http://${host}` : 'https://firebasestorage.googleapis.com';
  return `${base}/v0/b/${bucketName()}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

export async function savePhoto(path: string, bytes: Uint8Array, contentType: string): Promise<string> {
  const token = randomUUID();
  await bucket().file(path).save(Buffer.from(bytes), {
    resumable: false,
    contentType,
    metadata: { cacheControl: 'public, max-age=31536000, immutable', metadata: { firebaseStorageDownloadTokens: token } },
  });
  return publicUrl(path, token);
}

// Suppression d'une photo de la boutique : seulement sous `produits/`.
export async function deletePhotoFile(path: string) {
  if (!path.startsWith('produits/')) return;
  await bucket().file(path).delete({ ignoreNotFound: true });
}
