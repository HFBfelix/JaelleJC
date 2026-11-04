// Actions de l'espace créatrice : sans droit admin, rien ne s'exécute ; entrée trafiquée refusée avant la base.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  saveFields: vi.fn(), saveVariants: vi.fn(), addPhoto: vi.fn(), publishProduct: vi.fn(), setProductStatus: vi.fn(),
  deleteDraft: vi.fn(), createProduct: vi.fn(), updatePhotos: vi.fn(), removePhoto: vi.fn(), loadProductAdmin: vi.fn(),
  audit: vi.fn(), analyzeProduct: vi.fn(), redirect: vi.fn(), setModel: vi.fn(),
}));
vi.mock('../auth/session', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('./products', () => mocks);
vi.mock('./ai', () => ({ analyzeProduct: mocks.analyzeProduct }));
vi.mock('../firebase/admin', () => ({ adminDb: () => { throw new Error('base touchée'); } }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));

const actions = await import('./actions');
const admin = { uid: 'admin-uid', email: 'j@exemple.test', admin: true, authTime: 0 };
const fields = {
  name: 'Cape', categoryId: null, subCategory: null, priceCents: 8900, accroche: '', histoire: '', description: '', materials: [],
  entretien: '', details: [], faq: [], limitedEditionSize: null, giftWrap: true, tags: [], usages: [],
};
const row = { color: '', colorHex: null, size: '', stock: 1, expectedStock: 0, dimensions: '', priceCents: null, active: true };

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
      actions.analyzeAction({ productId: 'p1', notes: 'Cape en gaze' }),
      actions.reviewAiAction({ productId: 'p1' }),
      actions.reviewAiAction({ productId: 'p1', reviewed: false }),
      actions.setModelAction({ productId: 'p1', withId: 'p2' }),
      actions.setModelAction({ productId: 'p1', withId: null }),
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
    ['notes trop longues pour l’IA', () => actions.analyzeAction({ productId: 'p1', notes: 'x'.repeat(6001) })],
    ['analyse sur un identifiant piégé', () => actions.analyzeAction({ productId: '../orders/x', notes: 'Cape' })],
    ['modèle : fiche piégée', () => actions.setModelAction({ productId: 'p1', withId: '../orders/x' })],
    ['modèle : champ manquant', () => actions.setModelAction({ productId: 'p1' })],
  ])('%s : refusé avant la base', async (_, call) => {
    expect(await call()).toEqual({ status: 'invalide' });
    expect(mocks.publishProduct).not.toHaveBeenCalled();
    expect(mocks.setProductStatus).not.toHaveBeenCalled();
    expect(mocks.saveFields).not.toHaveBeenCalled();
    expect(mocks.saveVariants).not.toHaveBeenCalled();
    expect(mocks.analyzeProduct).not.toHaveBeenCalled();
    expect(mocks.setModel).not.toHaveBeenCalled();
  });

  it('modèle : relié au nom de l’administratrice', async () => {
    mocks.setModel.mockResolvedValue('ok');
    expect(await actions.setModelAction({ productId: 'p1', withId: 'p2' })).toEqual({ status: 'ok' });
    expect(mocks.setModel).toHaveBeenCalledWith('admin-uid', 'p1', 'p2');
  });

  it('nouvelle pièce sans nom : « Nouvelle pièce », l’IA proposera le nom', async () => {
    mocks.createProduct.mockResolvedValue('p9');
    await actions.createProductAction({});
    expect(mocks.createProduct).toHaveBeenCalledWith('admin-uid', 'Nouvelle pièce');
    expect(mocks.redirect).toHaveBeenCalledWith('/atelier/produits/p9');
  });

  it('analyse : l’uid de la session et les notes reçues, rien d’autre', async () => {
    mocks.analyzeProduct.mockResolvedValue({ status: 'quota' });
    expect(await actions.analyzeAction({ productId: 'p1', notes: 'Cape en gaze, 3 pièces' })).toEqual({ status: 'quota' });
    expect(mocks.analyzeProduct).toHaveBeenCalledWith('admin-uid', 'p1', 'Cape en gaze, 3 pièces');
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
