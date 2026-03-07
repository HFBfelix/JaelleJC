import React from 'react';

const TermsOfService = () => (
  <div className="max-w-3xl mx-auto pt-32 pb-20 px-6 font-sans leading-relaxed text-[13px] text-neutral-600 text-justify">
    <h1 className="font-serif text-3xl italic mb-12 text-black">Conditions Générales de Vente et d’Utilisation</h1>

    <section className="mb-10">
      <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-black mb-4 italic">Conditions d'Utilisation</h2>
      <p className="mb-4">Les présentes conditions sont intégralement régies par la loi française.</p>
      <p className="mb-4">En acceptant les présentes conditions d'utilisation, vous déclarez avoir atteint ou dépassé l'âge de la majorité dans votre région. Vous ne devez en aucune façon utiliser nos produits à des fins illégales ou non autorisées, ni violer des lois de votre juridiction.</p>
    </section>

    <section className="mb-10">
      <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-black mb-4 italic">Généralités (CGV)</h2>
      <p className="mb-4">Les CGV définissent les droits et obligations des parties dans le cadre de la vente à distance des produits proposés par l'entreprise Jaelle & JC. Toute utilisation du site ou passation d’une commande vaut acceptation des CGV par le client.</p>
      <p>L'entreprise Jaelle & JC se réserve le droit de refuser toute commande à condition de justifier de motifs légitimes (litige antérieur ou suspicion d’insolvabilité).</p>
    </section>

    <section className="mb-10">
      <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-black mb-4 italic">Responsabilité et Force Majeure</h2>
      <p className="mb-4">L'entreprise Jaelle & JC ne saurait être tenue responsable des préjudices indirects ou des préjudices de toute nature résultant de l’indisponibilité du site.</p>
      <p>Sont considérés comme cas de force majeure : grèves (annoncées ou non), conditions climatiques difficiles (gel, intempérie), ainsi que tout évènement indépendant de la volonté de l'entreprise rendant impossible l'exécution du contrat.</p>
    </section>
  </div>
);

export default TermsOfService;