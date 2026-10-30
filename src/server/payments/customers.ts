// Client Stripe d'un compte : porte l'adresse choisie au panier, que la page de paiement Stripe préremplit
// (toujours modifiable). Son identifiant est gardé dans `stripeCustomers/{uid}` (règles : tout refusé au navigateur).
import 'server-only';
import { Timestamp } from 'firebase-admin/firestore';
import type Stripe from 'stripe';
import { COLLECTIONS, type Adresse } from '../db/schema';
import { adminDb } from '../firebase/admin';
import { getStripe } from './stripe';

const customerRef = (uid: string) => adminDb().collection(COLLECTIONS.stripeCustomers).doc(uid);
const CUSTOMER_ID = /^cus_[A-Za-z0-9]{6,100}$/;
const missing = (e: unknown) => (e as { code?: string })?.code === 'resource_missing';

async function storedCustomerId(uid: string) {
  const id = (await customerRef(uid).get()).get('customerId');
  return typeof id === 'string' && CUSTOMER_ID.test(id) ? id : null;
}

export function customerFields(email: string, a: Adresse): Stripe.CustomerUpdateParams {
  return {
    email,
    name: a.name,
    phone: a.phone || undefined,
    shipping: {
      name: a.name,
      phone: a.phone || undefined,
      address: { line1: a.line1, line2: a.line2 || undefined, postal_code: a.zipCode, city: a.city, country: a.country },
    },
  };
}

export async function customerWithAddress(uid: string, email: string, address: Adresse): Promise<string> {
  const stripe = getStripe();
  const fields = customerFields(email, address);
  const existing = await storedCustomerId(uid);
  if (existing) {
    try {
      await stripe.customers.update(existing, fields);
      return existing;
    } catch (e) {
      if (!missing(e)) throw e; // supprimé chez Stripe entre-temps : un nouveau est créé
    }
  }
  const created = await stripe.customers.create({ ...(fields as Stripe.CustomerCreateParams), metadata: { uid } });
  // Deux « Payer » simultanés : un seul client est gardé, l'autre est supprimé chez Stripe aussitôt
  // (sinon il resterait chez Stripe après la suppression du compte).
  const kept = await adminDb().runTransaction(async (tx) => {
    const current = (await tx.get(customerRef(uid))).get('customerId');
    if (typeof current === 'string' && CUSTOMER_ID.test(current) && current !== existing) return current;
    tx.set(customerRef(uid), { customerId: created.id, createdAt: Timestamp.now() });
    return created.id;
  });
  if (kept !== created.id) {
    await stripe.customers.del(created.id);
    await stripe.customers.update(kept, fields);
  }
  return kept;
}

// Suppression du compte : le client Stripe (nom, e-mail, adresse) est supprimé chez Stripe.
// Les paiements déjà faits restent chez Stripe (obligation comptable), détachés de ce client.
export async function deleteCustomer(uid: string) {
  const id = await storedCustomerId(uid);
  if (id) {
    try {
      await getStripe().customers.del(id);
    } catch (e) {
      if (!missing(e)) throw e;
    }
  }
  await customerRef(uid).delete();
}
