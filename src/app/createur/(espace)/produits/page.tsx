import { redirect } from 'next/navigation';
import ProductList from '@/components/createur/ProductList';
import { AdminTitle } from '@/components/createur/ui';
import { requireAdmin } from '@/server/auth/session';
import { listCategoriesAdmin, listProductsAdmin } from '@/server/createur/products';

export default async function ProduitsPage() {
  if (!(await requireAdmin())) redirect('/createur/connexion');
  const [rows, categories] = await Promise.all([listProductsAdmin(), listCategoriesAdmin()]);
  return (
    <>
      <AdminTitle>Produits</AdminTitle>
      <ProductList rows={rows} categories={categories.map((c) => ({ slug: c.slug, name: c.data.name }))} />
    </>
  );
}
