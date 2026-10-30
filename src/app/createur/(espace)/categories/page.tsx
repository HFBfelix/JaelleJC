import { redirect } from 'next/navigation';
import CategoryEditor from '@/components/createur/CategoryEditor';
import { AdminTitle } from '@/components/createur/ui';
import { requireAdmin } from '@/server/auth/session';
import { listCategoriesAdmin } from '@/server/createur/site';

export default async function CategoriesPage() {
  if (!(await requireAdmin())) redirect('/createur/connexion');
  const categories = await listCategoriesAdmin();
  return (
    <>
      <AdminTitle>Catégories</AdminTitle>
      <div className="grid gap-6">
        {categories.map((c) => <CategoryEditor key={c.slug} category={{ slug: c.slug, ...c.data }} />)}
        <CategoryEditor category={null} nextOrder={categories.length} />
      </div>
    </>
  );
}
