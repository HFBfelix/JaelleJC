import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import AccountPage from '@/components/account/AccountPage';
import OrdersList from '@/components/account/OrdersList';
import { getSessionUser } from '@/server/auth/session';
import { ordersOf } from '@/server/orders/history';

export const metadata: Metadata = { title: 'Mes commandes | Jaelle & JC', robots: { index: false, follow: false } };

export default async function CommandesPage() {
  const user = await getSessionUser();
  if (!user) redirect('/connexion?retour=/compte');
  return (
    <AccountPage title="Mes commandes">
      <OrdersList orders={await ordersOf(user.uid)} />
    </AccountPage>
  );
}
