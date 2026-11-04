import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import AccountPage from '@/components/account/AccountPage';
import AccountView from '@/components/auth/AccountView';
import { getSessionUser } from '@/server/auth/session';

export const metadata: Metadata = { title: 'Connexion et sécurité | Jaelle & JC', robots: { index: false, follow: false } };

export default async function SecuritePage() {
  const user = await getSessionUser();
  if (!user) redirect('/connexion?retour=/compte');
  return (
    <AccountPage title="Connexion et sécurité">
      <AccountView email={user.email} />
    </AccountPage>
  );
}
