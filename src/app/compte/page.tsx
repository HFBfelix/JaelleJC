import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import AddressBook from '@/components/account/AddressBook';
import DataRights from '@/components/account/DataRights';
import OrdersList from '@/components/account/OrdersList';
import ProfileForm from '@/components/account/ProfileForm';
import AccountView from '@/components/auth/AccountView';
import { AuthPage, SecondaryButton } from '@/components/auth/ui';
import { listAddresses } from '@/server/account/addresses';
import { greetingName, isProfileComplete } from '@/server/account/greeting';
import { loadProfile } from '@/server/account/profile';
import { signOutAction } from '@/server/auth/actions';
import { getSessionUser } from '@/server/auth/session';
import { ordersOf } from '@/server/orders/history';

export const metadata: Metadata = { title: 'Mon compte | Jaelle & JC', robots: { index: false, follow: false } };

export default async function ComptePage() {
  const user = await getSessionUser();
  if (!user) redirect('/connexion?retour=/compte');
  const [orders, addresses, profile] = await Promise.all([ordersOf(user.uid), listAddresses(user.uid), loadProfile(user.uid)]);
  const name = greetingName(profile);
  const complete = isProfileComplete(profile);
  return (
    <AuthPage title="Mon compte">
      {name && <p className="font-serif text-[20px] -mt-8 mb-12">Bonjour {name}</p>}
      {/* Coordonnées incomplètes : « Faisons connaissance » en tête ; ensuite, « Mon profil » avec les identifiants. */}
      {!complete && <ProfileForm profile={profile} email={null} variant="bienvenue" />}
      <OrdersList orders={orders} />
      <AddressBook addresses={addresses} />
      {complete && <ProfileForm profile={profile} email={null} variant="profil" />}
      <AccountView email={user.email} />
      <DataRights />
      <form action={signOutAction}>
        <SecondaryButton type="submit">Se déconnecter</SecondaryButton>
      </form>
    </AuthPage>
  );
}
