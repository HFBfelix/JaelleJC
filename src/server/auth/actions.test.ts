// Actions de connexion : entrées refusées avant tout appel à Firebase, mot de passe protégé par une connexion récente.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  openSession: vi.fn(),
  closeSession: vi.fn(),
  getSessionUser: vi.fn(),
  attachGuestCart: vi.fn(),
  updateUser: vi.fn(),
  closeAllSessions: vi.fn(),
  redirect: vi.fn(),
}));
vi.mock('./session', () => ({
  openSession: mocks.openSession, closeSession: mocks.closeSession, getSessionUser: mocks.getSessionUser, closeAllSessions: mocks.closeAllSessions,
}));
vi.mock('../cart/service', () => ({ attachGuestCart: mocks.attachGuestCart }));
vi.mock('../firebase/admin', () => ({ adminAuth: () => ({ updateUser: mocks.updateUser }) }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));

const { setPasswordAction, signInAction } = await import('./actions');
const nowS = () => Math.floor(Date.now() / 1000);

beforeEach(() => vi.clearAllMocks());

describe('ouverture de session', () => {
  it.each([
    ['rien', undefined],
    ['jeton vide', { idToken: '' }],
    ['jeton énorme', { idToken: 'x'.repeat(5000) }],
    ['champ en trop (admin)', { idToken: 't', admin: true }],
    ['champ en trop (uid)', { idToken: 't', uid: 'autre' }],
  ])('%s : refusé sans appel à Firebase', async (_, input) => {
    expect(await signInAction(input)).toEqual({ ok: false });
    expect(mocks.openSession).not.toHaveBeenCalled();
  });

  it('jeton refusé par Firebase : même réponse, panier non touché', async () => {
    mocks.openSession.mockResolvedValueOnce(null);
    expect(await signInAction({ idToken: 't' })).toEqual({ ok: false });
    expect(mocks.attachGuestCart).not.toHaveBeenCalled();
  });

  it('connexion : panier visiteur rattaché au compte, retour limité à la liste', async () => {
    mocks.openSession.mockResolvedValueOnce({ uid: 'u1', email: 'a@b.fr', admin: false, authTime: nowS() });
    expect(await signInAction({ idToken: 't', retour: 'https://evil.example' })).toEqual({ ok: true, redirect: '/compte', admin: false });
    expect(mocks.attachGuestCart).toHaveBeenCalledWith('u1');
  });

  it('le droit admin vient de la session vérifiée, jamais de l’entrée', async () => {
    mocks.openSession.mockResolvedValueOnce({ uid: 'u1', email: 'a@b.fr', admin: false, authTime: nowS() });
    expect(await signInAction({ idToken: 't', retour: '/createur' })).toMatchObject({ ok: true, admin: false });
  });
});

describe('choix du mot de passe', () => {
  it('anonyme : refusé', async () => {
    mocks.getSessionUser.mockResolvedValueOnce(null);
    expect(await setPasswordAction({ password: 'a'.repeat(12) })).toBe('reconnexion');
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it('connexion de plus de 10 minutes : reconnexion demandée', async () => {
    mocks.getSessionUser.mockResolvedValueOnce({ uid: 'u1', email: null, admin: false, authTime: nowS() - 11 * 60 });
    expect(await setPasswordAction({ password: 'a'.repeat(12) })).toBe('reconnexion');
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it.each([['trop court', { password: 'a'.repeat(9) }], ['uid fourni', { password: 'a'.repeat(12), uid: 'autre' }], ['rien', null]])(
    '%s : invalide', async (_, input) => {
      expect(await setPasswordAction(input)).toBe('invalide');
      expect(mocks.updateUser).not.toHaveBeenCalled();
    });

  it('connexion récente : mot de passe enregistré sur son propre compte seulement', async () => {
    mocks.getSessionUser.mockResolvedValueOnce({ uid: 'u1', email: null, admin: false, authTime: nowS() - 60 });
    await setPasswordAction({ password: 'a'.repeat(12) });
    expect(mocks.redirect).toHaveBeenCalledWith('/connexion?retour=/compte&info=mot-de-passe');
    expect(mocks.updateUser).toHaveBeenCalledWith('u1', { password: 'a'.repeat(12) });
    expect(mocks.closeAllSessions).toHaveBeenCalledWith('u1'); // tous les appareils déconnectés
  });
});
