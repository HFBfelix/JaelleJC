'use client';

import { useState } from 'react';
import Link from 'next/link';
import { deleteAccountAction, exportDataAction, type DeleteAccountResult } from '@/server/account/actions';
import { Notice, SecondaryButton, TextButton } from '@/components/auth/ui';
import ConfirmDialog from '@/components/common/ConfirmDialog';

const DELETE_MESSAGES: Record<DeleteAccountResult, string> = {
  reconnexion: 'Par sécurité, reconnectez-vous juste avant de supprimer votre compte.',
  'commande-en-cours': 'Une commande est encore en cours. Votre compte pourra être supprimé après sa livraison ; vous pouvez aussi nous écrire.',
  'paiement-en-cours': 'Un paiement vient d’être commencé. Réessayez dans une demi-heure.',
  admin: 'Ce compte donne accès à l’Atelier : il ne peut pas être supprimé d’ici.',
  invalide: 'Une erreur est survenue. Réessayez dans un instant.',
  erreur: 'Une erreur est survenue. Réessayez dans un instant.',
};

// Droits RGPD : export des données (fichier JSON) et suppression du compte. Suppression (décision de Jaelle,
// 2026-11-05) : lien discret tout en bas, puis une confirmation simple « OK » ; le serveur exige toujours une
// connexion récente et refuse tant qu'une commande est en cours.
export default function DataRights() {
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [result, setResult] = useState<DeleteAccountResult | null>(null);
  const [confirming, setConfirming] = useState(false);

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
      setResult(await deleteAccountAction({ confirm: true })); // réussite : redirection vers /compte/supprime
    } catch {
      setResult('erreur');
    }
    setPending(false);
  };

  return (
    <section className="mb-16" aria-label="Mes données">
      <p className="text-[14px] text-neutral-500 mb-6">Téléchargez tout ce que nous gardons sur vous : compte, adresses, commandes, messages.</p>
      <SecondaryButton type="button" onClick={onExport} disabled={pending}>Télécharger mes données</SecondaryButton>
      {notice && <Notice>{notice}</Notice>}

      <div className="mt-24">
        <TextButton onClick={() => { setResult(null); setConfirming(true); }}>Supprimer mon compte</TextButton>
      </div>
      {confirming && (
        <ConfirmDialog
          title="Supprimer mon compte"
          message={<>Votre compte sera supprimé définitivement. Vos commandes passées restent conservées pour notre comptabilité (obligation légale de 10 ans), sans lien avec un compte.</>}
          confirmLabel="OK" pending={pending} onConfirm={onDelete} onCancel={() => { setConfirming(false); setResult(null); }}>
          {result && <Notice>{DELETE_MESSAGES[result]}</Notice>}
          {result === 'reconnexion' && (
            <Link href="/connexion?retour=/compte/donnees&info=reconnexion" className="text-[11px] uppercase tracking-[0.12em] border-b-[0.5px] border-black pb-1">
              Me reconnecter
            </Link>
          )}
        </ConfirmDialog>
      )}
    </section>
  );
}
