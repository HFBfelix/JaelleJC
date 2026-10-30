// Actions de l'espace client : anonyme refusé, entrée trafiquée refusée avant toute lecture, uid toujours lu
// dans la session (jamais dans l'entrée), suppression protégée par une connexion récente.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  saveAddress: vi.fn(),
  deleteAddress: vi.fn(),
  exportData: vi.fn(),
  deleteAccount: vi.fn(),
  deleteCookie: vi.fn(),
  redirect: vi.fn(),
}));
vi.mock('../auth/session', () => ({ getSessionUser: mocks.getSessionUser }));
vi.mock('./addresses', () => ({ saveAddress: mocks.saveAddress, deleteAddress: mocks.deleteAddress }));
vi.mock('./data', () => ({ exportData: mocks.exportData, deleteAccount: mocks.deleteAccount }));
vi.mock('next/headers', () => ({ cookies: async () => ({ delete: mocks.deleteCookie }) }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));

const { deleteAccountAction, deleteAddressAction, exportDataAction, saveAddressAction } = await import('./actions');
const nowS = () => Math.floor(Date.now() / 1000);
const user = (authTime = nowS()) => ({ uid: 'u1', email: 'a@exemple.test', admin: false, authTime });
const address = { label: '', name: 'Camille', line1: '1 rue A', line2: '', zipCode: '75001', city: 'Paris', phone: '' };

beforeEach(() => vi.clearAllMocks());

describe('anonyme', () => {
  beforeEach(() => mocks.getSessionUser.mockResolvedValue(null));

  it('aucune action ne touche à la base', async () => {
    expect(await saveAddressAction({ address })).toBe('connexion');
    expect(await deleteAddressAction({ id: 'a1' })).toBe('connexion');
    expect(await exportDataAction()).toEqual({ ok: false, reason: 'connexion' });
    expect(await deleteAccountAction({ confirm: true })).toBe('reconnexion');
    for (const fn of [mocks.saveAddress, mocks.deleteAddress, mocks.exportData, mocks.deleteAccount]) expect(fn).not.toHaveBeenCalled();
  });
});

describe('adresses', () => {
  it('l’adresse est rangée sous l’uid de la session', async () => {
    mocks.getSessionUser.mockResolvedValue(user());
    mocks.saveAddress.mockResolvedValue('ok');
    expect(await saveAddressAction({ id: 'a1', address })).toBe('ok');
    expect(mocks.saveAddress).toHaveBeenCalledWith('u1', 'a1', address);
  });

  it.each([
    [{ address: { ...address, zipCode: '123' } }],
    [{ address, uid: 'autre-uid' }],
    [{ address: { ...address, country: 'US' } }],
  ])('entrée trafiquée %# : refusée avant la base', async (input) => {
    mocks.getSessionUser.mockResolvedValue(user());
    expect(await saveAddressAction(input)).toBe('invalide');
    expect(mocks.saveAddress).not.toHaveBeenCalled();
  });

  it('suppression : identifiant hors format refusé', async () => {
    mocks.getSessionUser.mockResolvedValue(user());
    expect(await deleteAddressAction({ id: '../../users/autre' })).toBe('invalide');
    expect(mocks.deleteAddress).not.toHaveBeenCalled();
  });

  it('plafond atteint : signalé', async () => {
    mocks.getSessionUser.mockResolvedValue(user());
    mocks.saveAddress.mockResolvedValue('plein');
    expect(await saveAddressAction({ address })).toBe('plein');
  });
});

describe('export', () => {
  it('données de la seule cliente connectée', async () => {
    mocks.getSessionUser.mockResolvedValue(user());
    mocks.exportData.mockResolvedValue({ compte: { email: 'a@exemple.test' } });
    const res = await exportDataAction();
    expect(mocks.exportData).toHaveBeenCalledWith('u1', 'a@exemple.test');
    expect(res.ok && JSON.parse(res.json)).toEqual({ compte: { email: 'a@exemple.test' } });
  });
});

describe('suppression du compte', () => {
  it('sans confirmation : refusée', async () => {
    mocks.getSessionUser.mockResolvedValue(user());
    expect(await deleteAccountAction({ confirm: false })).toBe('invalide');
    expect(await deleteAccountAction({ confirm: true, uid: 'autre' })).toBe('invalide');
    expect(mocks.deleteAccount).not.toHaveBeenCalled();
  });

  it('connexion de plus de 10 minutes : nouvelle connexion demandée', async () => {
    mocks.getSessionUser.mockResolvedValue(user(nowS() - 11 * 60));
    expect(await deleteAccountAction({ confirm: true })).toBe('reconnexion');
    expect(mocks.deleteAccount).not.toHaveBeenCalled();
  });

  it('commande en cours : refusée, la session reste ouverte', async () => {
    mocks.getSessionUser.mockResolvedValue(user());
    mocks.deleteAccount.mockResolvedValue('commande-en-cours');
    expect(await deleteAccountAction({ confirm: true })).toBe('commande-en-cours');
    expect(mocks.deleteCookie).not.toHaveBeenCalled();
  });

  it('supprimé : cookie de session retiré, page de confirmation', async () => {
    mocks.getSessionUser.mockResolvedValue(user());
    mocks.deleteAccount.mockResolvedValue('supprime');
    await deleteAccountAction({ confirm: true });
    expect(mocks.deleteAccount).toHaveBeenCalledWith('u1');
    expect(mocks.deleteCookie).toHaveBeenCalledWith('__session');
    expect(mocks.redirect).toHaveBeenCalledWith('/compte/supprime');
  });

  it('erreur en cours de route : message générique, rien dans le journal sur la cliente', async () => {
    mocks.getSessionUser.mockResolvedValue(user());
    mocks.deleteAccount.mockRejectedValue(new Error('Stripe indisponible'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await deleteAccountAction({ confirm: true })).toBe('erreur');
    expect(spy).toHaveBeenCalledWith('compte : suppression interrompue');
    spy.mockRestore();
  });
});
