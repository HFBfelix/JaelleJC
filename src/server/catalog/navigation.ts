// Catégories affichées dans la barre secondaire et le menu, lues dans la collection `categories`.
import { listCategories } from './repository';

export type NavCategory = { slug: string; name: string };

export async function getNavCategories(): Promise<NavCategory[]> {
  try {
    return (await listCategories()).map(({ slug, name }) => ({ slug, name }));
  } catch {
    // Base injoignable : le site reste navigable (menu sans catégories), l'erreur apparaît sur les pages catalogue.
    console.error('Navigation : catégories indisponibles.');
    return [];
  }
}
