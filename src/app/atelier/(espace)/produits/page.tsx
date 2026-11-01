import Link from 'next/link';
import { redirect } from 'next/navigation';
import ProductList from '@/components/createur/ProductList';
import { AdminTitle } from '@/components/createur/ui';
import { requireAdmin } from '@/server/auth/session';
import { listCategoriesAdmin, listProductsAdmin } from '@/server/createur/products';

export default async function ProduitsPage() {
  if (!(await requireAdmin())) redirect('/atelier/connexion');
  const [rows, categories] = await Promise.all([listProductsAdmin(), listCategoriesAdmin()]);
  return (
    <>
      <AdminTitle action={
        <div className="flex flex-wrap gap-3">
          {/* Téléchargement direct du tableur (route protégée), pas une page. */}
          <a href="/api/createur/export-produits" download className="border-[0.5px] border-black bg-white px-5 py-3 hover:bg-neutral-50 text-[11px] uppercase tracking-[0.12em]">
            Exporter (Excel)
          </a>
          <Link href="/atelier/produits/catalogue" className="bg-black text-white px-5 py-3 hover:bg-neutral-800 text-[11px] uppercase tracking-[0.12em]">
            Générer un catalogue
          </Link>
        </div>
      }>Produits</AdminTitle>
      <ProductList rows={rows} categories={categories.map((c) => ({ slug: c.slug, name: c.data.name }))} />
    </>
  );
}
