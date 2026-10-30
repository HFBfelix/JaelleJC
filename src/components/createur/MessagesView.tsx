'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { exportAction, markReadAction } from '@/server/createur/site-actions';
import { Button, Card, Message, label } from './ui';

type Msg = { id: string; name: string; email: string; subject: string; message: string; status: string; createdAt: string | null };

const date = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Paris' }).format(new Date(iso)) : '';

// Messages du formulaire de contact (lecture, « lu ») et export CSV des messages et des inscrits à la newsletter.
export default function MessagesView({ messages, newsletterCount }: { messages: Msg[]; newsletterCount: number }) {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const download = async (what: 'messages' | 'newsletter') => {
    setPending(true);
    setNotice(null);
    try {
      const r = await exportAction({ what });
      if (r.status === 'ok' && 'csv' in r) {
        const url = URL.createObjectURL(new Blob(['﻿', r.csv], { type: 'text/csv;charset=utf-8' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `${what}-jaelle-jc.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else setNotice('Export impossible. Réessayez.');
    } catch {
      setNotice('Export impossible. Réessayez.');
    }
    setPending(false);
  };

  const read = async (id: string) => {
    await markReadAction({ id }).catch(() => null);
    router.refresh();
  };

  return (
    <>
      <div className="flex flex-wrap gap-4 mb-8">
        <Button variant="secondary" disabled={pending} onClick={() => download('messages')}>Exporter les messages</Button>
        <Button variant="secondary" disabled={pending} onClick={() => download('newsletter')}>Exporter la newsletter ({newsletterCount})</Button>
      </div>
      {notice && <Message>{notice}</Message>}
      {messages.length === 0 ? <p className="text-[14px] text-neutral-500">Aucun message.</p> : (
        <ul className="grid gap-4">
          {messages.map((m) => (
            <li key={m.id}>
              <Card className={m.status === 'unread' ? 'border-black' : ''}>
                <p className={`${label} mb-2`}>{m.status === 'unread' ? 'Non lu · ' : ''}{date(m.createdAt)}</p>
                <p className="text-[14px] mb-1"><strong className="font-semibold">{m.name || 'Sans nom'}</strong> · <a href={`mailto:${m.email}`} className="border-b-[0.5px] border-black">{m.email}</a></p>
                {m.subject && <p className="text-[14px] mb-2">{m.subject}</p>}
                <p className="text-[14px] leading-relaxed whitespace-pre-line text-neutral-700">{m.message}</p>
                {m.status === 'unread' && <Button variant="text" className="mt-4" onClick={() => read(m.id)}>Marquer comme lu</Button>}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
