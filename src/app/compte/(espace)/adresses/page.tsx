import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import AccountPage from '@/components/account/AccountPage';
import AddressBook from '@/components/account/AddressBook';
import { listAddresses } from '@/server/account/addresses';
import { getSessionUser } from '@/server/auth/session';

export const metadata: Metadata = { title: 'Mes adresses | Jaelle & JC', robots: { index: false, follow: false } };

export default async function AdressesPage() {
  const user = await getSessionUser();
  if (!user) redirect('/connexion?retour=/compte');
  return (
    <AccountPage title="Mes adresses">
      <AddressBook addresses={await listAddresses(user.uid)} />
    </AccountPage>
  );
}
