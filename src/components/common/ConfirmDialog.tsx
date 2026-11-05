'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

// Fenêtre de confirmation d'un geste définitif (suppression de compte : cliente et Atelier). Fond blanc, ligne fine,
// angles droits. `word` : mot à taper avant que le bouton s'active (Atelier : « SUPPRIMER ») ; le serveur le revérifie.
// Échap ou « Annuler » ferment la fenêtre, sauf pendant l'action.
export default function ConfirmDialog({ title, message, confirmLabel, cancelLabel = 'Annuler', word, pending = false, onConfirm, onCancel, children }: {
  title: string; message: ReactNode; confirmLabel: string; cancelLabel?: string; word?: string; pending?: boolean;
  onConfirm: (typed: string) => void; onCancel: () => void; children?: ReactNode;
}) {
  const [typed, setTyped] = useState('');
  const titleId = useId();
  const first = useRef<HTMLInputElement & HTMLButtonElement>(null);

  useEffect(() => {
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !pending) onCancel(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel, pending]);

  const ready = !word || typed === word;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 px-6">
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="w-full max-w-md bg-white border-[0.5px] border-black p-8">
        <h2 id={titleId} className="font-sans text-[11px] uppercase tracking-[0.12em] mb-4">{title}</h2>
        <div className="text-[14px] leading-relaxed mb-6">{message}</div>
        {word && (
          <label className="block mb-6">
            <span className="text-[11px] uppercase tracking-[0.12em] text-neutral-500 block mb-2">Tapez {word} pour confirmer</span>
            <input ref={first} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" spellCheck={false}
              className="w-full border-b border-neutral-200 focus:border-black outline-none py-2 text-[14px] bg-transparent" />
          </label>
        )}
        <div className="flex gap-4">
          <button type="button" disabled={pending || !ready} onClick={() => onConfirm(typed)}
            className="flex-1 bg-black text-white py-4 disabled:bg-neutral-200 disabled:cursor-not-allowed">
            <span className="text-[11px] uppercase tracking-[0.12em]">{confirmLabel}</span>
          </button>
          <button type="button" ref={word ? undefined : first} disabled={pending} onClick={onCancel}
            className="flex-1 border-[0.5px] border-black py-4 disabled:opacity-40">
            <span className="text-[11px] uppercase tracking-[0.12em]">{cancelLabel}</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
