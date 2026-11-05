import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import DeleteClient from '@/components/createur/DeleteClient';
import { AdminTitle, Card, label } from '@/components/createur/ui';
import { requireAdmin } from '@/server/auth/session';
import { clientDetail } from '@/server/createur/clients';
import { clientId } from '@/server/createur/clients-logic';
import { formatEuros } from '@/server/catalog/mapping';
import { nationalPart } from '@/server/checkout/phone';

// Fiche d'une cliente dans l'Atelier : compte, coordonnées, adresses, commandes ; suppression du compte.
type Props = { params: Promise<{ uid: string }> };

const day = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' }).format(new Date(iso)) : '—';

export default async function Cliente({ params }: Props) {
  if (!(await requireAdmin())) redirect('/atelier/connexion');
  const id = clientId.safeParse((await params).uid);
  if (!id.success) notFound();
  const c = await clientDetail(id.data);
  if (!c) notFound();
  return (
    <>
      <AdminTitle action={<Link href="/atelier/clientes" className="text-[11px] uppercase tracking-[0.12em] border-b-[0.5px] border-black pb-1">Toutes les clientes</Link>}>
        {c.name || c.email}
      </AdminTitle>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className={`${label} font-sans mb-4`}>Compte</h2>
          <dl className="text-[14px] space-y-2">
            <div><dt className="text-neutral-500 inline">E-mail : </dt><dd className="inline">{c.email}</dd></div>
            <div><dt className="text-neutral-500 inline">Créé le : </dt><dd className="inline">{day(c.createdAt)}</dd></div>
            <div><dt className="text-neutral-500 inline">Dernière connexion : </dt><dd className="inline">{day(c.lastSignIn)}</dd></div>
            {c.name && <div><dt className="text-neutral-500 inline">Nom : </dt><dd className="inline">{c.name}</dd></div>}
            {c.telephone && <div><dt className="text-neutral-500 inline">Téléphone : </dt><dd className="inline">+33 {nationalPart(c.telephone)}</dd></div>}
          </dl>
        </Card>
        <Card>
          <h2 className={`${label} font-sans mb-4`}>Adresses ({c.addresses.length})</h2>
          {c.addresses.length === 0 ? <p className="text-[14px] text-neutral-500">Aucune adresse enregistrée.</p> : (
            <ul className="text-[14px] space-y-3">
              {c.addresses.map((a) => <li key={a.id}>{a.label && <span className="text-neutral-500">{a.label} · </span>}{a.name}, {a.line1}, {a.zipCode} {a.city}</li>)}
            </ul>
          )}
        </Card>
        <Card className="md:col-span-2">
          <h2 className={`${label} font-sans mb-4`}>Commandes ({c.orders.length})</h2>
          {c.orders.length === 0 ? <p className="text-[14px] text-neutral-500">Aucune commande.</p> : (
            <ul className="text-[14px] space-y-2">
              {c.orders.map((o) => (
                <li key={o.id}>
                  <Link href={`/atelier/commandes/${o.id}`} className="border-b-[0.5px] border-neutral-400">{o.reference}</Link>
                  <span className="text-neutral-500"> · {day(o.createdAt?.toISOString() ?? null)} · {o.statusLabel} · {formatEuros(o.amounts.totalCents)} €</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <div className="mt-12">
        {c.admin
          ? <p className="text-[13px] text-neutral-500">Compte d’administratrice : il ne se supprime pas depuis l’Atelier.</p>
          : <DeleteClient uid={c.uid} email={c.email} />}
      </div>
    </>
  );
}
