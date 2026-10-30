import type { Metadata } from 'next';
import CartPageView from '@/components/cart/CartPageView';
import { listAddresses } from '@/server/account/addresses';
import { isComplete } from '@/server/account/logic';
import { getSessionUser } from '@/server/auth/session';

// Page « Votre sélection » : même panier que le tiroir, lu côté serveur par le layout. Page privée : noindex.
export const metadata: Metadata = {
  title: 'Votre sélection | Jaelle & JC',
  robots: { index: false, follow: false },
};

// Adresses enregistrées et complètes de la cliente connectée : proposées pour préremplir le paiement.
export default async function PanierPage() {
  const user = await getSessionUser();
  const addresses = user
    ? (await listAddresses(user.uid))
      .filter(isComplete)
      .map((a) => ({ id: a.id, summary: `${a.label ? `${a.label} — ` : ''}${a.name}, ${a.line1}, ${a.zipCode} ${a.city}` }))
    : [];
  return <CartPageView addresses={addresses} />;
}
