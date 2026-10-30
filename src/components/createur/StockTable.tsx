'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { setStockAction } from '@/server/createur/orders-actions';
import type { StockRow } from '@/server/createur/orders';
import { Button, Message, label } from './ui';

const MESSAGES: Record<string, string> = {
  'stock-modifie': 'Une vente a modifié ce stock pendant votre saisie. Le tableau a été rechargé : vérifiez puis recommencez.',
  connexion: 'Votre session a expiré. Reconnectez-vous.',
  invalide: 'Stock invalide (nombre entier de 0 à 9999).',
  introuvable: 'Cette variante n’existe plus.',
  erreur: 'Une erreur est survenue. Réessayez.',
};

// Tableau des stocks : une ligne par variante, enregistrée une à une (stock attendu vérifié côté serveur).
export default function StockTable({ rows }: { rows: StockRow[] }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [lowOnly, setLowOnly] = useState(false);
  const key = (r: StockRow) => `${r.productId}/${r.variantId}`;
  const shown = rows.filter((r) => r.status !== 'archived' && (!lowOnly || (r.active && r.stock <= 1)));

  const save = async (r: StockRow) => {
    const stock = Number(values[key(r)]);
    setPending(key(r));
    setNotice(null);
    try {
      const res = await setStockAction({ productId: r.productId, variantId: r.variantId, stock, expectedStock: r.stock });
      if (res.status === 'ok') setValues((v) => { const next = { ...v }; delete next[key(r)]; return next; });
      else setNotice(MESSAGES[res.status] ?? MESSAGES.erreur!);
      router.refresh();
    } catch {
      setNotice(MESSAGES.erreur!);
    }
    setPending(null);
  };

  return (
    <>
      <label className="flex items-center gap-3 mb-6">
        <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} className="w-4 h-4 accent-black" />
        <span className="text-[14px]">Stocks bas seulement (1 ou moins)</span>
      </label>
      {notice && <Message>{notice}</Message>}
      <div className="bg-white border-[0.5px] border-neutral-300 overflow-x-auto">
        <table className="w-full text-[14px]">
          <thead>
            <tr className={label}>
              <th className="text-left font-normal p-3">Pièce</th><th className="text-left font-normal p-3">Variante</th>
              <th className="text-left font-normal p-3">SKU</th><th className="text-left font-normal p-3">Stock</th><th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const k = key(r);
              const changed = values[k] !== undefined && values[k] !== String(r.stock);
              const name = `${r.productName} ${r.label}`;
              return (
                <tr key={k} className={`border-t-[0.5px] border-neutral-200 ${r.active ? '' : 'text-neutral-400'}`}>
                  <td className="p-3"><Link href={`/createur/produits/${r.productId}`} className="hover:underline">{r.productName || 'Sans nom'}</Link></td>
                  <td className="p-3">{r.label}{r.active ? '' : ' (inactive)'}</td>
                  <td className="p-3 text-neutral-500">{r.sku}</td>
                  <td className="p-3">
                    <input type="number" min={0} max={9999} aria-label={`Stock ${name}`} value={values[k] ?? String(r.stock)}
                      onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value }))}
                      className={`w-20 border-b-[0.5px] bg-transparent ${r.active && r.stock === 0 ? 'border-black' : 'border-neutral-400'}`} />
                  </td>
                  <td className="p-3 text-right">
                    {changed && <Button variant="text" disabled={pending === k} onClick={() => save(r)} aria-label={`Enregistrer le stock ${name}`}>Enregistrer</Button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
