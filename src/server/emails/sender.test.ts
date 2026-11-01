import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const { sendEmail, SENDER } = await import('./sender');

const message = { to: 'cliente@exemple.fr', subject: 'Objet', html: '<p>Bonjour</p>', text: 'Bonjour' };

describe('envoi par Brevo', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it('sans clé : rien n’est envoyé', async () => {
    vi.stubEnv('BREVO_API_KEY', '');
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    expect(await sendEmail(message)).toBe('non-configure');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('envoi : clé en en-tête, expéditeur du domaine authentifié, destinataire unique', async () => {
    vi.stubEnv('BREVO_API_KEY', 'cle-test');
    vi.stubEnv('BREVO_API_URL', '');
    const fetch = vi.fn(async () => new Response('{}', { status: 201 }));
    vi.stubGlobal('fetch', fetch);
    expect(await sendEmail(message)).toBe('envoye');
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect((init.headers as Record<string, string>)['api-key']).toBe('cle-test');
    expect(JSON.parse(init.body as string)).toMatchObject({ sender: SENDER, to: [{ email: 'cliente@exemple.fr' }], subject: 'Objet' });
  });

  it('refus ou panne de Brevo : « echec », jamais d’exception', async () => {
    vi.stubEnv('BREVO_API_KEY', 'cle-test');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 400 })));
    expect(await sendEmail(message)).toBe('echec');
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('réseau'); }));
    expect(await sendEmail(message)).toBe('echec');
  });

  it('serveur de remplacement refusé sur Vercel', async () => {
    vi.stubEnv('BREVO_API_KEY', 'cle-test');
    vi.stubEnv('BREVO_API_URL', 'http://127.0.0.1:12111');
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubGlobal('fetch', vi.fn());
    await expect(sendEmail(message)).rejects.toThrow('BREVO_API_URL réservé aux tests locaux.');
  });
});
