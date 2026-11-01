import Link from 'next/link';
import { redirect } from 'next/navigation';
import CatalogueBuilder from '@/components/createur/CatalogueBuilder';
import { AdminTitle, label } from '@/components/createur/ui';
import { requireAdmin } from '@/server/auth/session';
import { listCataloguePieces } from '@/server/catalogue/service';
import { aiEnabled } from '@/server/createur/ai';

// Page intermédiaire du catalogue : toutes les pièces (sauf archivées) ; celles en stock sont cochées d'office.
export default async function CataloguePage() {
  if (!(await requireAdmin())) redirect('/atelier/connexion');
  const pieces = await listCataloguePieces();
  return (
    <>
      <Link href="/atelier/produits" className={`${label} hover:text-black`}>← Produits</Link>
      <AdminTitle>Générer un catalogue</AdminTitle>
      <CatalogueBuilder pieces={pieces} aiEnabled={aiEnabled()} />
    </>
  );
}
