// Présentation des commandes de l'espace client : nouvelle commande, ancienne commande migrée, champs douteux.
import { describe, expect, it } from 'vitest';
import { byNewest, orderDetail } from './view';

const at = (iso: string) => ({ toDate: () => new Date(iso) });

describe('commande de la refonte', () => {
  const d = orderDetail('cs_test_abc', {
    userId: 'u1', reference: 'JJC-261029-ABCD', status: 'shipped', createdAt: at('2026-10-29T10:00:00Z'),
    items: [{ productId: 'p', variantId: 'v', name: 'Cape', variantLabel: 'Écru', quantity: 2, unitPriceCents: 8900 }],
    amounts: { subtotalCents: 17800, deliveryCents: 0, totalCents: 17800 },
    customer: { name: 'Camille Martin', email: 'c@exemple.test', phone: '+33600000000' }, shipping: { line1: '1 rue A', line2: '', zipCode: '75001', city: 'Paris' },
    gift: { wrap: true, message: 'Bienvenue' },
    tracking: { carrier: 'Colissimo', number: '6A123', url: 'https://www.laposte.fr/outils/suivre-vos-envois?code=6A123' },
  });

  it('référence, statut en français, lignes et montants', () => {
    expect(d).toMatchObject({ reference: 'JJC-261029-ABCD', statusLabel: 'Expédiée', amounts: { totalCents: 17800 } });
    expect(d.items[0]).toMatchObject({ name: 'Cape', variantLabel: 'Écru', quantity: 2, unitPriceCents: 8900 });
    expect(d.shipping.name).toBe('Camille Martin');
    expect(d.contact).toEqual({ email: 'c@exemple.test', phone: '+33600000000' });
    expect(d.tracking?.url).toMatch(/^https:\/\//);
  });
});

describe('ancienne commande migrée ou champs douteux', () => {
  it('sans référence : 8 premiers caractères de l’identifiant, en capitales', () => {
    expect(orderDetail('a1b2c3d4e5f6', { items: [] }).reference).toBe('A1B2C3D4');
  });

  it('statut inconnu : présenté comme payée ; montants non entiers : 0', () => {
    const d = orderDetail('x', { status: 'bizarre', amounts: { totalCents: '89' }, items: [{ name: 3, quantity: 1.5 }] });
    expect(d.statusLabel).toBe('Payée');
    expect(d.amounts.totalCents).toBe(0);
    expect(d.items[0]).toMatchObject({ name: '', quantity: 0 });
  });

  it.each(['javascript:alert(1)', 'http://suivi.exemple.fr', 'pas une adresse'])('lien de suivi %s : retiré', (url) => {
    expect(orderDetail('x', { tracking: { carrier: 'X', number: '1', url } }).tracking).toEqual({ carrier: 'X', number: '1', url: '' });
  });

  it('suivi sans numéro : pas de bloc de suivi', () => {
    expect(orderDetail('x', { tracking: { carrier: 'X', number: '', url: '' } }).tracking).toBeNull();
  });
});

it('tri : plus récente d’abord, sans date à la fin', () => {
  const list = [
    orderDetail('a', { createdAt: at('2026-01-01T00:00:00Z') }),
    orderDetail('b', {}),
    orderDetail('c', { createdAt: at('2026-10-01T00:00:00Z') }),
  ].sort(byNewest);
  expect(list.map((o) => o.id)).toEqual(['c', 'a', 'b']);
});
