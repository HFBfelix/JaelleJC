// Newsletter : e-mail validé, robot ignoré, même réponse déjà inscrite ou non, jamais l'adresse dans le journal ;
// confirmation et liste Brevo seulement pour une nouvelle inscription, après la réponse ; désinscription par lien.
import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  create: vi.fn(), existing: vi.fn(), get: vi.fn(), del: vi.fn(), after: vi.fn(), send: vi.fn(), sync: vi.fn(), limit: vi.fn(),
}));
vi.mock('../firebase/admin', () => ({
  adminDb: () => ({
    collection: () => ({
      doc: (id: string) => ({ id, create: (d: unknown) => mocks.create(id, d), get: () => mocks.get(id), delete: () => mocks.del(id) }),
      where: () => ({ limit: () => ({ get: async () => ({ empty: !mocks.existing() }) }) }),
    }),
  }),
}));
vi.mock('next/server', () => ({ after: mocks.after }));
vi.mock('../http/origin', () => ({ siteOrigin: async () => 'https://www.jaellejc.com' }));
vi.mock('../http/rate-limit', () => ({ takeRateLimit: mocks.limit, clientIp: async () => '203.0.113.7' }));
vi.mock('../emails/sender', () => ({ sendEmail: mocks.send, syncNewsletterContact: mocks.sync }));

const { subscribeNewsletterAction, unsubscribeNewsletterAction } = await import('./actions');
beforeEach(() => {
  vi.clearAllMocks();
  mocks.create.mockResolvedValue(undefined); mocks.existing.mockReturnValue(false); mocks.limit.mockResolvedValue(true);
  mocks.send.mockResolvedValue('envoye'); mocks.sync.mockResolvedValue('envoye');
});

it('nouvelle adresse : enregistrée en minuscules, identifiant = empreinte, consentement daté ; confirmation après la réponse', async () => {
  expect(await subscribeNewsletterAction({ email: ' Camille@Exemple.FR ', website: '' })).toBe('ok');
  expect(mocks.create).toHaveBeenCalledWith(expect.stringMatching(/^[a-f0-9]{64}$/), expect.objectContaining({
    email: 'camille@exemple.fr', source: 'footer_site', unsubscribeToken: expect.stringMatching(/^[a-f0-9]{48}$/),
  }));
  expect(mocks.send).not.toHaveBeenCalled();
  await mocks.after.mock.calls[0]![0]();
  const message = mocks.send.mock.calls[0]![0] as { to: string; text: string };
  expect(message.to).toBe('camille@exemple.fr');
  expect(message.text).toMatch(/https:\/\/www\.jaellejc\.com\/newsletter\/desinscription\?id=[a-f0-9]{64}&t=[a-f0-9]{48}/);
  expect(mocks.sync).toHaveBeenCalledWith('camille@exemple.fr', true);
});

it('déjà inscrite (ancien identifiant ou double envoi) : même réponse, aucun e-mail', async () => {
  mocks.existing.mockReturnValue(true);
  expect(await subscribeNewsletterAction({ email: 'a@exemple.fr' })).toBe('ok');
  expect(mocks.create).not.toHaveBeenCalled();
  mocks.existing.mockReturnValue(false);
  mocks.create.mockRejectedValue({ code: 6 });
  expect(await subscribeNewsletterAction({ email: 'a@exemple.fr' })).toBe('ok');
  expect(mocks.after).not.toHaveBeenCalled();
});

it('limite par adresse IP atteinte : même réponse, rien d’écrit ni d’envoyé', async () => {
  mocks.limit.mockResolvedValue(false);
  expect(await subscribeNewsletterAction({ email: 'a@exemple.fr' })).toBe('ok');
  expect(mocks.create).not.toHaveBeenCalled();
  expect(mocks.after).not.toHaveBeenCalled();
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

it('désinscription : bon lien → inscription effacée et retirée de Brevo ; faux lien → même réponse, rien d’effacé', async () => {
  const id = 'a'.repeat(64);
  const t = 'b'.repeat(48);
  mocks.get.mockResolvedValue({ get: (k: string) => ({ unsubscribeToken: t, email: 'a@exemple.fr' } as Record<string, string>)[k] });
  expect(await unsubscribeNewsletterAction({ id, t: 'c'.repeat(48) })).toBe('ok');
  expect(mocks.del).not.toHaveBeenCalled();
  expect(await unsubscribeNewsletterAction({ id: '../x', t })).toBe('ok');
  expect(mocks.del).not.toHaveBeenCalled();
  expect(await unsubscribeNewsletterAction({ id, t })).toBe('ok');
  expect(mocks.del).toHaveBeenCalledWith(id);
  expect(mocks.sync).toHaveBeenCalledWith('a@exemple.fr', false);
});
