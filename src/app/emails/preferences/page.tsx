import type { Metadata } from 'next';
import { AuthPage } from '@/components/auth/ui';
import OptOut from '@/components/newsletter/OptOut';

// Lien « ne plus recevoir ces messages » des relances de panier et du suivi après commande. Un clic sur la page est
// demandé (un lien seul pourrait être ouvert par l'antivirus de la messagerie). Page privée : noindex.
export const metadata: Metadata = { title: 'Vos e-mails | Jaelle & JC', robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ e?: string; t?: string }> };

export default async function PreferencesPage({ searchParams }: Props) {
  const { e = '', t = '' } = await searchParams;
  return (
    <AuthPage title="Vos e-mails">
      <OptOut emailKey={e.slice(0, 64)} token={t.slice(0, 48)} />
    </AuthPage>
  );
}
