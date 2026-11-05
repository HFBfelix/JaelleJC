import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AdminTitle, Card, Message, label } from '@/components/createur/ui';
import { requireAdmin } from '@/server/auth/session';
import { searchClients } from '@/server/createur/clients';

// Onglet Clientes (décision de Jaelle, 2026-11-05) : comptes de la boutique, recherche par e-mail ou par nom.
type Props = { searchParams: Promise<{ q?: string; supprime?: string }> };

const day = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Paris' }).format(new Date(iso)) : '—';

export default async function ClientesPage({ searchParams }: Props) {
  if (!(await requireAdmin())) redirect('/atelier/connexion');
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q.slice(0, 100) : ''; // ?q répété : ignoré
  const { clients, total } = await searchClients(q);
  return (
    <>
      <AdminTitle>Clientes</AdminTitle>
      {params.supprime === '1' && <Message>Le compte a été supprimé. Ses commandes restent conservées, sans lien avec un compte.</Message>}
      <form method="get" className="flex gap-4 items-end mb-8 max-w-xl">
        <label className="flex-1">
          <span className={`${label} block mb-2`}>Rechercher (e-mail ou nom)</span>
          <input name="q" defaultValue={q} maxLength={100}
            className="w-full bg-transparent border-b-[0.5px] border-neutral-400 focus:border-black py-2 outline-none text-[14px]" />
        </label>
        <button type="submit" className="bg-black text-white px-6 py-3 hover:bg-neutral-800">
          <span className="text-[11px] uppercase tracking-[0.12em]">Rechercher</span>
        </button>
      </form>
      <p className={`${label} mb-4`}>{total} compte{total > 1 ? 's' : ''}{total > clients.length ? ` (${clients.length} affichés : précisez la recherche)` : ''}</p>
      <Card className="p-0">
        {clients.length === 0 ? (
          <p className="text-[14px] text-neutral-500 p-6">Aucun compte ne correspond.</p>
        ) : (
          <ul aria-label="Comptes">
            {clients.map((c) => (
              <li key={c.uid} className="border-b-[0.5px] border-neutral-200 last:border-b-0">
                <Link href={`/atelier/clientes/${c.uid}`} className="flex flex-wrap gap-x-6 gap-y-1 items-baseline justify-between px-6 py-4 hover:bg-neutral-50">
                  <span className="text-[14px]">{c.email}{c.name && <span className="text-neutral-500"> · {c.name}</span>}</span>
                  <span className="text-[13px] text-neutral-500">
                    {c.admin ? 'Administratrice · ' : ''}créé le {day(c.createdAt)} · dernière connexion {day(c.lastSignIn)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
