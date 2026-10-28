import { describe, expect, it } from 'vitest';
import { planTypography } from './typography';

const produit = (id: string, name: string, migrated = true) => ({ id, data: { name, ...(migrated ? { slug: id } : {}) } });

describe('correction de la typographie des données migrées', () => {
  it('corrige les noms tout en majuscules, laisse les noms corrects', () => {
    const changes = planTypography({
      produits: [produit('a', 'VESTE SHERPA KAKI'), produit('b', 'Cabas imprimé bleu')],
      categories: [], articles: [],
    });
    expect(changes).toEqual([{ collection: 'produits', id: 'a', field: 'name', before: 'VESTE SHERPA KAKI', after: 'Veste sherpa kaki', data: { name: 'Veste sherpa kaki' } }]);
  });

  it('nom décidé par Jaelle prioritaire', () => {
    const changes = planTypography({ produits: [produit('c', 'Coffret bébé moutarde, imprimé fleurs')], categories: [], articles: [] },
      { products: { c: { name: 'Coffret bébé moutarde imprimé fleurs' } } });
    expect(changes[0]!.after).toBe('Coffret bébé moutarde imprimé fleurs');
  });

  it('ignore l’ancien format (sans slug) : la migration s’en charge', () => {
    expect(planTypography({ produits: [produit('d', 'VESTE', false)], categories: [{ id: 'Bébé', data: { subs: ['sacs'] } }], articles: [{ id: 'x', data: { title: 'TITRE' } }] })).toEqual([]);
  });

  it('familles et titres d’articles', () => {
    const changes = planTypography({
      produits: [],
      categories: [{ id: 'bebe', data: { subs: [{ slug: 'linges-de-lit', name: 'linges de lit' }, { slug: 'vestes', name: 'Vestes' }] } }],
      articles: [{ id: 'z', data: { slug: 'ame-cabas', title: "L'âme du Cabas imprimé bleu : Entre héritage et modernité" } }],
    });
    expect(changes.map((c) => c.after)).toEqual(['Linges de lit', "L'âme du cabas imprimé bleu : entre héritage et modernité"]);
    expect(changes[0]!.data).toEqual({ subs: [{ slug: 'linges-de-lit', name: 'Linges de lit' }, { slug: 'vestes', name: 'Vestes' }] });
  });
});
