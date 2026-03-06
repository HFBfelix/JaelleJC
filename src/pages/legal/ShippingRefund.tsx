import React from 'react';

const ShippingRefund = () => (
  <div className="max-w-4xl mx-auto pt-32 pb-20 px-6 font-light leading-relaxed text-[13px] text-neutral-600">
    <h1 className="font-serif text-3xl italic mb-12 text-black">Expédition, Retours et Remboursements</h1>

    {/* SECTION EXPÉDITION */}
    <section className="mb-12">
      <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-black mb-6 border-b pb-2">Politique d'expédition</h2>
      <p className="mb-4 font-medium text-black italic">Livraison offerte à partir de 80 € d'achat !</p>
      <p className="mb-4">
        Après avoir bien pris connaissance de l’ensemble des caractéristiques essentielles des produits commercialisés par l'entreprise Jaelle & JC et des présentes conditions générales de vente listant l’ensemble de ses droits, le client est invité à sélectionner et à préciser à l'entreprise Jaelle & JC sa commande (référence, coloris, quantité…), à lui transmettre l’ensemble des informations utiles à l’exécution de sa commande (coordonnées, adresse de livraison…) puis à régler sa commande en utilisant l’un des moyens de paiements proposés.
      </p>
      <p>
        Les frais d'expédition ne sont pas inclus dans les prix affichés et seront indiqués une fois la sélection du/des produits réalisée, avant l'étape du paiement. Toute mauvaise indication de la part du client peut entraîner des frais supplémentaires.
      </p>
    </section>

    {/* SECTION RETOURS */}
    <section className="mb-12">
      <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-black mb-6 border-b pb-2">Politique de retour</h2>
      <p className="mb-4">
        Le client notifie sa demande de retour et de remboursement à cette adresse email : <strong>contact@jaellejc.com</strong>.
      </p>
      <p className="mb-4">
        Le client bénéficie du droit de se rétracter sans donner de motif dans un délai qui expire 14 jours calendaires après le jour où lui-même, ou un tiers autre que le transporteur et désigné par lui, prend physiquement possession du bien.
      </p>
      <p className="mb-4 italic">Exceptions au droit de rétractation (Article L. 221-28) :</p>
      <ul className="list-disc pl-5 mb-6 space-y-2">
        <li>Biens confectionnés selon les spécifications du consommateur ou nettement personnalisés ;</li>
        <li>Biens susceptibles de se détériorer ou de se périmer rapidement ;</li>
        <li>Biens descellés après livraison (hygiène ou protection de la santé) ;</li>
        <li>Prestations de services d'hébergement, transport de biens, restauration ou loisirs à date déterminée.</li>
      </ul>
      <p className="mb-4">
        Le client est invité à renvoyer le bien à l'entreprise <strong>Jaelle & JC – 10 rue de la libération - 93330 Neuilly-Sur-Marne - France</strong>, au plus tard 14 jours après sa décision de rétractation. Les frais et risques liés au renvoi sont à la charge exclusive du client.
      </p>
      <p className="mb-6">
        Les produits doivent être renvoyés dans leur emballage d’origine et en parfait état de revente (non abîmés, endommagés ou salis), accompagnés de tous les accessoires et de la facture.
      </p>
    </section>

    {/* SECTION REMBOURSEMENT */}
    <section className="mb-12">
      <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-black mb-6 border-b pb-2">Politique de remboursement</h2>
      <p className="mb-4">
        Jaelle & JC remboursera tous les paiements reçus (à l'exception des frais de livraison) une fois le bien réceptionné et vérifié.
      </p>
      <p className="mb-4 italic underline text-black">Destinataire des retours :</p>
      <div className="bg-neutral-50 p-6 mb-6">
        Félix HAMILTON<br />
        Jaelle & JC<br />
        10 rue de la libération<br />
        93330 Neuilly-Sur-Marne<br />
        France
      </div>
      <p>
        Le remboursement sera effectué sous 14 jours calendaires via le même moyen de paiement que celui utilisé lors de la commande.
      </p>
    </section>
  </div>
);

export default ShippingRefund;