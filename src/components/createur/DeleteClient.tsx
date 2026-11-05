'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Button } from '@/components/createur/ui';
import { deleteClientAction, type DeleteClientActionResult } from '@/server/createur/clients-actions';
import { DELETE_WORD } from '@/server/createur/clients-logic';

const MESSAGES: Partial<Record<DeleteClientActionResult, string>> = {
  reconnexion: 'Par sécurité, reconnectez-vous à l’Atelier juste avant de supprimer un compte.',
  'commande-en-cours': 'Une commande de cette cliente est encore en cours : le compte pourra être supprimé après sa livraison.',
  'paiement-en-cours': 'Un paiement vient d’être commencé sur ce compte. Réessayez dans une demi-heure.',
  admin: 'Un compte d’administratrice ne se supprime pas depuis l’Atelier.',
  introuvable: 'Ce compte n’existe plus.',
  limite: 'Trop de suppressions en une heure. Réessayez plus tard.',
  invalide: `Tapez ${DELETE_WORD} en capitales pour confirmer.`,
  connexion: 'Votre session a expiré. Reconnectez-vous.',
  erreur: 'Une erreur est survenue. Réessayez dans un instant.',
};

// Suppression d'un compte (décision de Jaelle, 2026-11-05) : « Êtes-vous sûre ? », puis le mot SUPPRIMER à taper.
// Le serveur revérifie le mot, le droit admin et une connexion de moins de 10 minutes.
export default function DeleteClient({ uid, email }: { uid: string; email: string }) {
  const router = useRouter();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<DeleteClientActionResult | null>(null);
  const close = () => { setStep(0); setResult(null); };

  const onDelete = async (word: string) => {
    setPending(true);
    setResult(null);
    try {
      const r = await deleteClientAction({ uid, word });
      if (r === 'supprime') { router.push('/atelier/clientes?supprime=1'); return; }
      setResult(r);
    } catch {
      setResult('erreur');
    }
    setPending(false);
  };

  return (
    <>
      <Button variant="secondary" onClick={() => setStep(1)}>Supprimer le compte</Button>
      {step === 1 && (
        <ConfirmDialog title="Supprimer le compte" confirmLabel="Oui, continuer" onCancel={close} onConfirm={() => setStep(2)}
          message={<>Êtes-vous sûre de vouloir supprimer le compte <strong className="font-semibold">{email}</strong> ? La suppression est définitive : compte, coordonnées, adresses et panier seront effacés. Les commandes restent conservées pour la comptabilité.</>} />
      )}
      {step === 2 && (
        <ConfirmDialog title="Confirmer la suppression" confirmLabel="Supprimer définitivement" word={DELETE_WORD} pending={pending}
          onCancel={close} onConfirm={onDelete} message={<>Dernière étape pour <strong className="font-semibold">{email}</strong>.</>}>
          {result && result !== 'supprime' && <p role="alert" className="text-[14px] border-l border-black pl-4 mt-6">{MESSAGES[result]}</p>}
          {result === 'reconnexion' && (
            <Link href="/atelier/connexion?info=reconnexion" className="inline-block mt-4 text-[11px] uppercase tracking-[0.12em] border-b-[0.5px] border-black pb-1">
              Me reconnecter
            </Link>
          )}
        </ConfirmDialog>
      )}
    </>
  );
}
