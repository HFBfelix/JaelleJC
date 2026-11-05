import type { Metadata } from 'next';
import { readDeliverySettings } from '@/server/cart/repository';
import { formatEuros } from '@/server/catalog/mapping';

// Rendu et texte repris de legacy/src/pages/legal/ShippingRefund.tsx (typographie « Atelier »). Seuil de livraison
// offerte, forfait et délai lus dans les réglages de l'Atelier (l'ancien site écrivait « 40 € » en dur) ; zone de
// livraison : France métropolitaine, Corse comprise (décision de Jaelle, 2026-11-04).
export const metadata: Metadata = {
  title: 'Livraison et retours | Jaelle & JC',
  description: 'Livraison en France métropolitaine, droit de rétractation de 14 jours, retours et remboursements : les conditions de l’atelier Jaelle & JC.',
  alternates: { canonical: '/livraison-et-retours' },
};
export const dynamic = 'force-dynamic'; // réglages relus à chaque visite

const h2 = 'font-sans text-[11px] uppercase tracking-[0.12em] font-bold text-black mb-6 border-b pb-2';

export default async function LivraisonRetoursPage() {
  const delivery = await readDeliverySettings().catch(() => null);
  return (
    <div className="max-w-3xl mx-auto pt-32 pb-20 px-6 font-sans leading-relaxed text-[14px] text-neutral-600 text-justify">
      <h1 className="font-serif text-3xl mb-12 text-black">Expédition, retours et remboursements</h1>

      <section className="mb-12">
        <h2 className={h2}>Politique d’expédition</h2>
        {delivery && delivery.freeThresholdCents > 0 && (
          <p className="mb-4 font-serif text-black text-lg">Livraison offerte à partir de {formatEuros(delivery.freeThresholdCents)} € d’achat.</p>
        )}
        <p className="mb-4">Nous livrons en France métropolitaine uniquement (Corse comprise).</p>
        {delivery?.estimatedDays && <p className="mb-4">Délai de livraison estimé : {delivery.estimatedDays}.</p>}
        <p className="mb-4">
          Après avoir bien pris connaissance de l’ensemble des caractéristiques essentielles des produits commercialisés par l’entreprise Jaelle &amp; JC, le client est invité à transmettre l’ensemble des informations utiles à l’exécution de sa commande (coordonnées, adresse de livraison…). Toute mauvaise indication de la part du client peut entraîner des frais supplémentaires.
        </p>
        <p>
          Les frais d’expédition ne sont pas inclus dans les prix affichés et sont indiqués une fois la sélection du ou des produits réalisée, avant l’étape du paiement
          {delivery && delivery.flatRateCents > 0 ? ` (${formatEuros(delivery.flatRateCents)} € sous le seuil de livraison offerte)` : ''}.
        </p>
      </section>

      <section className="mb-12">
        <h2 className={h2}>Politique de retour</h2>
        <p className="mb-4">Le client notifie sa demande de retour et de remboursement à cette adresse e-mail : <strong>contact@jaellejc.com</strong>.</p>
        <p className="mb-4">Le client bénéficie du droit de se rétracter sans donner de motif dans un délai qui expire 14 jours calendaires après le jour où lui-même, ou un tiers autre que le transporteur, prend physiquement possession du bien.</p>
        <p className="mb-4 font-semibold text-black">Le droit de rétractation ne peut être exercé pour :</p>
        <ul className="list-disc pl-5 mb-6 space-y-2">
          <li>la fourniture de biens confectionnés selon les spécifications du consommateur ou nettement personnalisés ;</li>
          <li>la fourniture de biens susceptibles de se détériorer ou de se périmer rapidement ;</li>
          <li>la fourniture de biens qui ont été descellés par le consommateur après la livraison (hygiène, santé).</li>
        </ul>
        <p className="mb-6">Le client est invité à renvoyer le bien à l’adresse ci-dessous au plus tard 14 jours calendaires après sa décision de rétractation. Les frais et risques liés au renvoi sont à la charge exclusive du client. Les produits doivent être dans leur emballage d’origine et en parfait état de revente.</p>
        <address className="not-italic bg-neutral-50 p-8 border border-neutral-100 font-serif text-lg text-black mb-6">
          Félix HAMILTON — Jaelle &amp; JC<br />
          10 rue de la Libération<br />
          93330 Neuilly-sur-Marne<br />
          France
        </address>
      </section>

      <section>
        <h2 className={h2}>Politique de remboursement</h2>
        <p>L’entreprise Jaelle &amp; JC procède au remboursement dans un délai de 14 jours calendaires après réception et vérification du bien, via le même moyen de paiement que celui utilisé lors de la commande.</p>
      </section>
    </div>
  );
}
