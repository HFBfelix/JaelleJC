'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { saveDeliveryAction, saveSiteAction } from '@/server/createur/site-actions';
import { Button, Card, Input, Message, TextArea, centsToEuros, eurosToCents, label } from './ui';

type Props = {
  delivery: { freeThresholdCents: number; flatRateCents: number; zones: string[]; estimatedDays: string };
  site: { legalName: string; address: string; email: string; instagram: string };
};

const MESSAGES: Record<string, string> = {
  ok: 'Enregistré.',
  invalide: 'Vérifiez la saisie (montants en euros, e-mail, lien Instagram complet).',
  connexion: 'Votre session a expiré. Reconnectez-vous.',
  erreur: 'Une erreur est survenue. Réessayez.',
};

// Réglages : livraison (relue par le serveur à chaque calcul du panier et du paiement) et informations de la maison.
export default function SettingsForms({ delivery, site }: Props) {
  const router = useRouter();
  const [threshold, setThreshold] = useState(centsToEuros(delivery.freeThresholdCents) || '0');
  const [rate, setRate] = useState(centsToEuros(delivery.flatRateCents) || '0');
  const [zones, setZones] = useState(delivery.zones.join('\n'));
  const [days, setDays] = useState(delivery.estimatedDays);
  const [house, setHouse] = useState(site);
  const [notice, setNotice] = useState<{ form: string; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (form: string, fn: () => Promise<{ status: string }>) => {
    setPending(true);
    try {
      const r = await fn();
      setNotice({ form, text: MESSAGES[r.status] ?? MESSAGES.erreur! });
      router.refresh();
    } catch {
      setNotice({ form, text: MESSAGES.erreur! });
    }
    setPending(false);
  };

  const onDelivery = (e: FormEvent) => {
    e.preventDefault();
    const freeThresholdCents = eurosToCents(threshold || '0');
    const flatRateCents = eurosToCents(rate || '0');
    if (freeThresholdCents === null || flatRateCents === null) { setNotice({ form: 'livraison', text: MESSAGES.invalide! }); return; }
    void submit('livraison', () => saveDeliveryAction({
      freeThresholdCents, flatRateCents, zones: zones.split('\n').map((z) => z.trim()).filter(Boolean), estimatedDays: days,
    }));
  };

  return (
    <div className="grid lg:grid-cols-2 gap-8 items-start">
      <Card>
        <form onSubmit={onDelivery} aria-label="Livraison">
          <h2 className={`${label} mb-6`}>Livraison</h2>
          <Input label="Livraison offerte à partir de (€)" inputMode="decimal" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
          <Input label="Frais de livraison (€)" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} />
          <TextArea label="Zones de livraison" rows={2} value={zones} onChange={(e) => setZones(e.target.value)} hint="Une par ligne." />
          <Input label="Délai indicatif" value={days} maxLength={40} onChange={(e) => setDays(e.target.value)} hint="Ex. « 3 à 5 jours ouvrés »." />
          <Button type="submit" disabled={pending}>Enregistrer la livraison</Button>
          {notice?.form === 'livraison' && <Message>{notice.text}</Message>}
          <p className="text-[13px] text-neutral-500 mt-4">Appliqué aussitôt aux paniers et aux paiements. Chaque changement est journalisé.</p>
        </form>
      </Card>
      <Card>
        <form onSubmit={(e) => { e.preventDefault(); void submit('maison', () => saveSiteAction(house)); }} aria-label="La maison">
          <h2 className={`${label} mb-6`}>La maison</h2>
          <Input label="Nom légal" value={house.legalName} maxLength={120} onChange={(e) => setHouse({ ...house, legalName: e.target.value })} />
          <TextArea label="Adresse de l’atelier" rows={2} value={house.address} maxLength={300} onChange={(e) => setHouse({ ...house, address: e.target.value })} />
          <Input label="E-mail de contact" type="email" value={house.email} onChange={(e) => setHouse({ ...house, email: e.target.value })} />
          <Input label="Instagram" type="url" value={house.instagram} placeholder="https://www.instagram.com/…" onChange={(e) => setHouse({ ...house, instagram: e.target.value })} />
          <Button type="submit" disabled={pending}>Enregistrer</Button>
          {notice?.form === 'maison' && <Message>{notice.text}</Message>}
          <p className="text-[13px] text-neutral-500 mt-4">Ces informations alimenteront les données de la marque pour les moteurs de recherche (étape 8).</p>
        </form>
      </Card>
    </div>
  );
}
