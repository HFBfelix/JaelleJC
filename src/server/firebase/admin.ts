// Accès Firestore côté serveur (Admin SDK). Jamais importé par un composant client (`server-only`).
// - Local : émulateur si FIRESTORE_EMULATOR_HOST est défini (projet fictif demo-jaellejc).
// - Aperçus Vercel et production : FIREBASE_SERVICE_ACCOUNT (JSON du compte de service, variable secrète
//   limitée à son environnement Vercel : test pour « Preview », production pour « Production »).
import 'server-only';
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { z } from 'zod';

let db: Firestore | null = null;

const serviceAccount = z.object({
  project_id: z.string().min(1),
  client_email: z.string().email(),
  private_key: z.string().min(1),
});

function readServiceAccount(raw: string) {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    // Jamais l'erreur d'origine : elle peut recopier un extrait de la clé dans les journaux.
    throw new Error('FIREBASE_SERVICE_ACCOUNT illisible (JSON attendu).');
  }
  const parsed = serviceAccount.safeParse(json);
  if (!parsed.success) throw new Error('FIREBASE_SERVICE_ACCOUNT incomplet (project_id, client_email, private_key).');
  return parsed.data;
}

function app(): App {
  const existing = getApps()[0];
  if (existing) return existing;
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    // Sur Vercel, un émulateur n'a aucun sens : refus net plutôt qu'une lecture silencieuse de mauvaises données.
    if (process.env.VERCEL_ENV) throw new Error('FIRESTORE_EMULATOR_HOST ne doit pas être défini sur Vercel.');
    return initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID ?? 'demo-jaellejc' });
  }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('Base indisponible : FIREBASE_SERVICE_ACCOUNT non configuré.');
  const account = readServiceAccount(raw);
  return initializeApp({
    credential: cert({ projectId: account.project_id, clientEmail: account.client_email, privateKey: account.private_key }),
    projectId: account.project_id,
  });
}

export function adminDb(): Firestore {
  db ??= getFirestore(app());
  return db;
}
