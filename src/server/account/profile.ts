// Profil de la personne (civilité, prénom, nom) dans `users/{uid}`, écrit par le serveur seulement (les règles
// refusent ces champs au navigateur). Lu par « Mon compte » et par les e-mails (salutation).
import 'server-only';
import { FieldValue } from 'firebase-admin/firestore';
import { COLLECTIONS } from '../db/schema';
import { adminDb } from '../firebase/admin';
import { greetingName, readProfile, type Profile, type ProfileInput } from './greeting';

const ref = (uid: string) => adminDb().collection(COLLECTIONS.users).doc(uid);

export async function loadProfile(uid: string): Promise<Profile> {
  return readProfile((await ref(uid).get()).data());
}

export async function saveProfile(uid: string, input: ProfileInput): Promise<void> {
  await ref(uid).set({
    civilite: input.civilite, prenom: input.prenom, nom: input.nom, updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

// Nom de la salutation des e-mails ; compte absent, supprimé ou illisible : null (« Bonjour, »), jamais d'erreur.
export async function greetingFor(uid: string | null | undefined): Promise<string | null> {
  if (!uid) return null;
  try {
    return greetingName(await loadProfile(uid));
  } catch {
    console.error('profil : salutation indisponible, « Bonjour, » seul');
    return null;
  }
}
