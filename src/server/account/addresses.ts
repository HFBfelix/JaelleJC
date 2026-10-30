// Carnet d'adresses (`users/{uid}/adresses`), écrit uniquement par le serveur (Admin SDK, entrées validées).
import 'server-only';
import { ADDRESSES_MAX, COLLECTIONS, adresse, type Adresse } from '../db/schema';
import { adminDb } from '../firebase/admin';
import { addressView, type AddressView } from './logic';

const addresses = (uid: string) => adminDb().collection(COLLECTIONS.users).doc(uid).collection(COLLECTIONS.adresses);

export async function listAddresses(uid: string): Promise<AddressView[]> {
  const snap = await addresses(uid).limit(ADDRESSES_MAX * 2).get();
  return snap.docs.map((d) => addressView(d.id, d.data())).sort((a, b) => (a.label || a.name).localeCompare(b.label || b.name, 'fr'));
}

// Nouvelle adresse : plafond vérifié en transaction. Modification : l'adresse doit exister chez cette cliente.
export async function saveAddress(uid: string, id: string | undefined, data: Omit<Adresse, 'country'>): Promise<'ok' | 'plein' | 'introuvable'> {
  const value: Adresse = { ...data, country: 'FR' };
  const col = addresses(uid);
  return adminDb().runTransaction(async (tx) => {
    if (id) {
      const ref = col.doc(id);
      if (!(await tx.get(ref)).exists) return 'introuvable';
      tx.set(ref, value);
      return 'ok';
    }
    const existing = await tx.get(col.limit(ADDRESSES_MAX));
    if (existing.size >= ADDRESSES_MAX) return 'plein';
    tx.set(col.doc(), value);
    return 'ok';
  });
}

export async function deleteAddress(uid: string, id: string) {
  await addresses(uid).doc(id).delete();
}

// Adresse choisie au paiement : complète et valide, sinon null.
export async function addressFor(uid: string, id: string): Promise<Adresse | null> {
  const snap = await addresses(uid).doc(id).get();
  const parsed = adresse.safeParse(snap.data());
  return parsed.success ? parsed.data : null;
}
