import { describe, expect, it } from 'vitest';
import type { NewOrder } from '../checkout/logic';
import { escapeHtml, newsletterWelcome, orderConfirmation, orderPreparing, orderShipped, shopNotification, stockApology } from './templates';

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

describe('e-mails de suivi de commande', () => {
  it('en préparation : texte échappé, objet sur une ligne', () => {
    const m = orderPreparing(order());
    expect(m.subject).toBe('Votre commande Jaelle & JC — JJC-261029-ABCD : en préparation');
    expect(m.html).not.toContain('<script>');
    expect(m.to).toBe('cliente@exemple.fr');
  });

  it('colis en route : numéro et lien du transporteur ; lien non https ignoré', () => {
    const shipped = { ...order(), tracking: { carrier: 'Colissimo', number: '6A12345678901', url: 'https://www.laposte.fr/outils/suivre-vos-envois?code=6A12345678901' } };
    const m = orderShipped(shipped);
    expect(m.subject).toBe('Votre colis est en route — JJC-261029-ABCD');
    expect(m.html).toContain('6A12345678901');
    expect(m.html).toContain('href="https://www.laposte.fr/outils/suivre-vos-envois?code=6A12345678901"');
    const bad = orderShipped({ ...shipped, tracking: { ...shipped.tracking, url: 'javascript:alert(1)' } });
    expect(bad.html).not.toContain('javascript:');
  });
});

describe('e-mail d’inscription à la newsletter', () => {
  it('pièce échappée, lien de désinscription, Instagram ; sans pièce : pas de photo', () => {
    const m = newsletterWelcome('a@exemple.fr', 'https://www.jaellejc.com/newsletter/desinscription?id=1&t=2', 'https://www.jaellejc.com',
      { name: '<b>Cabas</b>', priceCents: 6500, image: 'https://firebasestorage.googleapis.com/x.jpg', url: 'https://www.jaellejc.com/produits/cabas' });
    expect(m.subject).toBe('Bienvenue dans la lettre Jaelle & JC');
    expect(m.html).toContain('&lt;b&gt;Cabas&lt;/b&gt;');
    expect(m.html).toContain('href="https://www.jaellejc.com/newsletter/desinscription?id=1&amp;t=2"');
    expect(m.html).toContain('https://www.instagram.com/jaellejc/');
    expect(newsletterWelcome('a@exemple.fr', 'u', 'https://www.jaellejc.com').html).not.toContain('firebasestorage');
  });
});
