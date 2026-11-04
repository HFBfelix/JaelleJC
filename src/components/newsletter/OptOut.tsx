'use client';

import { useState } from 'react';
import { Notice, PrimaryButton } from '@/components/auth/ui';
import { optOutAction } from '@/server/emails/automation-actions';

// « Ne plus recevoir ces messages » (relances de panier, suivi après commande). Même message que le lien soit
// valable ou non. Les e-mails liés à une commande en cours (confirmation, expédition) continuent d'arriver.
export default function OptOut({ emailKey, token }: { emailKey: string; token: string }) {
  const [state, setState] = useState<'idle' | 'pending' | 'done' | 'error'>('idle');

  const onClick = async () => {
    setState('pending');
    try {
      setState((await optOutAction({ e: emailKey, t: token })) === 'ok' ? 'done' : 'error');
    } catch {
      setState('error');
    }
  };

  if (state === 'done') return <Notice>C’est noté : vous ne recevrez plus ces messages. Les e-mails de vos commandes continueront d’arriver.</Notice>;
  return (
    <>
      <p className="text-[14px] mb-8">Vous ne souhaitez plus recevoir nos rappels de sélection ni nos messages après une commande ?</p>
      <PrimaryButton type="button" disabled={state === 'pending'} onClick={onClick}>Ne plus recevoir ces messages</PrimaryButton>
      {state === 'error' && <p role="alert" className="text-[14px] mt-6">Une erreur est survenue. Réessayez dans un instant.</p>}
    </>
  );
}
