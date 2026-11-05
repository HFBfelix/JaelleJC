// Newsletter : e-mail validé, robot ignoré, même réponse déjà inscrite ou non, jamais l'adresse dans le journal.
// Double confirmation (2026-11-05) : la demande reste « en_attente » ; seul le clic de confirmation date le consentement,
// envoie la bienvenue et ajoute l'adresse à Brevo. Désinscription par lien.
import { beforeEach, expect, it, vi } from 'vitest';

type Doc = Record<string, unknown> | null;
const mocks = vi.hoisted(() => ({
  doc: vi.fn<(id: string) => Doc>(), create: vi.fn(), update: vi.fn(), existing: vi.fn<() => string | null>(), del: vi.fn(),
  after: vi.fn(), send: vi.fn(), sync: vi.fn(), limit: vi.fn(),
}));
const snapOf = (id: string) => {
  const data = mocks.doc(id);
  return { exists: !!data, get: (k: string) => (data ?? {})[k] };
};
vi.mock('../firebase/admin', () => ({
  adminDb: () => ({
    collection: () => ({
      doc: (id: string) => ({ id, get: async () => snapOf(id), delete: async () => mocks.del(id) }),
      where: () => ({ limit: () => ({ get: async () => {
        const id = mocks.existing();
        return { empty: !id, docs: id ? [{ id }] : [] };
      } }) }),
    }),
    runTransaction: async (fn: (tx: unknown) => unknown) => fn({
      get: async (ref: { id: string }) => snapOf(ref.id),
      create: (ref: { id: string }, d: unknown) => mocks.create(ref.id, d),
      update: (ref: { id: string }, d: unknown) => mocks.update(ref.id, d),
    }),
  }),
}));
vi.mock('next/server', () => ({ after: mocks.after }));
vi.mock('../http/origin', () => ({ siteOrigin: async () => 'https://www.jaellejc.com' }));
vi.mock('../http/rate-limit', () => ({ takeRateLimit: mocks.limit, clientIp: async () => '203.0.113.7' }));
vi.mock('../emails/sender', () => ({ sendEmail: mocks.send, syncNewsletterContact: mocks.sync }));
vi.mock('../emails/settings', async () => ({ loadEmailTexts: async () => (await import('../emails/texts')).defaultTexts() }));
vi.mock('../emails/featured', () => ({ featuredPiece: async () => ({ name: 'Cabas', priceCents: 6500, image: 'https://firebasestorage.googleapis.com/x.jpg', url: 'https://www.jaellejc.com/produits/cabas' }) }));

const { confirmNewsletterAction, subscribeNewsletterAction, unsubscribeNewsletterAction } = await import('./actions');
const CONFIRM_WINDOW_MS = 48 * 3600 * 1000; // validité du lien (constante privée du fichier « use server »)
const ts = (ms: number) => ({ toMillis: () => ms });
const runAfter = async () => { for (const [fn] of mocks.after.mock.calls) await fn(); };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.doc.mockReturnValue(null); mocks.existing.mockReturnValue(null); mocks.limit.mockResolvedValue(true);
  mocks.send.mockResolvedValue('envoye'); mocks.sync.mockResolvedValue('envoye');
});

it('page /newsletter : source « page_newsletter » enregistrée ; toute autre source refusée', async () => {
  expect(await subscribeNewsletterAction({ email: 'a@exemple.fr', source: 'page_newsletter' })).toBe('ok');
  expect(mocks.create).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ source: 'page_newsletter' }));
  expect(await subscribeNewsletterAction({ email: 'a@exemple.fr', source: 'email_redirect' })).toBe('invalide');
});

it('nouvelle adresse : demande « en_attente » (minuscules, empreinte, sans consentement) ; e-mail de confirmation seulement', async () => {
  expect(await subscribeNewsletterAction({ email: ' Camille@Exemple.FR ', website: '' })).toBe('ok');
  expect(mocks.create).toHaveBeenCalledWith(expect.stringMatching(/^[a-f0-9]{64}$/), expect.objectContaining({
    email: 'camille@exemple.fr', source: 'footer_site', status: 'en_attente',
    confirmToken: expect.stringMatching(/^[a-f0-9]{48}$/), unsubscribeToken: expect.stringMatching(/^[a-f0-9]{48}$/),
  }));
  const created = mocks.create.mock.calls[0]![1] as Record<string, unknown>;
  expect(created.consentAt).toBeUndefined();
  expect(mocks.send).not.toHaveBeenCalled();
  await runAfter();
  const message = mocks.send.mock.calls[0]![0] as { to: string; subject: string; text: string };
  expect(message.to).toBe('camille@exemple.fr');
  expect(message.subject).toBe('Confirmez votre inscription à la lettre Jaelle & JC');
  expect(message.text).toContain(`https://www.jaellejc.com/newsletter/confirmation?id=${mocks.create.mock.calls[0]![0]}&t=${created.confirmToken}`);
  expect(mocks.sync).not.toHaveBeenCalled(); // rien chez Brevo avant le clic
});

it('déjà inscrite (ancienne inscription, ou confirmée) ou demande encore valable : même réponse, aucun e-mail', async () => {
  mocks.existing.mockReturnValue('ancien-identifiant');
  expect(await subscribeNewsletterAction({ email: 'a@exemple.fr' })).toBe('ok');
  mocks.existing.mockReturnValue(null);
  mocks.doc.mockReturnValue({ email: 'a@exemple.fr' }); // confirmée (sans statut)
  expect(await subscribeNewsletterAction({ email: 'a@exemple.fr' })).toBe('ok');
  mocks.doc.mockReturnValue({ email: 'a@exemple.fr', status: 'en_attente', expiresAt: ts(Date.now() + 3600_000) });
  expect(await subscribeNewsletterAction({ email: 'a@exemple.fr' })).toBe('ok');
  expect(mocks.create).not.toHaveBeenCalled();
  expect(mocks.update).not.toHaveBeenCalled();
  expect(mocks.after).not.toHaveBeenCalled();
});

it('demande expirée sans confirmation : relancée avec un nouveau jeton', async () => {
  mocks.doc.mockReturnValue({ email: 'a@exemple.fr', status: 'en_attente', confirmToken: 'x'.repeat(48), expiresAt: ts(Date.now() - 1) });
  expect(await subscribeNewsletterAction({ email: 'a@exemple.fr' })).toBe('ok');
  expect(mocks.update).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ status: 'en_attente', confirmToken: expect.not.stringMatching(/^x+$/) }));
  expect(mocks.after).toHaveBeenCalledTimes(1);
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
  mocks.create.mockImplementation(() => { throw new Error('panne'); });
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  expect(await subscribeNewsletterAction({ email: 'secret@exemple.fr' })).toBe('erreur');
  expect(JSON.stringify(spy.mock.calls)).not.toContain('secret@exemple.fr');
  spy.mockRestore();
});

const id = 'a'.repeat(64);
const t = 'b'.repeat(48);
const pending = (over: Record<string, unknown> = {}) => ({
  email: 'a@exemple.fr', status: 'en_attente', confirmToken: t, unsubscribeToken: 'c'.repeat(48), expiresAt: ts(Date.now() + CONFIRM_WINDOW_MS), ...over,
});

it('confirmation : bon lien → consentement daté, jetons de confirmation effacés, bienvenue et liste Brevo', async () => {
  mocks.doc.mockReturnValue(pending());
  expect(await confirmNewsletterAction({ id, t })).toBe('ok');
  expect(mocks.update).toHaveBeenCalledWith(id, expect.objectContaining({ consentAt: expect.anything(), status: expect.anything(), confirmToken: expect.anything() }));
  await runAfter();
  const message = mocks.send.mock.calls[0]![0] as { to: string; subject: string; text: string };
  expect(message).toMatchObject({ to: 'a@exemple.fr', subject: 'Bienvenue dans la lettre Jaelle & JC' });
  expect(message.text).toContain(`/newsletter/desinscription?id=${id}&t=${'c'.repeat(48)}`);
  expect(mocks.sync).toHaveBeenCalledWith('a@exemple.fr', true);
});

it('confirmation : faux jeton, lien expiré, déjà confirmée, inconnue ou mal formée → « invalide », rien d’écrit ni d’envoyé', async () => {
  for (const doc of [pending({ confirmToken: 'd'.repeat(48) }), pending({ expiresAt: ts(Date.now() - 1) }), { email: 'a@exemple.fr' }, null]) {
    mocks.doc.mockReturnValue(doc);
    expect(await confirmNewsletterAction({ id, t })).toBe('invalide');
  }
  for (const input of [{ id: '../x', t }, { id, t: 'court' }, { id, t, x: 1 }, null]) expect(await confirmNewsletterAction(input)).toBe('invalide');
  expect(mocks.update).not.toHaveBeenCalled();
  expect(mocks.after).not.toHaveBeenCalled();
});

it('désinscription : bon lien → inscription effacée et retirée de Brevo ; faux lien → même réponse, rien d’effacé', async () => {
  mocks.doc.mockReturnValue({ unsubscribeToken: t, email: 'a@exemple.fr' });
  expect(await unsubscribeNewsletterAction({ id, t: 'c'.repeat(48) })).toBe('ok');
  expect(mocks.del).not.toHaveBeenCalled();
  expect(await unsubscribeNewsletterAction({ id: '../x', t })).toBe('ok');
  expect(mocks.del).not.toHaveBeenCalled();
  expect(await unsubscribeNewsletterAction({ id, t })).toBe('ok');
  expect(mocks.del).toHaveBeenCalledWith(id);
  expect(mocks.sync).toHaveBeenCalledWith('a@exemple.fr', false);
});
