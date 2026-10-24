// Connexion Admin SDK pour les scripts locaux. Projets acceptés : émulateur (demo-*), test, production.
// La production exige une confirmation explicite : seule Jaelle la donne, à la bascule (étape 10).
// Aucun identifiant n'est lu ni affiché par le script : Google les trouve via GOOGLE_APPLICATION_CREDENTIALS.
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

export const PRODUCTION = 'jaellejc';
export const STAGING = 'jaellejc-staging';
export const PRODUCTION_CONFIRMATION = 'JE-MODIFIE-LA-PRODUCTION';

export function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

export function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

export function connect(project: string | undefined) {
  if (!project) throw new Error('Préciser --project (demo-jaellejc, jaellejc-staging ou jaellejc).');
  const emulator = project.startsWith('demo-');
  if (!emulator && project !== STAGING && project !== PRODUCTION) throw new Error(`Projet inconnu : ${project}`);
  if (project === PRODUCTION && arg('confirmation') !== PRODUCTION_CONFIRMATION) {
    throw new Error(`Production : ajouter --confirmation ${PRODUCTION_CONFIRMATION} (réservé à Jaelle, à la bascule).`);
  }
  if (emulator) {
    process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
    process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
  } else if (process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('FIRESTORE_EMULATOR_HOST est défini : impossible de viser un vrai projet.');
  }
  const app = getApps()[0] ?? initializeApp(emulator ? { projectId: project } : { projectId: project, credential: applicationDefault() });
  return { db: getFirestore(app), auth: getAuth(app), emulator };
}
