import { NextResponse, type NextRequest } from 'next/server';
import { getPublishedSlugById } from '@/server/catalog/repository';

// Anciennes adresses /product/<identifiant> : redirection permanente (301) vers /produits/<slug>.
// Produit inconnu, brouillon ou archivé : 404 (on ne révèle pas l'existence d'un brouillon).
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const slug = await getPublishedSlugById((await params).id);
  if (!slug) return new NextResponse('Pièce introuvable.', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  return NextResponse.redirect(new URL(`/produits/${slug}`, request.url), 301);
}
