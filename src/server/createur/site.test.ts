// Espace créatrice : export CSV (injection de formule neutralisée), saisies des catégories et réglages, actions sans droit.
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('../auth/session', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('../firebase/admin', () => ({ adminDb: () => { throw new Error('base touchée'); } }));

const { categoryInput, deliveryInput, siteInput, toCsv } = await import('./site');
const actions = await import('./site-actions');

describe('export CSV', () => {
  it('séparateur « ; », guillemets doublés, retours à la ligne aplatis', () => {
    expect(toCsv([{ a: 'x;y', b: 'il a dit "oui"\nmerci' }], ['a', 'b'])).toBe('a;b\r\n"x;y";"il a dit ""oui"" merci"');
  });
  it.each(['=HYPERLINK("http://x")', '+33 6 00', '-2+3', '@SUM(A1)', '\t=1'])('formule « %s » neutralisée', (v) => {
    expect(toCsv([{ a: v }], ['a']).split('\r\n')[1]).toBe(`"'${v.replace(/"/g, '""')}"`);
  });
  it('retour chariot isolé : aplati, la cellule reste sur une ligne', () => {
    expect(toCsv([{ a: 'a\rb' }], ['a'])).toBe('a\r\n"a b"');
  });
});

describe('saisies', () => {
  it('catégorie : slug piégé ou trop de familles refusés', () => {
    expect(categoryInput.safeParse({ slug: '../x', name: 'A', order: 0, intro: '', subs: [] }).success).toBe(false);
    expect(categoryInput.safeParse({ name: 'A', order: 0, intro: '', subs: Array.from({ length: 21 }, () => ({ name: 'f' })) }).success).toBe(false);
  });
  it('livraison : montant négatif, décimal ou sans zone refusé', () => {
    const ok = { freeThresholdCents: 15000, flatRateCents: 690, zones: ['France'], estimatedDays: '' };
    expect(deliveryInput.safeParse(ok).success).toBe(true);
    for (const over of [{ flatRateCents: -1 }, { freeThresholdCents: 10.5 }, { zones: [] }]) expect(deliveryInput.safeParse({ ...ok, ...over }).success).toBe(false);
  });
  it('maison : lien Instagram d’un autre site refusé', () => {
    expect(siteInput.safeParse({ legalName: '', address: '', email: '', instagram: 'https://evil.example/x' }).success).toBe(false);
  });
});

it('sans droit admin : aucune action de réglage ne s’exécute', async () => {
  mocks.requireAdmin.mockResolvedValue(null);
  expect(await actions.saveDeliveryAction({ freeThresholdCents: 0, flatRateCents: 0, zones: ['France'], estimatedDays: '' })).toEqual({ status: 'connexion' });
  expect(await actions.saveCategoryAction({ name: 'A', order: 0, intro: '', subs: [] })).toEqual({ status: 'connexion' });
  expect(await actions.exportAction({ what: 'newsletter' })).toEqual({ status: 'connexion' });
  expect(await actions.markReadAction({ id: 'x' })).toEqual({ status: 'connexion' });
  expect(await actions.saveSiteAction({ legalName: '', address: '', email: '', instagram: '' })).toEqual({ status: 'connexion' });
});
