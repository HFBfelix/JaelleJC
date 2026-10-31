'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from './ui';

// Dictée de la description libre : le micro enregistre, l'audio part au serveur (route /api/createur/dictee) qui le
// fait transcrire par Mistral, et le texte s'ajoute au champ. L'audio n'est conservé nulle part.
const MAX_SECONDS = 10 * 60; // environ 2,4 Mo à 32 kbit/s, sous la limite d'envoi
const TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

const MESSAGES: Record<string, string> = {
  micro: 'Le micro est refusé. Autorisez-le pour ce site (icône à gauche de l’adresse), puis réessayez.',
  quota: 'Limite de dictées atteinte pour cette heure. Vous pouvez taper le texte, ou utiliser Windows + H.',
  connexion: 'Votre session a expiré. Reconnectez-vous.',
  vide: 'Rien n’a été entendu. Rapprochez-vous du micro et réessayez.',
  erreur: 'La dictée n’a pas pu être transcrite. Réessayez, ou tapez le texte.',
};

type State = 'pret' | 'enregistre' | 'transcrit';

export default function Dictation({ onText, disabled }: { onText: (text: string) => void; disabled?: boolean }) {
  const [state, setState] = useState<State>('pret');
  const [seconds, setSeconds] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Détecté après l'affichage : le rendu serveur ne connaît pas le navigateur.
    const ok = typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
    if (!ok) queueMicrotask(() => setSupported(false));
    return () => {
      if (timer.current) clearInterval(timer.current);
      recorder.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const send = async (blob: Blob) => {
    setState('transcrit');
    try {
      const form = new FormData();
      form.set('audio', blob, 'dictee');
      const r = (await (await fetch('/api/createur/dictee', { method: 'POST', body: form })).json()) as { status: string; text?: string };
      if (r.status === 'ok' && r.text) onText(r.text);
      else setNotice(MESSAGES[r.status === 'ok' ? 'vide' : r.status] ?? MESSAGES.erreur!);
    } catch {
      setNotice(MESSAGES.erreur!);
    }
    setState('pret');
  };

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    if (recorder.current?.state === 'recording') recorder.current.stop();
  };

  const start = async () => {
    setNotice(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setNotice(MESSAGES.micro!);
      return;
    }
    const mimeType = TYPES.find((t) => MediaRecorder.isTypeSupported(t));
    const rec = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 32_000 });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      recorder.current = null;
      void send(new Blob(chunks, { type: rec.mimeType }));
    };
    recorder.current = rec;
    rec.start();
    setSeconds(0);
    setState('enregistre');
    timer.current = setInterval(() => setSeconds((s) => {
      if (s + 1 >= MAX_SECONDS) stop();
      return s + 1;
    }), 1000);
  };

  if (!supported) {
    return <p className="text-[13px] text-neutral-500">Dictée indisponible dans ce navigateur : sous Windows, appuyez sur Windows + H dans le champ.</p>;
  }
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
        {state === 'enregistre' ? (
          <Button variant="secondary" onClick={stop}>Arrêter la dictée</Button>
        ) : (
          <Button variant="secondary" onClick={start} disabled={disabled || state === 'transcrit'}>
            {state === 'transcrit' ? 'Transcription…' : 'Dicter'}
          </Button>
        )}
        {state === 'enregistre' && (
          <span role="status" className="text-[13px] flex items-center gap-2">
            <span aria-hidden className="inline-block w-2 h-2 rounded-full bg-red-700 animate-pulse" /> Enregistrement {clock}
          </span>
        )}
      </div>
      {notice && <p role="status" className="text-[13px] text-red-700 mt-2">{notice}</p>}
    </div>
  );
}
