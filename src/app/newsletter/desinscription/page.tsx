import type { Metadata } from 'next';
import { AuthPage } from '@/components/auth/ui';
import Unsubscribe from '@/components/newsletter/Unsubscribe';

// Lien « se désinscrire » de l'e-mail de la newsletter. La désinscription demande un clic sur la page (un lien seul
// pourrait être ouvert par l'antivirus de la messagerie). Page privée : noindex.
export const metadata: Metadata = { title: 'Désinscription | Jaelle & JC', robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ id?: string; t?: string }> };

export default async function DesinscriptionPage({ searchParams }: Props) {
  const { id = '', t = '' } = await searchParams;
  return (
    <AuthPage title="La lettre Jaelle & JC">
      <Unsubscribe id={id.slice(0, 64)} token={t.slice(0, 48)} />
    </AuthPage>
  );
}
