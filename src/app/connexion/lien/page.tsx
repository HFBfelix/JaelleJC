import type { Metadata } from 'next';
import FinishLink from '@/components/auth/FinishLink';
import { AuthPage, Notice } from '@/components/auth/ui';
import { firebaseClientConfig } from '@/server/auth/client-config';
import { safeReturn } from '@/server/auth/policy';

// Arrivée depuis le lien reçu par e-mail. L'adresse contient un code à usage unique : jamais indexée.
export const metadata: Metadata = {
  title: 'Connexion | Jaelle & JC',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

type Props = { searchParams: Promise<{ retour?: string }> };

export default async function LienPage({ searchParams }: Props) {
  const retour = safeReturn((await searchParams).retour);
  const config = firebaseClientConfig();
  return (
    <AuthPage title="Connexion">
      {config
        ? <FinishLink config={config} retour={retour} adminOnly={retour === '/createur'} />
        : <Notice>La connexion est momentanément indisponible.</Notice>}
    </AuthPage>
  );
}
