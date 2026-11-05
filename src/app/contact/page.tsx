import type { Metadata } from 'next';
import { Mail, MapPin } from 'lucide-react';
import ContactForm from '@/components/contact/ContactForm';

// Rendu repris de legacy/src/pages/Contact.tsx (typographie « Atelier » : pas d'italique, rien sous 11 px).
// Le message est écrit par le serveur (src/server/contact/actions.ts), plus par le navigateur.
export const metadata: Metadata = {
  title: 'Contact | Jaelle & JC, atelier d’Île-de-France',
  description: 'Une question sur une création, une commande pour une naissance à venir ? Écrivez à l’atelier Jaelle & JC : nous répondons nous-mêmes, sous 24 à 48 heures.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white pt-32 pb-20 px-6 font-sans antialiased">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-20">
          <span className="text-[11px] uppercase tracking-[0.12em] text-neutral-400 block mb-4">Contact</span>
          <h1 className="font-serif text-5xl text-neutral-800">L’Atelier vous écoute</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-24">
          <div className="space-y-12">
            <p className="font-serif text-lg text-neutral-600 leading-relaxed">
              Pour toute question sur une création, une commande spéciale ou l’histoire de nos matières, notre équipe vous répondra avec soin.
            </p>
            <div className="space-y-8 pt-8 border-t border-neutral-100">
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-400">
                  <Mail size={18} strokeWidth={1} />
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-[0.12em] text-neutral-400 block">Demande par formulaire</span>
                  <p className="text-[11px] tracking-[0.12em] uppercase">Réponse sous 24h-48h</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-400">
                  <MapPin size={18} strokeWidth={1} />
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-[0.12em] text-neutral-400 block">Atelier</span>
                  <p className="text-[11px] tracking-[0.12em] uppercase">Île-de-France, France</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-neutral-50/50 p-10 md:p-16 border border-neutral-100">
            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  );
}
