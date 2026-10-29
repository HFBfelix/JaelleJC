import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import AccountView from '@/components/auth/AccountView';
import { AuthPage } from '@/components/auth/ui';
import { getSessionUser } from '@/server/auth/session';

export const metadata: Metadata = { title: 'Mon compte | Jaelle & JC', robots: { index: false, follow: false } };

export default async function ComptePage() {
  const user = await getSessionUser();
  if (!user) redirect('/connexion?retour=/compte');
  return (
    <AuthPage title="Mon compte">
      <AccountView email={user.email} />
    </AuthPage>
  );
}
