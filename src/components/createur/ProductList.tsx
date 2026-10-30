'use client';

import { useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { createProductAction } from '@/server/createur/actions';
import type { ProductRow } from '@/server/createur/products';
import { formatEuros } from '@/server/catalog/mapping';
import { Button, Card, Input, Message, StatusBadge, label } from './ui';

const FILTERS = [
  { value: 'tous', label: 'Tous' },
  { value: 'draft', label: 'Brouillons' },
  { value: 'published', label: 'En ligne' },
  { value: 'archived', label: 'Archivés' },
] as const;

// Liste des produits : recherche, filtre par statut, création d'une nouvelle pièce.
export default function ProductList({ rows, categories }: { rows: ProductRow[]; categories: { slug: string; name: string }[] }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['value']>('tous');
  const [name, setName] = useState('');
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => (filter === 'tous' || r.status === filter) && (!q || r.name.toLowerCase().includes(q)));
  }, [rows, query, filter]);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setNotice(null);
    try {
      const result = await createProductAction({ name }); // redirige vers la fiche en cas de succès
      if (result) setNotice(result.status === 'invalide' ? 'Donnez un nom à la pièce.' : 'Une erreur est survenue. Réessayez.');
    } catch (err) {
      if ((err as { digest?: string })?.digest?.startsWith('NEXT_REDIRECT')) throw err;
      setNotice('Une erreur est survenue. Réessayez.');
    }
    setPending(false);
  };

  return (
    <>
      <Card className="mb-8">
        <form onSubmit={onCreate} className="flex flex-col md:flex-row md:items-end gap-4" aria-label="Nouvelle pièce">
          <div className="flex-1"><Input label="Nouvelle pièce" placeholder="Nom de la pièce" value={name} maxLength={120}
            onChange={(e) => setName(e.target.value)} required /></div>
          <Button type="submit" disabled={pending || !name.trim()} className="mb-6">Créer la fiche</Button>
        </form>
        {notice && <Message>{notice}</Message>}
      </Card>

      <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between mb-6">
        <div className="flex gap-4" role="group" aria-label="Filtrer par statut">
          {FILTERS.map((f) => (
            <button key={f.value} type="button" onClick={() => setFilter(f.value)} aria-pressed={filter === f.value}
              className={`text-[11px] uppercase tracking-[0.12em] pb-1 border-b ${filter === f.value ? 'border-black' : 'border-transparent text-neutral-500'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher" aria-label="Rechercher un produit"
          className="bg-transparent border-b-[0.5px] border-neutral-400 focus:border-black py-2 outline-none text-[14px] md:w-64" />
      </div>

      {shown.length === 0 ? (
        <p className="text-[14px] text-neutral-500">Aucun produit.</p>
      ) : (
        <ul className="grid gap-3">
          {shown.map((r) => (
            <li key={r.id}>
              <Link href={`/createur/produits/${r.id}`} className="bg-white border-[0.5px] border-neutral-300 hover:border-black p-3 flex items-center gap-4 transition-colors">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {r.cover ? <img src={r.cover} alt="" className="w-14 h-16 object-cover bg-neutral-100" /> : <span className="w-14 h-16 bg-neutral-100" />}
                <span className="flex-1 min-w-0">
                  <span className={`${label} block`}>{categories.find((c) => c.slug === r.categoryId)?.name ?? 'Sans univers'}</span>
                  <span className="block font-serif text-[18px] truncate">{r.name || 'Sans nom'}</span>
                  <span className="block text-[13px] text-neutral-600">
                    {r.priceCents ? `${formatEuros(r.priceCents)} €` : 'Prix à saisir'} · {r.stock === 0 ? 'Épuisé' : `Stock : ${r.stock}`}
                    {r.missing > 0 && ` · ${r.missing} élément${r.missing > 1 ? 's' : ''} à compléter`}
                  </span>
                </span>
                <StatusBadge status={r.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
