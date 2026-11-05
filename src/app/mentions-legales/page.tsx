import type { Metadata } from 'next';
import Link from 'next/link';

// Rendu repris de legacy/src/pages/legal/LegalNotice.tsx (typographie « Atelier »). Hébergement mis à jour : le site
// n'est plus servi par OVHcloud mais par Vercel, les données par Google (Firebase). Éditeur repris tel quel (à
// confirmer par Jaelle, voir reports/qa/etape-8.md).
export const metadata: Metadata = {
  title: 'Mentions légales | Jaelle & JC',
  description: 'Mentions légales du site jaellejc.com : éditeur, hébergement, propriété intellectuelle et données personnelles.',
  alternates: { canonical: '/mentions-legales' },
};

const h2 = 'font-sans text-[11px] uppercase tracking-[0.12em] text-black font-medium mb-4';
const rule = <div className="w-full h-[0.5px] bg-neutral-100" />;

export default function MentionsLegalesPage() {
  return (
    <div className="min-h-screen bg-white pt-32 pb-24 px-6 font-sans antialiased">
      <div className="max-w-2xl mx-auto">
        <span className="text-[11px] uppercase tracking-[0.12em] text-neutral-400 block mb-4">Jaelle &amp; JC</span>
        <h1 className="font-serif text-4xl mb-16">Mentions légales</h1>

        <div className="space-y-12 text-[14px] text-neutral-600 leading-relaxed">
          <section>
            <h2 className={h2}>Éditeur du site</h2>
            <p>Le site jaellejc.com est édité par :</p>
            <p className="mt-2 font-serif text-black text-lg">H-AI.studio</p>
            <p>Responsable : Félix HAMILTON</p>
            <p>SIRET : 51385694800031</p>
            <p>E-mail : contact@h-ai.studio</p>
          </section>
          {rule}
          <section>
            <h2 className={h2}>Hébergement</h2>
            <p>Le site est hébergé par :</p>
            <p className="mt-2 font-medium text-black">Vercel Inc.</p>
            <p>440 N Barranca Ave #4133, Covina, CA 91723, États-Unis</p>
            <p className="mt-4">Les données du site (comptes, commandes, photos des pièces) sont hébergées par :</p>
            <p className="mt-2 font-medium text-black">Google Ireland Limited (Firebase)</p>
            <p>Gordon House, Barrow Street, Dublin 4, Irlande</p>
          </section>
          {rule}
          <section>
            <h2 className={h2}>Propriété intellectuelle</h2>
            <p>
              L’ensemble des contenus présents sur ce site (textes, images, photographies, logos) est la propriété exclusive de
              l’entreprise Jaelle &amp; JC et est protégé par les lois françaises et internationales relatives à la propriété intellectuelle.
            </p>
          </section>
          {rule}
          <section>
            <h2 className={h2}>Données personnelles</h2>
            <p>
              Conformément au RGPD, vous disposez d’un droit d’accès, de rectification et de suppression de vos données. Pour exercer
              ce droit : <a href="mailto:contact@jaellejc.com" className="border-b border-neutral-300 hover:border-black transition-colors">contact@jaellejc.com</a>.
              Le détail des données traitées figure dans la{' '}
              <Link href="/confidentialite" className="border-b border-neutral-300 hover:border-black transition-colors">politique de confidentialité</Link>.
            </p>
          </section>
          <p className="text-[11px] uppercase tracking-[0.12em] text-neutral-300 pt-8">Dernière mise à jour : novembre 2026</p>
        </div>
      </div>
    </div>
  );
}
