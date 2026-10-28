import { describe, expect, it } from 'vitest';
import {
  migrateArticle, migrateCategories, migrateDelivery, migrateMessage, migrateNewsletter, migrateOrder,
  migrateProduct, migrateUser, toCents, PRODUCT_FIELDS_TO_DELETE, type Doc,
} from './transform';
import { slugify, uniqueSlug } from './text';

const categories = (): Doc[] => [
  { id: 'Bébé', data: { subs: ['Capes de bain', 'Couvertures'] } },
  { id: 'Coffrets', data: { subs: ['Coffrets naissance'] } },
  { id: 'Femmes', data: { subs: ['Cabas'] } },
];

const ancienProduit = (data: Record<string, unknown> = {}): Doc => ({
  id: 'abc123',
  data: {
    name: 'CAPE DE BAIN NUAGE', price: 89, stock: 3, category: 'Bébé', subCategory: 'Capes de bain',
    description: 'Une cape de bain en gaze de coton. Cousue main dans notre atelier.',
    images: ['https://firebasestorage.googleapis.com/v0/b/x.appspot.com/o/produits%2F1_cape.jpg?alt=media&token=t'],
    seo_tags: 'cape, Bébé, cape', status: 'published', ...data,
  },
});

describe('prix en centimes', () => {
  it('convertit euros et texte', () => {
    expect(toCents(89).cents).toBe(8900);
    expect(toCents(55.9).cents).toBe(5590);
    expect(toCents('12,50').cents).toBe(1250);
    expect(toCents(0.1 + 0.2).cents).toBe(30);
  });
  it('signale plus de deux décimales', () => {
    expect(toCents(10.555).issue?.level).toBe('alerte');
  });
  it('refuse les prix nuls, négatifs ou invalides', () => {
    for (const v of [0, -5, NaN, Infinity, 'abc', null, undefined, {}]) expect(toCents(v).cents).toBeNull();
  });
});

describe('slugs', () => {
  it('sans accents ni caractères spéciaux', () => {
    expect(slugify('Bébé')).toBe('bebe');
    expect(slugify('CAPE DE BAIN « Nuage » & Co')).toBe('cape-de-bain-nuage-et-co');
    expect(slugify('???')).toBe('sans-nom');
  });
  it('collisions gérées', () => {
    const taken = new Set<string>();
    expect(uniqueSlug('cape', taken)).toBe('cape');
    expect(uniqueSlug('cape', taken)).toBe('cape-2');
    expect(uniqueSlug('cape', taken)).toBe('cape-3');
  });
});

describe('catégories', () => {
  it('noms → slugs, familles texte → objets', () => {
    const { writes, map } = migrateCategories(categories());
    expect(writes.map((w) => w.id)).toEqual(['bebe', 'coffrets', 'femmes']);
    expect(writes[0]!.data.subs).toEqual([{ slug: 'capes-de-bain', name: 'Capes de bain' }, { slug: 'couvertures', name: 'Couvertures' }]);
    expect(map.get('Bébé')?.subs.get('Couvertures')).toBe('couvertures');
  });
  it('rejouable : même résultat avec les documents déjà migrés présents', () => {
    const first = migrateCategories(categories());
    const again = migrateCategories([
      ...categories().map((d) => ({ ...d, data: { ...d.data, migratedTo: slugify(d.id) } })),
      ...first.writes,
    ]);
    expect(again.writes).toEqual(first.writes);
  });
});

describe('produits', () => {
  const run = (doc = ancienProduit(), decision = {}) => migrateProduct(doc, migrateCategories(categories()).map, new Set(), decision);

  it('nouveau modèle complet', () => {
    const r = run();
    expect(r.write).toMatchObject({
      slug: 'cape-de-bain-nuage', categoryId: 'bebe', subCategory: 'capes-de-bain', status: 'published',
      priceCents: 8900, inStock: true, tags: ['cape', 'bébé'], materials: ['gaze de coton'], giftWrap: true,
    });
    expect(r.write.images).toEqual([{ path: 'produits/1_cape.jpg', url: expect.stringContaining('firebasestorage'), alt: '', order: 0 }]);
    expect(r.variantes).toEqual([{ id: 'unique', data: expect.objectContaining({ stock: 3, active: true, sku: 'CAPEDEBAINNUAGE-U' }) }]);
    expect(r.issues.some((i) => i.level === 'erreur')).toBe(false);
  });

  it('valeurs d’origine conservées dans `legacy`', () => {
    expect(run().write.legacy).toMatchObject({ price: 89, stock: 3, category: 'Bébé', description: expect.stringContaining('gaze') });
  });

  it('rejouable : repasser sur un produit migré donne le même résultat', () => {
    const first = run();
    const again = run({ id: 'abc123', data: first.write });
    expect(again.write).toEqual(first.write);
  });

  it('jamais publié par défaut : brouillon ou sans statut → brouillon', () => {
    expect(run(ancienProduit({ status: 'draft' })).newStatus).toBe('draft');
    expect(run(ancienProduit({ status: undefined })).newStatus).toBe('draft');
  });

  it('décision de Jaelle prioritaire pour les textes et le retrait', () => {
    const r = run(ancienProduit(), { status: 'archived', descriptionApproved: true, overrides: { accroche: 'La cape des premiers bains.' } });
    expect(r.newStatus).toBe('archived');
    expect(r.write.accroche).toBe('La cape des premiers bains.');
    expect(r.write.aiDraft).toEqual({ generatedAt: null, reviewed: true });
  });

  it('une décision ne publie jamais un ancien brouillon (liste de contrôle de l’espace créatrice)', () => {
    const r = run(ancienProduit({ status: 'draft' }), { status: 'published', descriptionApproved: true });
    expect(r.newStatus).toBe('draft');
    expect(r.issues.map((i) => i.message)).toContain('publication demandée : à faire dans l’espace créatrice, après la liste de contrôle');
  });

  it('aucun ancien champ supprimé n’est réécrit par la migration', () => {
    const keys = Object.keys(run().write);
    for (const field of PRODUCT_FIELDS_TO_DELETE) expect(keys).not.toContain(field);
  });

  it('prix invalide : erreur et remise en brouillon', () => {
    const r = run(ancienProduit({ price: -3 }));
    expect(r.newStatus).toBe('draft');
    expect(r.issues.filter((i) => i.level === 'erreur').length).toBeGreaterThan(0);
  });

  it('stock invalide mis à 0 et signalé', () => {
    for (const stock of [-2, 1.5, '4', null]) {
      const r = run(ancienProduit({ stock }));
      expect(r.variantes[0]!.data.stock).toBe(0);
      expect(r.write.inStock).toBe(false);
    }
  });

  it('catégorie inconnue signalée, sans planter', () => {
    const r = run(ancienProduit({ category: 'Hommes' }));
    expect(r.write.categoryId).toBeNull();
    expect(r.issues.some((i) => i.message.includes('catégorie inconnue'))).toBe(true);
  });

  it('collision de slugs entre deux produits du même nom', () => {
    const slugs = new Set<string>();
    const map = migrateCategories(categories()).map;
    expect(migrateProduct(ancienProduit(), map, slugs).write.slug).toBe('cape-de-bain-nuage');
    expect(migrateProduct({ ...ancienProduit(), id: 'autre' }, map, slugs).write.slug).toBe('cape-de-bain-nuage-2');
  });

  it('tailles détectées : variante par taille à créer, sans répartir le stock à la place de Jaelle', () => {
    const r = run(ancienProduit({ dimensions: '6-9m, 9-12m | Autres tailles : Sur commande uniquement.' }));
    expect(r.issues.map((i) => i.message)).toContain('tailles détectées (6-9 mois, 9-12 mois) : créer une variante par taille et y répartir le stock');
    expect(r.variantes).toHaveLength(1);
  });

  it('textes à compléter et photos sans texte alternatif signalés', () => {
    const messages = run().issues.map((i) => i.message);
    expect(messages).toContain('details à compléter');
    expect(messages).toContain('texte alternatif à écrire pour 1 photo(s)');
  });
});

describe('autres collections', () => {
  it('livraison gratuite (0 €) acceptée mais signalée', () => {
    const r = migrateDelivery({ freeThreshold: 0, flatRate: 0, zones: 'France' });
    expect(r.write).toMatchObject({ freeThresholdCents: 0, flatRateCents: 0 });
    expect(r.issues.some((i) => i.level === 'erreur')).toBe(false);
    expect(r.issues.map((i) => i.message)).toContain('forfait de livraison à 0 € : livraison gratuite pour toutes les commandes, à confirmer');
  });

  it('livraison invalide refusée', () => {
    expect(migrateDelivery({ freeThreshold: -1, flatRate: 'abc' }).issues.filter((i) => i.level === 'erreur')).toHaveLength(2);
  });

  it('livraison en centimes', () => {
    expect(migrateDelivery({ freeThreshold: 150, flatRate: 6.9, zones: 'France' }).write).toMatchObject({
      freeThresholdCents: 15000, flatRateCents: 690, zones: ['France'],
    });
  });

  it('commande : centimes, invitée → userId null, plus d’empreinte de carte', () => {
    const { write, issues } = migrateOrder({
      id: 'o1',
      data: {
        userId: 'guest', customerEmail: 'c@exemple.fr', items: [{ id: 'p1', name: 'Cape', price: 89, quantity: 2 }],
        total: 184.9, deliveryFee: 6.9, cardFingerprint: 'fp', status: 'paid',
      },
    });
    expect(write).toMatchObject({ userId: null, amounts: { subtotalCents: 17800, deliveryCents: 690, totalCents: 18490 } });
    expect(JSON.stringify(write)).not.toContain('fp');
    expect(issues).toEqual([]);
  });

  it('commande : total incohérent signalé', () => {
    const { issues } = migrateOrder({ id: 'o2', data: { userId: 'u1', items: [{ id: 'p', name: 'X', price: 10, quantity: 1 }], total: 99, deliveryFee: 0 } });
    expect(issues[0]?.message).toContain('≠');
  });

  it('message → contact, tronqué aux limites', () => {
    const r = migrateMessage({ id: 'm1', data: { name: 'x'.repeat(200), email: 'A@B.FR', message: 'Bonjour' } });
    expect(r.id).toBe('messages-m1');
    expect(r.data).toMatchObject({ email: 'a@b.fr', status: 'unread' });
    expect((r.data.name as string).length).toBe(100);
  });

  it('newsletter : nouvelle forme', () => {
    expect(migrateNewsletter({ id: 'n', data: { email: 'X@Y.FR', source: 'email_redirect', subscribedAt: 't' } }))
      .toEqual({ email: 'x@y.fr', source: 'page_newsletter', consentAt: 't' });
  });

  it('profil : adresse déplacée dans `adresses`', () => {
    const r = migrateUser({ id: 'u', data: { displayName: 'Camille', email: 'c@x.fr', address: '1 rue', zipCode: '75001', city: 'Paris' } });
    expect(r.profile).toEqual({ displayName: 'Camille', createdAt: null });
    expect(r.address).toMatchObject({ line1: '1 rue', zipCode: '75001', city: 'Paris' });
    expect(migrateUser({ id: 'v', data: { displayName: 'Sans adresse' } }).address).toBeNull();
  });

  it('article : brouillon généré automatiquement reste brouillon', () => {
    const a = migrateArticle({ id: 'a1', data: { title: 'Brouillon IA : Cape', content: 'Texte', status: 'draft', productId: 'p1' } }, new Set());
    expect(a).toMatchObject({ slug: 'brouillon-ia-cape', status: 'draft', productIds: ['p1'] });
  });
});
