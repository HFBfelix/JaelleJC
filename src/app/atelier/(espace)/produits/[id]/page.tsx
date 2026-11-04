import { notFound, redirect } from 'next/navigation';
import ModelCard from '@/components/createur/ModelCard';
import ProductEditor from '@/components/createur/ProductEditor';
import { requireAdmin } from '@/server/auth/session';
import { aiEnabled } from '@/server/createur/ai';
import { colorWarnings } from '@/server/createur/logic';
import { listModelCandidates, listModelMembers, loadProductAdmin } from '@/server/createur/products';

type Props = { params: Promise<{ id: string }> };

export default async function FicheProduitPage({ params }: Props) {
  if (!(await requireAdmin())) redirect('/atelier/connexion');
  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) notFound();
  const loaded = await loadProductAdmin(id);
  if (!loaded) notFound();
  const [members, candidates] = await Promise.all([listModelMembers(id, loaded.product.modelId ?? null), listModelCandidates(id)]);
  return (
    <ProductEditor
      product={loaded.product}
      variants={loaded.variants}
      categories={loaded.categories.map((c) => ({ slug: c.slug, name: c.data.name, subs: c.data.subs }))}
      notes={loaded.notes}
      aiEnabled={aiEnabled()}
      model={<ModelCard productId={id} members={members} candidates={candidates} warnings={colorWarnings(loaded.variants, loaded.product.modelId ?? null)} />}
    />
  );
}
