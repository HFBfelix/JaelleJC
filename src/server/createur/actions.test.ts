// Actions de l'espace créatrice : sans droit admin, rien ne s'exécute ; entrée trafiquée refusée avant la base.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  saveFields: vi.fn(), saveVariants: vi.fn(), addPhoto: vi.fn(), publishProduct: vi.fn(), setProductStatus: vi.fn(),
  deleteDraft: vi.fn(), createProduct: vi.fn(), updatePhotos: vi.fn(), removePhoto: vi.fn(), loadProductAdmin: vi.fn(),
  audit: vi.fn(), draftTexts: vi.fn(), redirect: vi.fn(),
}));
vi.mock('../auth/session', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('./products', () => mocks);
vi.mock('./ai', () => ({ draftTexts: mocks.draftTexts }));
vi.mock('../firebase/admin', () => ({ adminDb: () => { throw new Error('base touchée'); } }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));

const actions = await import('./actions');
const admin = { uid: 'admin-uid', email: 'j@exemple.test', admin: true, authTime: 0 };
const fields = {
  name: 'Cape', categoryId: null, subCategory: null, priceCents: 8900, accroche: '', histoire: '', description: '', materials: [],
  entretien: '', details: [], faq: [], limitedEditionSize: null, giftWrap: true, tags: [], usages: [],
};
const row = { color: '', size: '', stock: 1, expectedStock: 0, dimensions: '', priceCents: null, active: true };

beforeEach(() => vi.clearAllMocks());

describe('cliente ordinaire, anonyme ou droit retiré (requireAdmin → null)', () => {
  beforeEach(() => mocks.requireAdmin.mockResolvedValue(null));

  it('aucune action ne s’exécute', async () => {
    const results = await Promise.all([
      actions.createProductAction({ name: 'X' }),
      actions.duplicateProductAction({ productId: 'p1' }),
      actions.saveFieldsAction({ productId: 'p1', fields }),
      actions.saveVariantsAction({ productId: 'p1', rows: [row] }),
      actions.updatePhotosAction({ productId: 'p1', images: [] }),
      actions.removePhotoAction({ productId: 'p1', path: 'produits/p1/x.jpg' }),
      actions.publishAction({ productId: 'p1' }),
      actions.setStatusAction({ productId: 'p1', status: 'archived' }),
      actions.deleteDraftAction({ productId: 'p1' }),
      actions.draftAiAction({ productId: 'p1' }),
      actions.reviewAiAction({ productId: 'p1' }),
    ]);
    for (const r of results) expect(r).toEqual({ status: 'connexion' });
    for (const [name, fn] of Object.entries(mocks)) if (name !== 'requireAdmin') expect(fn).not.toHaveBeenCalled();
  });
});

describe('administratrice', () => {
  beforeEach(() => mocks.requireAdmin.mockResolvedValue(admin));

  it.each([
    ['identifiant piégé', () => actions.publishAction({ productId: '../orders/x' })],
    ['statut « publié » forcé sans contrôle', () => actions.setStatusAction({ productId: 'p1', status: 'published' })],
    ['champ en trop (stock dans la fiche)', () => actions.saveFieldsAction({ productId: 'p1', fields: { ...fields, inStock: true } })],
    ['prix négatif', () => actions.saveFieldsAction({ productId: 'p1', fields: { ...fields, priceCents: -100 } })],
    ['stock négatif', () => actions.saveVariantsAction({ productId: 'p1', rows: [{ ...row, stock: -3 }] })],
  ])('%s : refusé avant la base', async (_, call) => {
    expect(await call()).toEqual({ status: 'invalide' });
    expect(mocks.publishProduct).not.toHaveBeenCalled();
    expect(mocks.setProductStatus).not.toHaveBeenCalled();
    expect(mocks.saveFields).not.toHaveBeenCalled();
    expect(mocks.saveVariants).not.toHaveBeenCalled();
  });

  it('l’autrice enregistrée est l’uid de la session', async () => {
    mocks.publishProduct.mockResolvedValue({ status: 'ok' });
    await actions.publishAction({ productId: 'p1' });
    expect(mocks.publishProduct).toHaveBeenCalledWith('admin-uid', 'p1');
  });

  it('erreur en base : message générique, journal sans contenu', async () => {
    mocks.saveFields.mockRejectedValue(new Error('Cape de bain'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await actions.saveFieldsAction({ productId: 'p1', fields })).toEqual({ status: 'erreur' });
    expect(spy).toHaveBeenCalledWith('espace créatrice : enregistrement impossible');
    spy.mockRestore();
  });
});
