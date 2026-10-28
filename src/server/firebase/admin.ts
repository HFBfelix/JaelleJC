// Accès Firestore côté serveur (Admin SDK). Jamais importé par un composant client.
// - Local : émulateur si FIRESTORE_EMULATOR_HOST est défini (projet fictif demo-jaellejc).
// - Aperçus Vercel et production : FIREBASE_SERVICE_ACCOUNT (JSON du compte de service, variable secrète
//   limitée à son environnement Vercel : test pour « Preview », production pour « Production »).
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let db: Firestore | null = null;

function app(): App {
  const existing = getApps()[0];
  if (existing) return existing;
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    return initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID ?? 'demo-jaellejc' });
  }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('Base indisponible : FIREBASE_SERVICE_ACCOUNT non configuré.');
  const account = JSON.parse(raw) as { project_id: string; client_email: string; private_key: string };
  return initializeApp({
    credential: cert({ projectId: account.project_id, clientEmail: account.client_email, privateKey: account.private_key }),
    projectId: account.project_id,
  });
}

export function adminDb(): Firestore {
  db ??= getFirestore(app());
  return db;
}
