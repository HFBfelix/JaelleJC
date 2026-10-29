import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthPage, Notice, SecondaryButton } from '@/components/auth/ui';
import { signOutAction } from '@/server/auth/actions';
import { requireAdmin } from '@/server/auth/session';

// Espace créatrice : droit `admin` vérifié côté serveur à chaque requête. Contenu construit à l'étape 7.
export const metadata: Metadata = { title: 'Espace créatrice | Jaelle & JC', robots: { index: false, follow: false } };

export default async function CreateurPage() {
  if (!(await requireAdmin())) redirect('/createur/connexion');
  return (
    <AuthPage title="Espace créatrice">
      <Notice>Vous êtes connectée. Le nouvel espace créatrice arrive à l&apos;étape 7 de la refonte.</Notice>
      <form action={signOutAction}>
        <SecondaryButton type="submit">Se déconnecter</SecondaryButton>
      </form>
    </AuthPage>
  );
}
