import React from 'react';

const ShippingRefund = () => (
  <div className="max-w-3xl mx-auto pt-32 pb-20 px-6 font-sans leading-relaxed text-[13px] text-neutral-600 text-justify">
    <h1 className="font-serif text-3xl italic mb-12 text-black">Expédition, Retours et Remboursements</h1>

    <section className="mb-12">
      <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-black mb-6 border-b pb-2 italic">Politique d'expédition</h2>
      <p className="mb-4 font-serif italic text-black text-lg">Livraison offerte à partir de 40 € d'achat !</p>
      <p className="mb-4">
        Après avoir bien pris connaissance de l’ensemble des caractéristiques essentielles des produits commercialisés par l'entreprise Jaelle & JC, le client est invité à transmettre l’ensemble des informations utiles à l’exécution de sa commande (coordonnées, adresse de livraison…). Toute mauvaise indication de la part du client peut entraîner des frais supplémentaires.
      </p>
      <p>Les frais d'expédition ne sont pas inclus dans les prix affichés et seront indiqués une fois la sélection du/des produits réalisée, avant l'étape du paiement.</p>
    </section>

    <section className="mb-12">
      <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-black mb-6 border-b pb-2 italic">Politique de retour</h2>
      <p className="mb-4">Le client notifie sa demande de retour et de remboursement à cette adresse email : <strong>contact@jaellejc.com</strong>.</p>
      <p className="mb-4">Le client bénéficie du droit de se rétracter sans donner de motif dans un délai qui expire 14 jours calendaires après le jour où lui-même, ou un tiers autre que le transporteur, prend physiquement possession du bien.</p>
      <p className="mb-4 italic font-semibold text-black">Le droit de rétractation ne peut être exercé pour :</p>
      <ul className="list-disc pl-5 mb-6 space-y-2">
        <li>La fourniture de biens confectionnés selon les spécifications du consommateur ou nettement personnalisés ;</li>
        <li>La fourniture de biens susceptibles de se détériorer ou de se périmer rapidement ;</li>
        <li>La fourniture de biens qui ont été descellés par le consommateur après la livraison (hygiène/santé).</li>
      </ul>
      <p className="mb-6">Le client est invité à renvoyer le bien à l'adresse ci-dessous au plus tard 14 jours calendaires après sa décision de rétractation. Les frais et risques liés au renvoi sont à la charge exclusive du client. Les produits doivent être dans leur emballage d’origine et en parfait état de revente.</p>
      
      <div className="bg-neutral-50 p-8 border border-neutral-100 font-serif italic text-black mb-6">
        Félix HAMILTON — Jaelle & JC<br />
        10 rue de la libération<br />
        93330 Neuilly-Sur-Marne<br />
        France
      </div>
    </section>

    <section>
      <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-black mb-6 border-b pb-2 italic">Politique de remboursement</h2>
      <p>L'entreprise Jaelle & JC procédera au remboursement dans un délai de 14 jours calendaires après réception et vérification du bien, via le même moyen de paiement que celui utilisé lors de la commande.</p>
    </section>
  </div>
);

export default ShippingRefund;