import { describe, expect, it } from 'vitest';
import type { NewOrder } from '../checkout/logic';
import { escapeHtml, orderConfirmation, shopNotification, stockApology } from './templates';

const order = (over: Partial<NewOrder> = {}): NewOrder => ({
  userId: 'u1',
  reference: 'JJC-261029-ABCD',
  items: [{ productId: 'a', variantId: 'unique', sku: 'S', name: 'Cape <b>bleue</b>', variantLabel: '', image: '', unitPriceCents: 8900, quantity: 1 }],
  amounts: { subtotalCents: 8900, deliveryCents: 0, totalCents: 8900 },
  customer: { uid: 'u1', email: 'cliente@exemple.fr', name: '<script>alert(1)</script>', phone: '' },
  shipping: { line1: '1 rue "A"', line2: '', zipCode: '75001', city: 'Paris', country: 'FR' },
  gift: { wrap: true, message: "<img src=x onerror=alert(1)>\nBienvenue" },
  stripe: { sessionId: 'cs_test_x', paymentIntentId: 'pi_x', eventId: 'evt_x' },
  status: 'paid',
  refund: null,
  tracking: null,
  emails: { cliente: 'en_attente', boutique: 'en_attente' },
  ...over,
});

describe('e-mails : tout texte saisi est échappé', () => {
  it('échappement', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  });

  it.each([
    ['confirmation', orderConfirmation(order())],
    ['excuses', stockApology(order({ status: 'refunded', refund: { reason: 'stock', id: null } }))],
    ['boutique', shopNotification(order(), 'contact@jaellejc.com')],
  ])('%s : aucune balise de la cliente ou de la base dans le HTML', (_, mail) => {
    expect(mail.html).not.toMatch(/<script|<img|<b>bleue/);
  });

  it('confirmation : objet, destinataire, référence, cadeau', () => {
    const mail = orderConfirmation(order());
    expect(mail.to).toBe('cliente@exemple.fr');
    expect(mail.subject).toBe('Votre commande Jaelle & JC — JJC-261029-ABCD');
    expect(mail.html).toContain('Emballage cadeau');
    expect(mail.html).toContain('&lt;img src=x onerror=alert(1)&gt;<br>Bienvenue');
    expect(mail.html).toContain('Offerte');
  });

  it('objet sur une seule ligne (pas d’en-tête injecté)', () => {
    expect(orderConfirmation(order({ reference: 'R\r\nBcc: x@y.z' })).subject).not.toMatch(/[\r\n]/);
  });

  it('excuses : montant remboursé ; motif « montant » sans parler de stock', () => {
    expect(stockApology(order({ status: 'refunded', refund: { reason: 'stock', id: null } })).html).toContain('trouvé preneur');
    expect(stockApology(order({ status: 'refunded', refund: { reason: 'montant', id: null } })).html).not.toContain('trouvé preneur');
  });

  it('boutique : adresse de notification choisie par Jaelle', () => {
    expect(shopNotification(order(), 'contact@jaellejc.com').to).toBe('contact@jaellejc.com');
  });
});
