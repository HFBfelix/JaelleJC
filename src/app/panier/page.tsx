import type { Metadata } from 'next';
import CartPageView from '@/components/cart/CartPageView';
import { listAddresses } from '@/server/account/addresses';
import { isProfileComplete, readProfile } from '@/server/account/greeting';
import { isComplete } from '@/server/account/logic';
import { loadProfile } from '@/server/account/profile';
import { getSessionUser } from '@/server/auth/session';
import { addressApi } from '@/server/checkout/address';

// Page « Votre sélection » : même panier que le tiroir, lu côté serveur par le layout. Page privée : noindex.
export const metadata: Metadata = {
  title: 'Votre sélection | Jaelle & JC',
  robots: { index: false, follow: false },
};

// Personne connectée : coordonnées (obligatoires avant le paiement) et adresses enregistrées complètes en France
// métropolitaine, qui préremplissent l'étape « Livraison ». Base Adresse Nationale : suggestions pendant la saisie.
export default async function PanierPage() {
  const user = await getSessionUser();
  const [addresses, profile] = user
    ? await Promise.all([listAddresses(user.uid).then((list) => list.filter(isComplete)), loadProfile(user.uid)])
    : [[], readProfile(undefined)];
  return (
    <CartPageView addresses={addresses} addressApi={addressApi()} profile={profile}
      profileComplete={isProfileComplete(profile)} email={user?.email ?? null} />
  );
}
