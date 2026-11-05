// Formulaire de contact : saisie validée, robot ignoré, limite par adresse IP, rien de personnel dans le journal.
import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ add: vi.fn(), limit: vi.fn() }));
vi.mock('../firebase/admin', () => ({ adminDb: () => ({ collection: () => ({ add: mocks.add }) }) }));
vi.mock('../http/rate-limit', () => ({ takeRateLimit: mocks.limit, clientIp: async () => '203.0.113.7' }));
const { sendContactAction } = await import('./actions');

const valid = { name: 'Camille Martin', email: ' Camille@Exemple.FR ', message: 'Bonjour, une question sur la cape de bain.', website: '' };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.add.mockResolvedValue(undefined);
  mocks.limit.mockResolvedValue(true);
});

it('message valide : enregistré par le serveur, non lu, e-mail en minuscules', async () => {
  expect(await sendContactAction(valid)).toBe('ok');
  expect(mocks.add).toHaveBeenCalledWith(expect.objectContaining({
    name: 'Camille Martin', email: 'camille@exemple.fr', message: valid.message, status: 'unread', subject: 'Demande d’information',
  }));
  expect(mocks.limit).toHaveBeenCalledWith('contact-ip', '203.0.113.7', 5, 3600_000);
});

it('robot (champ piège rempli) : même réponse, rien d’écrit', async () => {
  expect(await sendContactAction({ ...valid, website: 'http://spam' })).toBe('ok');
  expect(mocks.add).not.toHaveBeenCalled();
});

it.each([
  { ...valid, email: 'pas-un-email' }, { ...valid, message: 'court' }, { ...valid, message: 'x'.repeat(5001) },
  { ...valid, name: '' }, { ...valid, name: 'x'.repeat(101) }, { ...valid, name: '<script>' }, { ...valid, name: 'A\nB' },
  { ...valid, status: 'read' }, null,
])('saisie invalide %# : refusée, rien d’écrit', async (input) => {
  expect(await sendContactAction(input)).toBe('invalide');
  expect(mocks.add).not.toHaveBeenCalled();
});

it('plus de 5 messages dans l’heure depuis la même adresse IP : « limite »', async () => {
  mocks.limit.mockResolvedValue(false);
  expect(await sendContactAction(valid)).toBe('limite');
  expect(mocks.add).not.toHaveBeenCalled();
});

it('erreur en base : « erreur », sans l’adresse ni le message dans le journal', async () => {
  mocks.add.mockRejectedValue(new Error('panne'));
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  expect(await sendContactAction(valid)).toBe('erreur');
  expect(JSON.stringify(spy.mock.calls)).not.toMatch(/camille|cape de bain/i);
  spy.mockRestore();
});
