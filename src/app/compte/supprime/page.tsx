import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthPage, Notice } from '@/components/auth/ui';

export const metadata: Metadata = { title: 'Compte supprimé | Jaelle & JC', robots: { index: false, follow: false } };

export default function CompteSupprimePage() {
  return (
    <AuthPage title="Votre compte est supprimé.">
      <Notice>Votre compte, vos adresses et votre sélection ont été effacés. Merci d’avoir fait confiance à notre atelier.</Notice>
      <Link href="/" className="text-[11px] uppercase tracking-[0.12em] border-b-[0.5px] border-black pb-1">
        Retour à l’accueil
      </Link>
    </AuthPage>
  );
}
