// Catégories affichées dans la barre secondaire et le menu.
// PROVISOIRE (étape 1) : liste fixe, identique aux catégories de production au 2026-10-24.
// Remplacée à l'étape 2 par la lecture de la collection `categories` (Admin SDK).
export type NavCategory = { id: string };

const STEP1_CATEGORIES: readonly NavCategory[] = [{ id: 'Bébé' }, { id: 'Coffrets' }, { id: 'Femmes' }];

export async function getNavCategories(): Promise<NavCategory[]> {
  return [...STEP1_CATEGORIES];
}
