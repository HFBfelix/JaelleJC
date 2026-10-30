'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { saveCategoryAction } from '@/server/createur/site-actions';
import { Button, Card, Input, Message, TextArea, label } from './ui';

type Category = { slug: string; name: string; order: number; intro: string; subs: { slug: string; name: string }[] };

const MESSAGES: Record<string, string> = {
  ok: 'Enregistré.',
  doublon: 'Ce nom existe déjà, ou une famille retirée est encore utilisée par une pièce.',
  introuvable: 'Cette catégorie n’existe plus.',
  invalide: 'Vérifiez les noms (60 caractères au plus) et l’ordre.',
  connexion: 'Votre session a expiré. Reconnectez-vous.',
  erreur: 'Une erreur est survenue. Réessayez.',
};

// Univers (catégorie) et familles. L'adresse (slug) est figée à la création : pièces et liens y renvoient.
export default function CategoryEditor({ category, nextOrder = 0 }: { category: Category | null; nextOrder?: number }) {
  const router = useRouter();
  const [name, setName] = useState(category?.name ?? '');
  const [order, setOrder] = useState(String(category?.order ?? nextOrder));
  const [intro, setIntro] = useState(category?.intro ?? '');
  const [subs, setSubs] = useState<{ slug?: string; name: string }[]>(category?.subs ?? []);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    try {
      const r = await saveCategoryAction({
        ...(category ? { slug: category.slug } : {}), name, order: Number(order), intro,
        subs: subs.filter((s) => s.name.trim()).map((s) => (s.slug ? { slug: s.slug, name: s.name } : { name: s.name })),
      });
      setNotice(MESSAGES[r.status] ?? MESSAGES.erreur!);
      if (r.status === 'ok') {
        if (!category) { setName(''); setIntro(''); setSubs([]); }
        router.refresh();
      }
    } catch {
      setNotice(MESSAGES.erreur!);
    }
    setPending(false);
  };

  return (
    <Card>
      <form onSubmit={onSubmit} aria-label={category ? `Catégorie ${category.name}` : 'Nouvelle catégorie'}>
        <h2 className={`${label} mb-4`}>{category ? `Univers « ${category.name} » — /collection?category=${category.slug}` : 'Nouvel univers'}</h2>
        <div className="grid md:grid-cols-[1fr_120px] gap-4">
          <Input label="Nom" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} required />
          <Input label="Ordre" type="number" min={0} max={999} value={order} onChange={(e) => setOrder(e.target.value)} />
        </div>
        <TextArea label="Texte d’introduction" rows={3} maxLength={1000} value={intro} onChange={(e) => setIntro(e.target.value)} />
        <span className={`${label} block mb-2`}>Familles</span>
        <ul className="mb-4 space-y-2">
          {subs.map((s, i) => (
            <li key={s.slug ?? `n${i}`} className="flex gap-3 items-center">
              <input aria-label={`Famille ${i + 1}`} value={s.name} maxLength={60}
                onChange={(e) => setSubs(subs.map((x, n) => (n === i ? { ...x, name: e.target.value } : x)))}
                className="flex-1 border-b-[0.5px] border-neutral-400 bg-transparent py-1 text-[14px]" />
              <Button variant="text" onClick={() => setSubs(subs.filter((_, n) => n !== i))}>Retirer</Button>
            </li>
          ))}
        </ul>
        <Button variant="text" onClick={() => setSubs([...subs, { name: '' }])}>Ajouter une famille</Button>
        <div className="mt-6"><Button type="submit" disabled={pending || !name.trim()}>{category ? 'Enregistrer' : 'Créer l’univers'}</Button></div>
        {notice && <Message>{notice}</Message>}
      </form>
    </Card>
  );
}
