import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import AddressBook from '@/components/account/AddressBook';
import DataRights from '@/components/account/DataRights';
import OrdersList from '@/components/account/OrdersList';
import AccountView from '@/components/auth/AccountView';
import { AuthPage, SecondaryButton } from '@/components/auth/ui';
import { listAddresses } from '@/server/account/addresses';
import { signOutAction } from '@/server/auth/actions';
import { getSessionUser } from '@/server/auth/session';
import { ordersOf } from '@/server/orders/history';

export const metadata: Metadata = { title: 'Mon compte | Jaelle & JC', robots: { index: false, follow: false } };

export default async function ComptePage() {
  const user = await getSessionUser();
  if (!user) redirect('/connexion?retour=/compte');
  const [orders, addresses] = await Promise.all([ordersOf(user.uid), listAddresses(user.uid)]);
  return (
    <AuthPage title="Mon compte">
      <OrdersList orders={orders} />
      <AddressBook addresses={addresses} />
      <AccountView email={user.email} />
      <DataRights />
      <form action={signOutAction}>
        <SecondaryButton type="submit">Se déconnecter</SecondaryButton>
      </form>
    </AuthPage>
  );
}
