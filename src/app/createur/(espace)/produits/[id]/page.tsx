import { notFound, redirect } from 'next/navigation';
import ProductEditor from '@/components/createur/ProductEditor';
import { requireAdmin } from '@/server/auth/session';
import { loadProductAdmin } from '@/server/createur/products';

type Props = { params: Promise<{ id: string }> };

export default async function FicheProduitPage({ params }: Props) {
  if (!(await requireAdmin())) redirect('/createur/connexion');
  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) notFound();
  const loaded = await loadProductAdmin(id);
  if (!loaded) notFound();
  return (
    <ProductEditor
      product={loaded.product}
      variants={loaded.variants}
      categories={loaded.categories.map((c) => ({ slug: c.slug, name: c.data.name, subs: c.data.subs }))}
      checklist={loaded.checklist}
      aiEnabled={!!process.env.OPENAI_API_KEY}
    />
  );
}
