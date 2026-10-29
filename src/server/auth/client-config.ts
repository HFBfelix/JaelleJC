// Configuration Firebase du navigateur (publique par nature), lue à l'exécution et transmise aux pages
// de connexion : un même site construit sert l'émulateur en local et le vrai projet sur Vercel.
import 'server-only';
import type { FirebaseClientConfig } from '@/lib/firebase-auth';

// Accès par crochets : la valeur est lue à l'exécution, pas figée à la construction.
const env = (name: string) => process.env[name]?.trim() || null;

export function firebaseClientConfig(): FirebaseClientConfig | null {
  const emulatorHost = env('FIREBASE_AUTH_EMULATOR_HOST');
  if (emulatorHost) {
    // Émulateur : seulement en local (même garde que l'Admin SDK, src/server/firebase/admin.ts).
    if (env('VERCEL_ENV') || !env('FIRESTORE_EMULATOR_HOST')) return null;
    return { apiKey: 'demo-key', authDomain: 'localhost', projectId: env('FIREBASE_PROJECT_ID') ?? 'demo-jaellejc', emulatorHost };
  }
  const apiKey = env('NEXT_PUBLIC_FIREBASE_API_KEY');
  const authDomain = env('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
  const projectId = env('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  return apiKey && authDomain && projectId ? { apiKey, authDomain, projectId, emulatorHost: null } : null;
}
