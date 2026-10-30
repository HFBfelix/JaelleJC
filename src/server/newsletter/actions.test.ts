// Newsletter : e-mail validé, robot ignoré, même réponse déjà inscrite ou non, jamais l'adresse dans le journal.
import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ create: vi.fn(), existing: vi.fn() }));
vi.mock('../firebase/admin', () => ({
  adminDb: () => ({
    collection: () => ({
      doc: (id: string) => ({ create: (d: unknown) => mocks.create(id, d) }),
      where: () => ({ limit: () => ({ get: async () => ({ empty: !mocks.existing() }) }) }),
    }),
  }),
}));

const { subscribeNewsletterAction } = await import('./actions');
beforeEach(() => { vi.clearAllMocks(); mocks.create.mockResolvedValue(undefined); mocks.existing.mockReturnValue(false); });

it('nouvelle adresse : enregistrée en minuscules, identifiant = empreinte, consentement daté', async () => {
  expect(await subscribeNewsletterAction({ email: ' Camille@Exemple.FR ', website: '' })).toBe('ok');
  expect(mocks.create).toHaveBeenCalledWith(expect.stringMatching(/^[a-f0-9]{64}$/), expect.objectContaining({ email: 'camille@exemple.fr', source: 'footer_site' }));
});

it('déjà inscrite (ancien identifiant ou double envoi) : même réponse, rien de plus', async () => {
  mocks.existing.mockReturnValue(true);
  expect(await subscribeNewsletterAction({ email: 'a@exemple.fr' })).toBe('ok');
  expect(mocks.create).not.toHaveBeenCalled();
  mocks.existing.mockReturnValue(false);
  mocks.create.mockRejectedValue({ code: 6 });
  expect(await subscribeNewsletterAction({ email: 'a@exemple.fr' })).toBe('ok');
});

it('robot (champ piège rempli) : réponse identique, rien d’écrit', async () => {
  expect(await subscribeNewsletterAction({ email: 'a@exemple.fr', website: 'http://spam' })).toBe('ok');
  expect(mocks.create).not.toHaveBeenCalled();
});

it.each([{ email: 'pas-un-email' }, { email: 'a@exemple.fr', source: 'admin' }, { email: `${'x'.repeat(250)}@a.fr` }, null])(
  'entrée invalide %# : refusée', async (input) => {
    expect(await subscribeNewsletterAction(input)).toBe('invalide');
    expect(mocks.create).not.toHaveBeenCalled();
  });

it('erreur en base : message générique, sans l’adresse dans le journal', async () => {
  mocks.create.mockRejectedValue(new Error('panne'));
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  expect(await subscribeNewsletterAction({ email: 'secret@exemple.fr' })).toBe('erreur');
  expect(JSON.stringify(spy.mock.calls)).not.toContain('secret@exemple.fr');
  spy.mockRestore();
});
