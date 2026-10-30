import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import ProductDetail from '@/components/products/ProductDetail';
import { requireAdmin } from '@/server/auth/session';
import { toProductView } from '@/server/catalog/mapping';
import { listCategories } from '@/server/catalog/repository';
import { COLLECTIONS } from '@/server/db/schema';
import { adminDb } from '@/server/firebase/admin';

// Aperçu privé d'une fiche (brouillon compris), dans le gabarit du site : réservé à l'administratrice, jamais indexé.
export const metadata: Metadata = { title: 'Aperçu | Jaelle & JC', robots: { index: false, follow: false } };

type Props = { params: Promise<{ id: string }> };

export default async function ApercuPage({ params }: Props) {
  if (!(await requireAdmin())) redirect('/createur/connexion');
  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) notFound();
  const ref = adminDb().collection(COLLECTIONS.produits).doc(id);
  const [snap, variants, categories] = await Promise.all([ref.get(), ref.collection(COLLECTIONS.variantes).get(), listCategories()]);
  if (!snap.exists) notFound();
  // Rendu comme s'il était en ligne : mêmes contrôles que la page publique (prix, schéma).
  const product = toProductView(id, { ...snap.data(), status: 'published' }, variants.docs.map((v) => ({ id: v.id, data: v.data() })), categories);

  return (
    <div className="bg-white">
      <p className="bg-[#F5F2EE] text-center py-3 text-[11px] uppercase tracking-[0.12em]">
        Aperçu privé — {snap.get('status') === 'published' ? 'pièce en ligne' : 'pièce non publiée'} ·{' '}
        <Link href={`/createur/produits/${id}`} className="border-b-[0.5px] border-black">Retour à la fiche</Link>
      </p>
      {product ? (
        <ProductDetail product={product} buy={<p className="text-[13px] text-neutral-500 border-[0.5px] border-neutral-200 p-4">Aperçu : l’ajout à la sélection est désactivé.</p>} />
      ) : (
        <p className="max-w-md mx-auto px-6 py-24 text-[14px]">L’aperçu sera disponible quand la fiche aura un nom, un prix et une adresse valides.</p>
      )}
    </div>
  );
}
