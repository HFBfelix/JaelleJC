import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { NOT_ADMIN } from '@/components/auth/SignInForm';
import SignInForm from '@/components/auth/SignInForm';
import { AuthPage, Notice, SecondaryButton } from '@/components/auth/ui';
import { signOutAction } from '@/server/auth/actions';
import { firebaseClientConfig } from '@/server/auth/client-config';
import { getSessionUser, requireAdmin } from '@/server/auth/session';

// Connexion dédiée à l'espace créatrice (BACKOFFICE.md §1) : message clair si le compte n'est pas administrateur.
export const metadata: Metadata = { title: 'Atelier | Jaelle & JC', robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ info?: string }> };

export default async function CreateurConnexionPage({ searchParams }: Props) {
  // Même contrôle que /atelier (droit relu sur le compte), sinon les deux pages se renverraient l'une à l'autre.
  // Exception : reconnexion demandée avant un geste sensible (suppression d'un compte, 2026-11-05).
  const [user, admin] = await Promise.all([getSessionUser(), requireAdmin()]);
  const reauth = (await searchParams).info === 'reconnexion' && !!admin;
  if (admin && !reauth) redirect('/atelier');
  const config = firebaseClientConfig();
  return (
    <AuthPage title="Atelier">
      {reauth && <Notice>Par sécurité, reconnectez-vous pour confirmer cette action.</Notice>}
      {reauth ? (
        config ? <SignInForm config={config} retour="/atelier" adminOnly /> : <Notice>La connexion est momentanément indisponible.</Notice>
      ) : user ? (
        <>
          <Notice>{NOT_ADMIN}</Notice>
          <form action={signOutAction}>
            <SecondaryButton type="submit">Se déconnecter</SecondaryButton>
          </form>
        </>
      ) : config ? (
        <SignInForm config={config} retour="/atelier" adminOnly />
      ) : (
        <Notice>La connexion est momentanément indisponible.</Notice>
      )}
    </AuthPage>
  );
}
