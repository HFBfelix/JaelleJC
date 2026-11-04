'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { setModelAction } from '@/server/createur/actions';
import type { ModelMember } from '@/server/createur/products';
import { Button, Card, Message, label, missingText } from './ui';

const STATUS = { draft: 'brouillon', published: 'en ligne', archived: 'archivée' } as const;

// Modèle : une fiche par couleur (décision de Jaelle, 2026-11-04). Les fiches reliées affichent sur le site les
// pastilles des autres couleurs ; chaque pastille mène à la fiche de sa couleur, avec ses photos.
export default function ModelCard({ productId, members, candidates, warnings }:
  { productId: string; members: ModelMember[]; candidates: { id: string; name: string }[]; warnings: string[] }) {
  const router = useRouter();
  const [withId, setWithId] = useState('');
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const linked = new Set(members.map((m) => m.id));

  const call = async (target: string | null) => {
    setPending(true);
    setNotice(null);
    const r = await setModelAction({ productId, withId: target }).catch(() => ({ status: 'erreur' as const }));
    setNotice(r.status === 'ok' ? (target ? 'Fiche reliée au modèle.' : 'Fiche retirée du modèle.') : 'Une erreur est survenue. Réessayez.');
    setWithId('');
    setPending(false);
    router.refresh();
  };

  return (
    <Card>
      <section aria-label="Modèle">
        <h2 className="font-serif text-[22px] mb-2">Modèle</h2>
        <p className="text-[14px] text-neutral-600 mb-6">
          Une fiche par couleur. Reliez ici les fiches d’une même pièce en d’autres couleurs : chacune affichera sur le site les
          pastilles des autres couleurs, qui mènent à leur fiche et à leurs photos.
        </p>
        {warnings.map((w) => <p key={w} className={`text-[13px] ${missingText} mb-4`}>{w}</p>)}
        {members.length > 0 && (
          <ul className="mb-6 space-y-2 text-[14px]">
            {members.map((m) => (
              <li key={m.id}>
                <Link href={`/atelier/produits/${m.id}`} className="border-b-[0.5px] border-neutral-400">{m.name}</Link>
                <span className="text-neutral-500"> — {m.color || 'couleur à indiquer'} · {STATUS[m.status]}</span>
              </li>
            ))}
          </ul>
        )}
        <label className="block mb-4">
          <span className={`${label} block mb-2`}>Même modèle que…</span>
          <select value={withId} onChange={(e) => setWithId(e.target.value)} className="w-full bg-white border-[0.5px] border-neutral-300 p-2 text-[14px]">
            <option value="">Choisir une fiche</option>
            {candidates.filter((c) => !linked.has(c.id)).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-6">
          <Button variant="secondary" disabled={pending || !withId} onClick={() => void call(withId)}>Relier</Button>
          {members.length > 0 && <Button variant="text" disabled={pending} onClick={() => void call(null)}>Retirer cette fiche du modèle</Button>}
        </div>
        {notice && <Message>{notice}</Message>}
      </section>
    </Card>
  );
}
