import React from 'react';

const TermsOfService = () => (
  <div className="max-w-4xl mx-auto pt-32 pb-20 px-6 font-light leading-relaxed text-[13px] text-neutral-600">
    <h1 className="font-serif text-3xl italic mb-12 text-black">Conditions Générales de Vente et d’Utilisation</h1>

    <section className="mb-10">
      <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-black mb-4 italic text-center">Conditions d'Utilisation</h2>
      <p className="mb-4">Les présentes conditions sont intégralement régies par la loi française.</p>
      <p className="mb-4">
        En acceptant ces conditions, vous déclarez avoir atteint la majorité dans votre État et nous autorisez à permettre à toute personne mineure à votre charge d'utiliser ce site. L'utilisation de nos produits à des fins illégales ou non autorisées est strictement interdite.
      </p>
    </section>

    <section className="mb-10">
      <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-black mb-4 italic text-center">Généralités (CGV)</h2>
      <p className="mb-4">
        Les CGV définissent les droits et obligations dans le cadre de la vente à distance des produits Jaelle & JC. Toute inscription, utilisation du site ou passation d’une commande vaut acceptation des CGV par le client.
      </p>
      <p className="mb-4">
        Jaelle & JC se réserve le droit de refuser toute commande pour motifs légitimes (litige antérieur ou suspicion d’insolvabilité).
      </p>
    </section>

    <section className="mb-10">
      <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-black mb-4 italic text-center">Produits et Commandes</h2>
      <p className="mb-4">
        Les produits sont décrits le plus précisément possible. Les photographies n’ont pas de valeur contractuelle. Les ventes se font dans la limite des stocks disponibles.
      </p>
      <p className="mb-4">
        Le Client est informé que sa commande implique une obligation de paiement. Un message de confirmation récapitulant les caractéristiques de sa commande lui est alors envoyé par mail.
      </p>
    </section>

    <section className="mb-10">
      <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-black mb-4 italic text-center">Responsabilité et Force Majeure</h2>
      <p className="mb-4">
        L'entreprise Jaelle & JC ne saurait être tenue responsable des préjudices indirects ou résultant de l’indisponibilité du site.
      </p>
      <p>
        Sont considérés comme cas de force majeure : grèves (affectant Jaelle & JC ou ses fournisseurs), lock-out, conditions climatiques difficiles, retard de livraison des transporteurs, et tout évènement indépendant de la volonté de l'entreprise rendant impossible l'exécution du contrat.
      </p>
    </section>
  </div>
);

export default TermsOfService;