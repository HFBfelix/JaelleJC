import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ACCOUNT_SECTIONS } from '@/components/account/sections';
import AccountPage from '@/components/account/AccountPage';
import { OrderCard } from '@/components/account/OrdersList';
import ProfileForm from '@/components/account/ProfileForm';
import { listAddresses } from '@/server/account/addresses';
import { fullName, greetingName, isProfileComplete } from '@/server/account/greeting';
import { loadProfile } from '@/server/account/profile';
import { signOutAction } from '@/server/auth/actions';
import { getSessionUser } from '@/server/auth/session';
import { nationalPart } from '@/server/checkout/phone';
import { ordersOf } from '@/server/orders/history';
import { featuredOrder } from '@/server/orders/view';

export const metadata: Metadata = { title: 'Mon compte | Jaelle & JC', robots: { index: false, follow: false } };

const label = 'font-sans text-[11px] uppercase tracking-[0.12em] text-neutral-500'; // h2 : Crimson Pro par défaut, pas sous 18 px
const action = 'text-[11px] uppercase tracking-[0.12em] border-b-[0.5px] border-black pb-1';

// Accueil du compte : la commande à suivre d'abord, puis un résumé de chaque thème (ordinateur) ou le menu (mobile).
export default async function ComptePage() {
  const user = await getSessionUser();
  if (!user) redirect('/connexion?retour=/compte');
  const [orders, addresses, profile] = await Promise.all([ordersOf(user.uid), listAddresses(user.uid), loadProfile(user.uid)]);
  const name = greetingName(profile);
  const complete = isProfileComplete(profile);
  const featured = featuredOrder(orders);
  const orderTitle = featured?.current ? 'Commande en cours' : 'Dernière commande';

  return (
    <AccountPage title="Mon compte" back={null}>
      {name && <p className="font-serif text-[20px] -mt-8 mb-12">Bonjour {name}</p>}
      {/* Coordonnées incomplètes : « Faisons connaissance » en tête, jusqu'à ce qu'elles soient remplies. */}
      {!complete && <ProfileForm profile={profile} email={null} variant="bienvenue" />}

      <section className="mb-12" aria-label={orderTitle}>
        <h2 className={`${label} mb-4`}>{orderTitle}</h2>
        {featured ? (
          <>
            <OrderCard order={featured.order} />
            <div className="flex gap-6 mt-4">
              {featured.current && featured.order.tracking?.url && (
                <a href={featured.order.tracking.url} target="_blank" rel="noopener noreferrer" className={action}>Suivre mon colis</a>
              )}
              {orders.length > 1 && <Link href="/compte/commandes" className={action}>Toutes mes commandes</Link>}
            </div>
          </>
        ) : (
          <div className="border-[0.5px] border-dashed border-neutral-200 py-8 text-center">
            <p className="text-[14px] text-neutral-500 mb-4">Aucune commande pour le moment.</p>
            <Link href="/collection" className={action}>Découvrir la collection</Link>
          </div>
        )}
      </section>

      {/* Ordinateur : résumé de chaque thème (le menu est à gauche). */}
      <div className="hidden md:block space-y-4">
        {complete && (
          <Summary title="Mes coordonnées" href="/compte/coordonnees" link="Modifier">
            <p>{fullName(profile)}</p>
            <p className="text-neutral-500">+33 {nationalPart(profile.telephone)}</p>
          </Summary>
        )}
        <Summary title="Mes adresses" href="/compte/adresses" link="Gérer">
          {addresses.length === 0 ? (
            <p className="text-neutral-500">Aucune adresse enregistrée.</p>
          ) : (
            <p>
              {addresses[0]!.label || addresses[0]!.name}
              {addresses.length > 1 && <span className="text-neutral-500"> et {addresses.length - 1} autre{addresses.length > 2 ? 's' : ''}</span>}
            </p>
          )}
        </Summary>
        <Summary title="Connexion et sécurité" href="/compte/securite" link="Gérer">
          <p>{user.email}</p>
        </Summary>
      </div>

      {/* Mobile : le menu en liste, chaque ligne ouvre sa page. */}
      <nav aria-label="Rubriques du compte" className="md:hidden">
        <ul className="border-t-[0.5px] border-neutral-200 mb-10">
          {ACCOUNT_SECTIONS.map((s) => (
            <li key={s.href}>
              <Link href={s.href} className="flex justify-between items-center py-5 border-b-[0.5px] border-neutral-200 text-[11px] uppercase tracking-[0.12em]">
                {s.label}<span aria-hidden className="text-neutral-400">→</span>
              </Link>
            </li>
          ))}
        </ul>
        <form action={signOutAction}>
          <button type="submit" className="text-[11px] uppercase tracking-[0.12em] text-neutral-500 hover:text-black border-b-[0.5px] border-neutral-300 pb-1">
            Se déconnecter
          </button>
        </form>
      </nav>
    </AccountPage>
  );
}

const Summary = ({ title, href, link, children }: { title: string; href: string; link: string; children: ReactNode }) => (
  <section aria-label={title} className="border-[0.5px] border-neutral-200 p-6">
    <div className="flex items-baseline justify-between gap-4 mb-3">
      <h2 className={label}>{title}</h2>
      <Link href={href} className={action} aria-label={`${link} : ${title}`}>{link}</Link>
    </div>
    <div className="text-[14px]">{children}</div>
  </section>
);
