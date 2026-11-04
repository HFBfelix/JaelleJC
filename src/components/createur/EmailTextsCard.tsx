'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { resetEmailTextAction, saveEmailTextAction } from '@/server/emails/text-actions';
import { EMAIL_DEFINITIONS, EMAIL_KINDS, type EmailKind, type EmailTexts } from '@/server/emails/texts';
import { Button, Card, Input, Message, TextArea, label } from './ui';

const isDefault = (kind: EmailKind, t: EmailTexts[EmailKind]) => {
  const d = EMAIL_DEFINITIONS[kind];
  return t.subject === d.defaults.subject && t.title === d.defaults.title && t.body === d.defaults.body && t.personal === (d.personal === true);
};

// Réglages de l'Atelier : objet, titre et texte de chaque e-mail aux clientes ; paragraphe personnalisé par Mistral
// pour les e-mails qui décrivent des pièces. Le reste de l'e-mail (commande, adresse, suivi, liens) ne change pas.
export default function EmailTextsCard({ texts, aiAvailable }: { texts: EmailTexts; aiAvailable: boolean }) {
  const router = useRouter();
  const [kind, setKind] = useState<EmailKind>('confirmation');
  const [draft, setDraft] = useState(texts[kind]);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const def = EMAIL_DEFINITIONS[kind];

  const choose = (next: EmailKind) => {
    setKind(next);
    setDraft(texts[next]);
    setNotice(null);
  };

  const call = async (fn: () => Promise<string>) => {
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
    const r = await saveEmailTextAction({ kind, ...draft });
    if (r.status === 'ok') return 'Enregistré. Les prochains e-mails partiront avec ce texte.';
    if (r.status === 'variables') return `Mot entre accolades inconnu : ${r.names.map((n) => `{${n}}`).join(', ')}.`;
    if (r.status === 'invalide') return 'Objet et titre : une ligne de 150 caractères au plus ; texte : 2 000 caractères au plus. Aucun champ vide.';
    return 'Une erreur est survenue. Réessayez.';
  });

  const reset = () => call(async () => {
    const r = await resetEmailTextAction({ kind });
    if (r.status !== 'ok') return 'Une erreur est survenue. Réessayez.';
    setDraft({ ...def.defaults, personal: def.personal === true });
    return 'Texte d’origine rétabli.';
  });

  return (
    <Card className="mt-8">
      <h2 className={`${label} mb-4`}>Textes des e-mails</h2>
      <p className="text-[14px] text-neutral-600 mb-6">
        Objet, titre et texte de chaque e-mail envoyé aux clientes. Le détail de la commande, l’adresse, le suivi du colis
        et les liens restent ajoutés automatiquement.
      </p>
      <label className="block mb-6">
        <span className={`${label} block mb-2`}>E-mail</span>
        <select value={kind} onChange={(e) => choose(e.target.value as EmailKind)} className="w-full bg-white border-[0.5px] border-neutral-300 p-2 text-[14px]">
          {EMAIL_KINDS.map((k) => (
            <option key={k} value={k}>{EMAIL_DEFINITIONS[k].label}{isDefault(k, texts[k]) ? '' : ' — modifié'}</option>
          ))}
        </select>
      </label>
      <Input label="Objet" value={draft.subject} maxLength={150} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
      <Input label="Titre" value={draft.title} maxLength={150} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
      <TextArea label="Texte" rows={6} value={draft.body} maxLength={2000} onChange={(e) => setDraft({ ...draft, body: e.target.value })}
        hint={`Laissez une ligne vide entre deux paragraphes.${def.vars.length ? ` ${def.vars.map((v) => `{${v}}`).join(', ')} est remplacé à l’envoi.` : ''}`} />
      {def.personal !== null && (
        <label className="flex items-start gap-3 mb-6 text-[14px]">
          <input type="checkbox" checked={draft.personal} onChange={(e) => setDraft({ ...draft, personal: e.target.checked })} className="mt-1 w-4 h-4 accent-black" />
          <span>
            Ajouter un court paragraphe rédigé par Mistral à partir des fiches des pièces, sans aucun fait inventé.
            S’il échoue, le texte part seul.
            {!aiAvailable && <span className="block text-[13px] text-neutral-500 mt-1">Mistral n’est pas branché ici : le texte part seul.</span>}
          </span>
        </label>
      )}
      <div className="flex flex-wrap items-center gap-6">
        <Button disabled={pending} onClick={save}>Enregistrer</Button>
        <Button variant="text" disabled={pending || isDefault(kind, texts[kind])} onClick={reset}>Revenir au texte d’origine</Button>
      </div>
      {notice && <Message>{notice}</Message>}
    </Card>
  );
}
