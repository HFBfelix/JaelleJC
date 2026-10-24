// Connexion Admin SDK pour les scripts locaux. Projets acceptés : émulateur (demo-*), test, production.
// La production exige une confirmation explicite : seule Jaelle la donne, à la bascule (étape 10).
// Aucun identifiant n'est lu ni affiché par le script : Google les trouve via GOOGLE_APPLICATION_CREDENTIALS.
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { existsSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

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

// Protection de la clé du compte technique (reports/suivi.md, « Compte technique scripts-test ») :
// elle doit exister, être hors du dossier du code (jamais dans git) et hors de OneDrive (jamais copiée
// dans le cloud). Son contenu n'est jamais lu ni affiché ici : seul son emplacement est vérifié.
export function checkKeyLocation(keyPath: string | undefined): void {
  if (!keyPath) throw new Error('GOOGLE_APPLICATION_CREDENTIALS non défini : chemin de la clé du compte technique attendu.');
  const full = resolve(keyPath).toLowerCase();
  const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..').toLowerCase();
  if (full.startsWith(repo + sep) || full === repo) throw new Error('La clé ne doit jamais se trouver dans le dossier du code.');
  if (/[\\/]onedrive[^\\/]*[\\/]/i.test(full)) throw new Error('La clé ne doit pas se trouver dans OneDrive (synchronisé dans le cloud).');
  if (!existsSync(keyPath)) throw new Error('Fichier de clé introuvable à l’emplacement indiqué.');
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
  } else {
    checkKeyLocation(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  }
  const app = getApps()[0] ?? initializeApp(emulator ? { projectId: project } : { projectId: project, credential: applicationDefault() });
  return { db: getFirestore(app), auth: getAuth(app), emulator };
}
