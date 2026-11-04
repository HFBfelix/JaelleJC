import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import AccountPage from '@/components/account/AccountPage';
import DataRights from '@/components/account/DataRights';
import { getSessionUser } from '@/server/auth/session';

// Export et suppression du compte, à part pour qu'on n'y tombe pas par hasard.
export const metadata: Metadata = { title: 'Mes données | Jaelle & JC', robots: { index: false, follow: false } };

export default async function DonneesPage() {
  const user = await getSessionUser();
  if (!user) redirect('/connexion?retour=/compte');
  return (
    <AccountPage title="Mes données">
      <DataRights />
    </AccountPage>
  );
}
