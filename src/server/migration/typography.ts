// Correction de la typographie des noms déjà migrés (EDITORIAL.md, typographie des titres) :
// noms de produits, familles des catégories, titres d'articles. Fonction pure : le script décide d'écrire.
import { frenchTitle, normalizeSpaces } from './text.ts';
import type { Decisions, Doc } from './transform.ts';

export type TypographyChange = { collection: string; id: string; field: string; before: string; after: string; data: Record<string, unknown> };

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

export function planTypography(input: { produits: Doc[]; categories: Doc[]; articles: Doc[] }, decisions: Decisions = {}): TypographyChange[] {
  const changes: TypographyChange[] = [];

  // Seuls les documents au nouveau format (slug présent) : l'ancien format est traité par la migration.
  for (const p of input.produits) {
    if (typeof p.data.slug !== 'string') continue;
    const before = str(p.data.name);
    const wanted = decisions.products?.[p.id]?.name;
    const after = wanted ? normalizeSpaces(wanted) : frenchTitle(before);
    if (after && after !== before) changes.push({ collection: 'produits', id: p.id, field: 'name', before, after, data: { name: after } });
  }

  for (const c of input.categories) {
    const subs = c.data.subs;
    if (!Array.isArray(subs) || !subs.every((s) => s && typeof s === 'object' && typeof (s as { name?: unknown }).name === 'string')) continue;
    const list = subs as { slug: string; name: string }[];
    const fixed = list.map((s) => ({ ...s, name: frenchTitle(s.name) }));
    list.forEach((s, i) => {
      if (fixed[i]!.name !== s.name) changes.push({ collection: 'categories', id: c.id, field: `subs.${s.slug}`, before: s.name, after: fixed[i]!.name, data: { subs: fixed } });
    });
  }

  for (const a of input.articles) {
    if (typeof a.data.slug !== 'string') continue;
    const before = str(a.data.title);
    const after = frenchTitle(before);
    if (after && after !== before) changes.push({ collection: 'articles_blog', id: a.id, field: 'title', before, after, data: { title: after } });
  }
  return changes;
}
