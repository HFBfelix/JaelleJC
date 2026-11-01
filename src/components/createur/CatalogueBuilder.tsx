'use client';

import { useState } from 'react';
import { catalogueTextsAction } from '@/server/catalogue/actions';
import { CATALOGUE_INTRO_MAX, CATALOGUE_TEXT_MAX, STATUS_LABELS, defaultText, type CataloguePiece } from '@/server/catalogue/logic';
import { formatEuros } from '@/server/catalog/mapping';
import { Button, Card, Message, label } from './ui';

const MESSAGES: Record<string, string> = {
  connexion: 'Votre session a expiré. Reconnectez-vous.',
  invalide: 'Vérifiez la sélection et les textes.',
  quota: 'Limite de 10 rédactions par heure atteinte. Vous pouvez générer le catalogue avec les textes actuels.',
  indisponible: 'L’IA ne répond pas pour le moment. Les textes actuels (accroches) restent utilisables.',
  vide: 'Cochez au moins une pièce en stock.',
  erreur: 'Une erreur est survenue. Réessayez.',
};

// Choix des pièces (en stock cochées d'office, décochables ; épuisées non sélectionnables), prix affichés ou non,
// textes proposés par l'IA et relus, puis téléchargement du PDF.
export default function CatalogueBuilder({ pieces, aiEnabled }: { pieces: CataloguePiece[]; aiEnabled: boolean }) {
  const [checked, setChecked] = useState<string[]>(() => pieces.filter((p) => p.totalStock > 0).map((p) => p.id));
  const [showPrices, setShowPrices] = useState(true);
  const [intro, setIntro] = useState('');
  const [texts, setTexts] = useState<Record<string, string>>(() => Object.fromEntries(pieces.map((p) => [p.id, defaultText(p)])));
  const [pending, setPending] = useState<'ia' | 'pdf' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const selected = pieces.filter((p) => checked.includes(p.id));

  const toggle = (id: string) => setChecked((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  const writeWithAi = async () => {
    setPending('ia');
    setNotice(null);
    try {
      const r = await catalogueTextsAction({ ids: checked });
      if (r.status === 'ok') {
        setIntro(r.intro);
        setTexts((t) => ({ ...t, ...r.texts }));
        setNotice('Textes proposés par l’IA : relisez-les et corrigez-les si besoin avant de générer le catalogue.');
      } else setNotice(MESSAGES[r.status] ?? MESSAGES.erreur!);
    } catch {
      setNotice(MESSAGES.erreur!);
    }
    setPending(null);
  };

  const generate = async () => {
    setPending('pdf');
    setNotice(null);
    try {
      const res = await fetch('/api/createur/catalogue', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ids: checked, showPrices, intro, texts: Object.fromEntries(checked.map((id) => [id, texts[id] ?? ''])) }),
      });
      if (!res.ok) {
        const status = ((await res.json().catch(() => ({}))) as { status?: string }).status ?? 'erreur';
        setNotice(MESSAGES[status] ?? MESSAGES.erreur!);
      } else {
        const url = URL.createObjectURL(await res.blob());
        const a = document.createElement('a');
        a.href = url;
        a.download = /filename="([^"]+)"/.exec(res.headers.get('content-disposition') ?? '')?.[1] ?? 'catalogue-jaellejc.pdf';
        a.click();
        URL.revokeObjectURL(url);
        setNotice('Catalogue téléchargé.');
      }
    } catch {
      setNotice(MESSAGES.erreur!);
    }
    setPending(null);
  };

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-8 items-start">
      <div className="space-y-6">
        <Card>
          <h2 className={`${label} mb-2`}>Introduction (facultative)</h2>
          <textarea aria-label="Introduction du catalogue" value={intro} maxLength={CATALOGUE_INTRO_MAX} rows={4} onChange={(e) => setIntro(e.target.value)}
            className="w-full bg-white border-[0.5px] border-neutral-300 focus:border-black p-3 outline-none text-[14px] leading-relaxed" />
        </Card>
        <ul className="space-y-3" aria-label="Pièces du catalogue">
          {pieces.map((p) => {
            const inStock = p.totalStock > 0;
            const on = checked.includes(p.id);
            return (
              <li key={p.id} className={`bg-white border-[0.5px] ${on ? 'border-black' : 'border-neutral-300'} p-4 ${inStock ? '' : 'opacity-50'}`}>
                <label className="flex items-start gap-4 cursor-pointer">
                  <input type="checkbox" checked={on} disabled={!inStock} onChange={() => toggle(p.id)} aria-label={`Inclure ${p.name}`} className="mt-1 w-4 h-4 accent-black" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.cover ? <img src={p.cover} alt="" className="w-14 h-16 object-cover bg-neutral-100" /> : <span className="w-14 h-16 bg-neutral-100" />}
                  <span className="flex-1 min-w-0">
                    <span className={`${label} block`}>{[p.category, p.sku, STATUS_LABELS[p.status]].filter(Boolean).join(' · ')}</span>
                    <span className="block font-serif text-[18px]">{p.name}</span>
                    <span className="block text-[13px] text-neutral-600">
                      {formatEuros(p.priceCents)} € · {inStock ? `${p.totalStock} en stock` : 'Épuisé : non imprimé'}
                    </span>
                  </span>
                </label>
                {on && (
                  <textarea aria-label={`Texte du catalogue : ${p.name}`} value={texts[p.id] ?? ''} maxLength={CATALOGUE_TEXT_MAX} rows={3}
                    onChange={(e) => setTexts((t) => ({ ...t, [p.id]: e.target.value }))}
                    className="mt-3 w-full bg-white border-[0.5px] border-neutral-300 focus:border-black p-3 outline-none text-[14px] leading-relaxed" />
                )}
              </li>
            );
          })}
        </ul>
      </div>
      <aside className="lg:sticky lg:top-32">
        <Card>
          <p className="text-[14px] mb-4">{selected.length} pièce{selected.length > 1 ? 's' : ''} dans le catalogue.</p>
          <label className="flex items-center gap-3 mb-6 cursor-pointer">
            <input type="checkbox" checked={showPrices} onChange={(e) => setShowPrices(e.target.checked)} className="w-4 h-4 accent-black" />
            <span className="text-[14px]">Afficher les prix</span>
          </label>
          {aiEnabled && (
            <Button variant="secondary" className="w-full mb-3" disabled={!!pending || !selected.length} onClick={writeWithAi}>
              {pending === 'ia' ? 'Rédaction…' : 'Rédiger avec l’IA'}
            </Button>
          )}
          <Button className="w-full" disabled={!!pending || !selected.length} onClick={generate}>
            {pending === 'pdf' ? 'Génération…' : 'Générer le PDF'}
          </Button>
          {notice && <Message>{notice}</Message>}
          <p className="text-[13px] text-neutral-500 mt-4">Seules les pièces en stock peuvent être imprimées. Couleurs et tailles : celles encore en stock.</p>
        </Card>
      </aside>
    </div>
  );
}
