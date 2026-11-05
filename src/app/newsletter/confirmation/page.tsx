import type { Metadata } from 'next';
import { AuthPage } from '@/components/auth/ui';
import ConfirmSubscription from '@/components/newsletter/ConfirmSubscription';

// Lien « Confirmer mon inscription » de l'e-mail de la newsletter. La confirmation demande un clic sur la page (un lien
// seul pourrait être ouvert par l'antivirus de la messagerie et confirmer à la place de la personne). Page privée : noindex.
export const metadata: Metadata = { title: 'Confirmation | Jaelle & JC', robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ id?: string; t?: string }> };

export default async function ConfirmationPage({ searchParams }: Props) {
  const { id = '', t = '' } = await searchParams;
  return (
    <AuthPage title="La lettre Jaelle & JC">
      <ConfirmSubscription id={id.slice(0, 64)} token={t.slice(0, 48)} />
    </AuthPage>
  );
}
