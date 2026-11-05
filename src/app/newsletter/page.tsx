import type { Metadata } from 'next';
import NewsletterSignup from '@/components/newsletter/NewsletterSignup';

// Rendu repris de legacy/src/pages/NewsletterPage.tsx (typographie « Atelier »). Inscription par le serveur, avec double
// confirmation (2026-11-05). Le préremplissage par `?email=` de l'ancien site n'est pas repris : l'adresse resterait
// dans l'URL (journaux, mesure d'audience) ; aucun lien du site ne l'utilise plus.
export const metadata: Metadata = {
  title: 'La lettre | Jaelle & JC',
  description: 'Inscrivez-vous à la lettre de l’atelier Jaelle & JC pour suivre les prochaines créations et l’histoire de nos matières.',
  alternates: { canonical: '/newsletter' },
};

export default function NewsletterPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6 pt-20">
      <div className="max-w-md w-full text-center">
        <span className="text-[11px] uppercase tracking-[0.12em] text-neutral-400 block mb-1">Newsletter Jaelle &amp; JC</span>
        <h1 className="font-serif text-4xl mb-6">Le Fil de l’Atelier</h1>
        <p className="text-[14px] text-neutral-500 mb-12 leading-relaxed">
          Rejoignez notre cercle restreint pour suivre nos prochaines créations et l’histoire de nos matières.
        </p>
        <NewsletterSignup />
      </div>
    </div>
  );
}
