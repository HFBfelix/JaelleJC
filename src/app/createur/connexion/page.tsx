import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { NOT_ADMIN } from '@/components/auth/SignInForm';
import SignInForm from '@/components/auth/SignInForm';
import { AuthPage, Notice, SecondaryButton } from '@/components/auth/ui';
import { signOutAction } from '@/server/auth/actions';
import { firebaseClientConfig } from '@/server/auth/client-config';
import { getSessionUser, requireAdmin } from '@/server/auth/session';

// Connexion dédiée à l'espace créatrice (BACKOFFICE.md §1) : message clair si le compte n'est pas administrateur.
export const metadata: Metadata = { title: 'Espace créatrice | Jaelle & JC', robots: { index: false, follow: false } };

export default async function CreateurConnexionPage() {
  // Même contrôle que /createur (droit relu sur le compte), sinon les deux pages se renverraient l'une à l'autre.
  const [user, admin] = await Promise.all([getSessionUser(), requireAdmin()]);
  if (admin) redirect('/createur');
  const config = firebaseClientConfig();
  return (
    <AuthPage title="Espace créatrice">
      {user ? (
        <>
          <Notice>{NOT_ADMIN}</Notice>
          <form action={signOutAction}>
            <SecondaryButton type="submit">Se déconnecter</SecondaryButton>
          </form>
        </>
      ) : config ? (
        <SignInForm config={config} retour="/createur" adminOnly />
      ) : (
        <Notice>La connexion est momentanément indisponible.</Notice>
      )}
    </AuthPage>
  );
}
