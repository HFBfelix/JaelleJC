import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import AccountPage from '@/components/account/AccountPage';
import ProfileForm from '@/components/account/ProfileForm';
import { loadProfile } from '@/server/account/profile';
import { getSessionUser } from '@/server/auth/session';

export const metadata: Metadata = { title: 'Mes coordonnées | Jaelle & JC', robots: { index: false, follow: false } };

export default async function CoordonneesPage() {
  const user = await getSessionUser();
  if (!user) redirect('/connexion?retour=/compte');
  return (
    <AccountPage title="Mes coordonnées">
      <ProfileForm profile={await loadProfile(user.uid)} email={null} variant="profil" />
    </AccountPage>
  );
}
