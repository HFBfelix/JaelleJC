'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { runAutomationsAction, saveArrivalDaysAction } from '@/server/emails/automation-actions';
import { Button, Card, Input, Message, label } from './ui';

type LastRun = { at: string | null; relances: number; arrivees: number; avis: number; echecs: number } | null;

// Réglages de l'Atelier : envois automatiques (relances de panier J+1/J+3/J+5, « colis arrivé ? », avis à J+14).
// Ils partent seuls chaque matin en production ; le bouton les lance tout de suite (utile sur l'aperçu).
export default function AutomationsCard({ arrivalDays, lastRun }: { arrivalDays: number; lastRun: LastRun }) {
  const router = useRouter();
  const [days, setDays] = useState(String(arrivalDays));
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const call = async (fn: () => Promise<string | null>) => {
    setPending(true);
    setNotice(null);
    try {
      setNotice(await fn());
      router.refresh();
    } catch {
      setNotice('Une erreur est survenue. Réessayez.');
    }
    setPending(false);
  };

  const save = () => call(async () => {
    const r = await saveArrivalDaysAction({ arrivalDays: Number(days) });
    return r.status === 'ok' ? 'Enregistré.' : r.status === 'invalide' ? 'Entre 1 et 30 jours.' : 'Une erreur est survenue. Réessayez.';
  });

  const run = () => call(async () => {
    const r = await runAutomationsAction();
    if (r.status !== 'ok') return 'Une erreur est survenue. Réessayez.';
    return `Envois terminés : ${r.relances} relance(s) de panier, ${r.arrivees} « colis arrivé ? », ${r.avis} demande(s) d’avis${r.echecs ? `, ${r.echecs} échec(s)` : ''}.`;
  });

  return (
    <Card className="mt-8">
      <h2 className={`${label} mb-4`}>E-mails automatiques</h2>
      <p className="text-[14px] text-neutral-600 mb-6">
        Chaque matin : relance d’un panier non payé (clientes avec un compte) à J+1, J+3 et J+5 ; « Votre colis est-il bien
        arrivé ? » après l’expédition ; demande d’avis 14 jours après la livraison. Chaque e-mail permet de ne plus en recevoir.
      </p>
      <div className="flex items-end gap-4 max-w-md">
        <div className="flex-1">
          <Input label="« Colis arrivé ? » : jours après l’expédition" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} />
        </div>
        <Button variant="secondary" className="mb-6" disabled={pending} onClick={save}>Enregistrer</Button>
      </div>
      <Button disabled={pending} onClick={run}>Lancer les envois maintenant</Button>
      {notice && <Message>{notice}</Message>}
      {lastRun?.at && (
        <p className="text-[13px] text-neutral-500 mt-4">
          Dernier passage : {new Date(lastRun.at).toLocaleString('fr-FR')} — {lastRun.relances} relance(s), {lastRun.arrivees} « colis arrivé ? », {lastRun.avis} avis.
        </p>
      )}
    </Card>
  );
}
