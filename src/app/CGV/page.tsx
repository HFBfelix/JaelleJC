import type { Metadata } from 'next';

// Rendu et texte repris de legacy/src/pages/legal/TermsOfService.tsx (typographie « Atelier »). Adresse identique à
// l'ancien site (/CGV). Relecture juridique : étape 9.
export const metadata: Metadata = {
  title: 'Conditions générales de vente | Jaelle & JC',
  description: 'Conditions générales de vente et d’utilisation du site jaellejc.com.',
  alternates: { canonical: '/CGV' },
};

const h2 = 'font-sans text-[11px] uppercase tracking-[0.12em] font-bold text-black mb-4';

export default function CgvPage() {
  return (
    <div className="max-w-3xl mx-auto pt-32 pb-20 px-6 font-sans leading-relaxed text-[14px] text-neutral-600 text-justify">
      <h1 className="font-serif text-3xl mb-12 text-black">Conditions générales de vente et d’utilisation</h1>

      <section className="mb-10">
        <h2 className={h2}>Conditions d’utilisation</h2>
        <p className="mb-4">Les présentes conditions sont intégralement régies par la loi française.</p>
        <p className="mb-4">En acceptant les présentes conditions d’utilisation, vous déclarez avoir atteint ou dépassé l’âge de la majorité dans votre région. Vous ne devez en aucune façon utiliser nos produits à des fins illégales ou non autorisées, ni violer des lois de votre juridiction.</p>
      </section>

      <section className="mb-10">
        <h2 className={h2}>Généralités (CGV)</h2>
        <p className="mb-4">Les CGV définissent les droits et obligations des parties dans le cadre de la vente à distance des produits proposés par l’entreprise Jaelle &amp; JC. Toute utilisation du site ou passation d’une commande vaut acceptation des CGV par le client.</p>
        <p>L’entreprise Jaelle &amp; JC se réserve le droit de refuser toute commande à condition de justifier de motifs légitimes (litige antérieur ou suspicion d’insolvabilité).</p>
      </section>

      <section className="mb-10">
        <h2 className={h2}>Responsabilité et force majeure</h2>
        <p className="mb-4">L’entreprise Jaelle &amp; JC ne saurait être tenue responsable des préjudices indirects ou des préjudices de toute nature résultant de l’indisponibilité du site.</p>
        <p>Sont considérés comme cas de force majeure : grèves (annoncées ou non), conditions climatiques difficiles (gel, intempérie), ainsi que tout évènement indépendant de la volonté de l’entreprise rendant impossible l’exécution du contrat.</p>
      </section>
    </div>
  );
}
