// Atelier, onglet Clientes : comptes lus avec l'Admin SDK (Authentication + profil Firestore), suppression par la même
// fonction que celle de la cliente (`deleteAccount` : commandes gardées et détachées, client Stripe effacé…).
// Le droit admin, la connexion récente et le mot « SUPPRIMER » sont vérifiés par l'action (`clients-actions.ts`).
import 'server-only';
import { listAddresses } from '../account/addresses';
import { deleteAccount, type DeleteResult } from '../account/data';
import { fullName } from '../account/greeting';
import { loadProfile } from '../account/profile';
import { COLLECTIONS } from '../db/schema';
import { adminAuth, adminDb } from '../firebase/admin';
import { ordersOf } from '../orders/history';
import { SEARCH_RESULTS_MAX, deletionRefusal, matchesClient, type ClientSummary } from './clients-logic';
import { audit } from './products';

const isoOf = (v: string | undefined) => (v ? new Date(v).toISOString() : null);

// Petite boutique : tous les comptes sont lus (par pages de 1 000), puis filtrés ici ; 50 résultats au plus.
export async function searchClients(query: string): Promise<{ clients: ClientSummary[]; total: number }> {
  const names = new Map<string, string>();
  for (const d of (await adminDb().collection(COLLECTIONS.users).get()).docs) {
    names.set(d.id, [d.get('prenom'), d.get('nom') ?? d.get('displayName')].filter(Boolean).join(' '));
  }
  const all: ClientSummary[] = [];
  let pageToken: string | undefined;
  do {
    const page = await adminAuth().listUsers(1000, pageToken);
    for (const u of page.users) {
      all.push({
        uid: u.uid, email: u.email ?? '', name: names.get(u.uid) ?? '', admin: u.customClaims?.admin === true,
        createdAt: isoOf(u.metadata.creationTime), lastSignIn: isoOf(u.metadata.lastSignInTime),
      });
    }
    pageToken = page.pageToken;
  } while (pageToken);
  const found = all.filter((c) => matchesClient(c, query)).sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  return { clients: found.slice(0, SEARCH_RESULTS_MAX), total: found.length };
}

export async function clientDetail(uid: string) {
  const user = await adminAuth().getUser(uid).catch(() => null);
  if (!user) return null;
  const [profile, addresses, orders] = await Promise.all([loadProfile(uid), listAddresses(uid), ordersOf(uid)]);
  return {
    uid, email: user.email ?? '', admin: user.customClaims?.admin === true, disabled: user.disabled,
    createdAt: isoOf(user.metadata.creationTime), lastSignIn: isoOf(user.metadata.lastSignInTime),
    name: fullName(profile), telephone: profile.telephone, addresses, orders,
  };
}

export type DeleteClientResult = DeleteResult | 'admin' | 'introuvable';

export async function deleteClient(adminUid: string, uid: string): Promise<DeleteClientResult> {
  const user = await adminAuth().getUser(uid).catch(() => null);
  if (!user) return 'introuvable';
  if (deletionRefusal({ uid, admin: user.customClaims?.admin === true }, adminUid)) return 'admin';
  const result = await deleteAccount(uid);
  // Journal de l'Atelier : qui, quand, quel compte (identifiant technique, jamais l'e-mail en clair).
  if (result === 'supprime') await audit(adminUid, 'cliente.supprimee', uid);
  return result;
}
