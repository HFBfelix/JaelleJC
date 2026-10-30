'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { moveOrderAction, shipOrderAction } from '@/server/createur/orders-actions';
import { Button, Card, Input, Message, label } from './ui';

const MESSAGES: Record<string, string> = {
  connexion: 'Votre session a expiré. Reconnectez-vous.',
  invalide: 'Numéro de suivi invalide (8 à 24 lettres et chiffres, sans espace).',
  statut: 'Cette commande a déjà changé de statut. La page a été rechargée.',
  introuvable: 'Cette commande n’existe plus.',
  erreur: 'Une erreur est survenue. Réessayez.',
};

// Avancement d'une commande : en préparation → expédiée (Colissimo et numéro de suivi recopié) → livrée.
// Remboursement ou annulation : depuis le tableau de bord Stripe pour l'instant.
export default function OrderActions({ orderId, status, tracking }:
  { orderId: string; status: string; tracking: { carrier: string; number: string; url: string } | null }) {
  const router = useRouter();
  const [carrier, setCarrier] = useState<'colissimo' | 'lettre_suivie' | 'autre'>('colissimo');
  const [number, setNumber] = useState('');
  const [url, setUrl] = useState('');
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const call = async (fn: () => Promise<{ status: string }>) => {
    setPending(true);
    setNotice(null);
    try {
      const r = await fn();
      if (r.status !== 'ok') setNotice(MESSAGES[r.status] ?? MESSAGES.erreur!);
      router.refresh();
    } catch {
      setNotice(MESSAGES.erreur!);
    }
    setPending(false);
  };

  const onShip = (e: FormEvent) => {
    e.preventDefault();
    void call(() => shipOrderAction({ orderId, carrier, number: number.replace(/\s/g, ''), ...(carrier === 'autre' ? { url } : {}) }));
  };

  return (
    <Card>
      <h2 className={`${label} mb-4`}>Suivi de la commande</h2>
      {notice && <Message>{notice}</Message>}

      {status === 'paid' && (
        <Button className="w-full mb-6" disabled={pending} onClick={() => call(() => moveOrderAction({ orderId, to: 'preparing' }))}>
          Passer en préparation
        </Button>
      )}

      {(status === 'paid' || status === 'preparing') && (
        <form onSubmit={onShip} aria-label="Expédition">
          <label className="block mb-6">
            <span className={`${label} block mb-2`}>Transporteur</span>
            <select value={carrier} onChange={(e) => setCarrier(e.target.value as typeof carrier)} className="w-full bg-white border-[0.5px] border-neutral-300 p-2 text-[14px]">
              <option value="colissimo">Colissimo</option>
              <option value="lettre_suivie">Lettre suivie</option>
              <option value="autre">Autre transporteur</option>
            </select>
          </label>
          <Input label="Numéro de suivi" value={number} onChange={(e) => setNumber(e.target.value)} required maxLength={30}
            hint="Recopié depuis l’étiquette (ex. 6A12345678901)." />
          {carrier === 'autre' && <Input label="Lien de suivi" type="url" value={url} onChange={(e) => setUrl(e.target.value)} required placeholder="https://…" />}
          <Button type="submit" className="w-full" disabled={pending || !number.trim()}>Marquer comme expédiée</Button>
          <p className="text-[13px] text-neutral-500 mt-3">La cliente voit aussitôt le suivi dans son compte. L’e-mail « colis parti » sera envoyé à partir de l’étape 7bis.</p>
        </form>
      )}

      {tracking && (
        <p className="text-[14px] mb-6">
          {tracking.carrier} · {tracking.url ? <a href={tracking.url} target="_blank" rel="noopener noreferrer" className="border-b-[0.5px] border-black">{tracking.number}</a> : tracking.number}
        </p>
      )}

      {status === 'shipped' && (
        <Button className="w-full" variant="secondary" disabled={pending} onClick={() => call(() => moveOrderAction({ orderId, to: 'delivered' }))}>
          Marquer comme livrée
        </Button>
      )}
      {status === 'delivered' && <p className="text-[14px]">Commande livrée.</p>}
      {(status === 'refunded' || status === 'cancelled') && <p className="text-[14px]">Commande {status === 'refunded' ? 'remboursée' : 'annulée'}.</p>}
      <p className="text-[13px] text-neutral-500 mt-6">Remboursement ou annulation : depuis le tableau de bord Stripe.</p>
    </Card>
  );
}
