import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import SignInForm from '@/components/auth/SignInForm';
import { AuthPage, Notice } from '@/components/auth/ui';
import { firebaseClientConfig } from '@/server/auth/client-config';
import { safeReturn } from '@/server/auth/policy';
import { getSessionUser } from '@/server/auth/session';

export const metadata: Metadata = { title: 'Connexion | Jaelle & JC', robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ retour?: string; info?: string }> };

export default async function ConnexionPage({ searchParams }: Props) {
  const params = await searchParams;
  const retour = safeReturn(params.retour);
  if (await getSessionUser()) redirect(retour);
  const config = firebaseClientConfig();
  return (
    <AuthPage title="Connexion">
      {params.info === 'mot-de-passe' && (
        <Notice>Votre mot de passe est enregistré. Par sécurité, vous avez été déconnectée de tous vos appareils : reconnectez-vous avec ce mot de passe.</Notice>
      )}
      {config ? <SignInForm config={config} retour={retour} /> : <Notice>La connexion est momentanément indisponible.</Notice>}
    </AuthPage>
  );
}
