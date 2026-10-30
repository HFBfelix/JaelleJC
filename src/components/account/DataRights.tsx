'use client';

import { useState } from 'react';
import Link from 'next/link';
import { deleteAccountAction, exportDataAction, type DeleteAccountResult } from '@/server/account/actions';
import { Notice, SecondaryButton, TextButton } from '@/components/auth/ui';

const DELETE_MESSAGES: Record<DeleteAccountResult, string> = {
  reconnexion: 'Par sécurité, reconnectez-vous juste avant de supprimer votre compte.',
  'commande-en-cours': 'Une commande est encore en cours. Votre compte pourra être supprimé après sa livraison ; vous pouvez aussi nous écrire.',
  'paiement-en-cours': 'Un paiement vient d’être commencé. Réessayez dans une demi-heure.',
  invalide: 'Cochez la case pour confirmer la suppression.',
  erreur: 'Une erreur est survenue. Réessayez dans un instant.',
};

// Droits RGPD : export des données (fichier JSON) et suppression du compte.
export default function DataRights() {
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [result, setResult] = useState<DeleteAccountResult | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const onExport = async () => {
    setPending(true);
    setNotice(null);
    try {
      const res = await exportDataAction();
      if (res.ok) {
        const url = URL.createObjectURL(new Blob([res.json], { type: 'application/json' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mes-donnees-jaelle-jc.json';
        a.click();
        URL.revokeObjectURL(url);
      } else {
        setNotice(res.reason === 'connexion' ? 'Votre session a expiré. Reconnectez-vous.' : DELETE_MESSAGES.erreur);
      }
    } catch {
      setNotice(DELETE_MESSAGES.erreur);
    }
    setPending(false);
  };

  const onDelete = async () => {
    setPending(true);
    setResult(null);
    try {
      setResult(await deleteAccountAction({ confirm: confirmed }));
    } catch {
      setResult('erreur');
    }
    setPending(false);
  };

  return (
    <section className="mb-16" aria-labelledby="mes-donnees">
      <h2 id="mes-donnees" className="text-[11px] uppercase tracking-[0.12em] mb-6">Mes données</h2>
      <p className="text-[14px] text-neutral-500 mb-6">Téléchargez tout ce que nous gardons sur vous : compte, adresses, commandes, messages.</p>
      <SecondaryButton type="button" onClick={onExport} disabled={pending}>Télécharger mes données</SecondaryButton>
      {notice && <Notice>{notice}</Notice>}

      <div className="mt-10">
        {!confirming ? (
          <TextButton onClick={() => setConfirming(true)}>Supprimer mon compte</TextButton>
        ) : (
          <div className="border-[0.5px] border-neutral-200 p-6">
            <p className="text-[14px] mb-4">
              Votre compte, vos adresses et votre sélection seront supprimés définitivement. Vos commandes passées restent
              conservées pour notre comptabilité (obligation légale de 10 ans), sans lien avec un compte.
            </p>
            <label className="flex items-start gap-3 mb-6 cursor-pointer">
              <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="w-4 h-4 mt-1 accent-black" />
              <span className="text-[14px]">Je confirme la suppression de mon compte.</span>
            </label>
            <SecondaryButton type="button" onClick={onDelete} disabled={pending || !confirmed}>Supprimer définitivement</SecondaryButton>
            <div className="mt-6 text-center">
              <TextButton disabled={pending} onClick={() => { setConfirming(false); setConfirmed(false); setResult(null); }}>Annuler</TextButton>
            </div>
            {result && <Notice>{DELETE_MESSAGES[result]}</Notice>}
            {result === 'reconnexion' && (
              <Link href="/connexion?retour=/compte&info=reconnexion" className="text-[11px] uppercase tracking-[0.12em] border-b-[0.5px] border-black pb-1">
                Me reconnecter
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
