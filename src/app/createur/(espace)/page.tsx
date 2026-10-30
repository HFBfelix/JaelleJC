import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, label } from '@/components/createur/ui';
import { requireAdmin } from '@/server/auth/session';
import { todo } from '@/server/createur/site';

// Tableau de bord « À faire » (BACKOFFICE.md §3) : droit admin vérifié à chaque requête.
export default async function CreateurPage() {
  if (!(await requireAdmin())) redirect('/createur/connexion');
  const t = await todo();
  const items = [
    { n: t.toShip, text: 'commande(s) à préparer ou expédier', href: '/createur/commandes' },
    { n: t.lowStock, text: 'variante(s) en ligne avec un stock de 1 ou moins', href: '/createur/stocks' },
    { n: t.unread, text: 'message(s) non lu(s)', href: '/createur/messages' },
    { n: t.drafts, text: 'brouillon(s)', href: '/createur/produits' },
    { n: t.incomplete, text: 'fiche(s) à compléter', href: '/createur/produits' },
  ];
  return (
    <>
      <h1 className="font-serif text-3xl mb-8">Espace créatrice</h1>
      <h2 className={`${label} mb-4`}>À faire</h2>
      <ul className="grid md:grid-cols-2 gap-4">
        {items.map((i) => (
          <li key={i.text}>
            <Link href={i.href} className="block">
              <Card className={`hover:border-black transition-colors ${i.n ? '' : 'opacity-60'}`}>
                <span className="font-serif text-4xl mr-3">{i.n}</span>
                <span className="text-[14px]">{i.text}</span>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
