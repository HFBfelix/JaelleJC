// E-mails du parcours d'achat (EDITORIAL.md §6), purs et testés. Tout texte venu d'une cliente ou de la base
// (nom, adresse, mot pour la naissance, noms des pièces) est échappé avant d'entrer dans le HTML.
// Style repris de l'e-mail de confirmation de l'ancien site, typographie « Atelier » (droit, 11 px au moins).
import type { NewOrder } from '../checkout/logic';

export type EmailMessage = { to: string; subject: string; html: string; text: string };

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

// Objet d'e-mail : une seule ligne (aucun saut de ligne injectable dans les en-têtes).
const oneLine = (value: string) => value.replace(/[\r\n]+/g, ' ').trim();

const euros = (cents: number) => (cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2).replace('.', ','));

const layout = (body: string) => `<!doctype html><html lang="fr"><body style="margin:0;background:#ffffff;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;padding:40px 24px;font-family:'Source Sans 3',Arial,sans-serif;font-size:14px;line-height:1.7;color:#000;">
<tr><td>${body}
<p style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#999;margin-top:48px;">Jaelle &amp; JC — cousu main en Île-de-France</p>
</td></tr></table></body></html>`;

function itemsTable(order: NewOrder) {
  const rows = order.items.map((i) => `<tr>
<td style="padding:12px 0;border-bottom:0.5px solid #eee;">${escapeHtml(i.name)}${i.variantLabel ? ` — ${escapeHtml(i.variantLabel)}` : ''}</td>
<td align="center" style="padding:12px 0;border-bottom:0.5px solid #eee;color:#666;">${i.quantity}</td>
<td align="right" style="padding:12px 0;border-bottom:0.5px solid #eee;">${euros(i.unitPriceCents * i.quantity)} €</td></tr>`).join('');
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-top:0.5px solid #000;">${rows}</table>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
<tr><td style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#999;">Livraison</td><td align="right">${order.amounts.deliveryCents ? `${euros(order.amounts.deliveryCents)} €` : 'Offerte'}</td></tr>
<tr><td style="padding-top:12px;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;font-weight:600;">Total</td><td align="right" style="padding-top:12px;font-size:20px;">${euros(order.amounts.totalCents)} €</td></tr></table>`;
}

const address = (order: NewOrder) => [order.customer.name, order.shipping.line1, order.shipping.line2,
  `${order.shipping.zipCode} ${order.shipping.city}`.trim()].filter(Boolean).map(escapeHtml).join('<br>');

function giftBlock(order: NewOrder) {
  if (!order.gift.wrap) return '';
  const message = order.gift.message
    ? `<p style="margin:8px 0 0;">« ${escapeHtml(order.gift.message).replace(/\r?\n/g, '<br>')} »</p>` : '';
  return `<div style="border-left:0.5px solid #000;padding:4px 0 4px 20px;margin:24px 0;">
<p style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#999;margin:0;">Emballage cadeau</p>${message}</div>`;
}

export function orderConfirmation(order: NewOrder): EmailMessage {
  const html = layout(`
<p style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#999;">Commande confirmée</p>
<h1 style="font-family:'Crimson Pro',Georgia,serif;font-weight:400;font-size:28px;margin:8px 0;">Merci pour votre commande.</h1>
<p style="color:#666;">Référence : ${escapeHtml(order.reference)}</p>
<p>Bonjour ${escapeHtml(order.customer.name || '')},</p>
<p style="color:#666;">Nous préparons votre sélection avec le plus grand soin. Voici le détail de votre commande :</p>
${itemsTable(order)}${giftBlock(order)}
<div style="background:#F7F7F7;padding:20px;margin-top:24px;">
<p style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#999;margin:0 0 8px;">Livraison</p>
<p style="margin:0;">${address(order)}</p></div>`);
  const text = [`Merci pour votre commande ${order.reference}.`, ...order.items.map((i) => `${i.quantity} × ${i.name} : ${euros(i.unitPriceCents * i.quantity)} €`),
    `Total : ${euros(order.amounts.totalCents)} €`].join('\n');
  return { to: order.customer.email, subject: oneLine(`Votre commande Jaelle & JC — ${order.reference}`), html, text };
}

export function stockApology(order: NewOrder): EmailMessage {
  const stock = order.refund?.reason !== 'montant';
  const html = layout(`
<h1 style="font-family:'Crimson Pro',Georgia,serif;font-weight:400;font-size:28px;margin:8px 0;">${stock ? 'Votre pièce a trouvé preneur.' : 'Votre commande n’a pas pu aboutir.'}</h1>
<p>Bonjour ${escapeHtml(order.customer.name || '')},</p>
<p>${stock ? 'Pendant votre paiement, la dernière pièce disponible a été commandée.' : 'Un problème est survenu pendant votre paiement.'} Nous sommes sincèrement désolées.</p>
<p>Votre paiement de ${euros(order.amounts.totalCents)} € vous est intégralement remboursé. Le remboursement apparaît sur votre relevé sous quelques jours, selon votre banque.</p>
<p style="color:#666;">Référence : ${escapeHtml(order.reference)}</p>`);
  const text = `Votre pièce a trouvé preneur pendant votre paiement. Vos ${euros(order.amounts.totalCents)} € vous sont intégralement remboursés. Référence : ${order.reference}.`;
  return { to: order.customer.email, subject: oneLine(`Votre commande Jaelle & JC — ${order.reference} : remboursement`), html, text };
}

export function shopNotification(order: NewOrder, shopEmail: string): EmailMessage {
  const refunded = order.status === 'refunded';
  const html = layout(`
<h1 style="font-family:'Crimson Pro',Georgia,serif;font-weight:400;font-size:24px;margin:8px 0;">${refunded ? 'Commande remboursée automatiquement' : 'Nouvelle commande'}</h1>
<p>Référence : ${escapeHtml(order.reference)}${refunded ? ` — motif : ${order.refund?.reason === 'stock' ? 'stock insuffisant' : 'montant inattendu'}` : ''}</p>
${itemsTable(order)}${giftBlock(order)}
<p>${address(order)}<br>Téléphone : ${escapeHtml(order.customer.phone || 'non renseigné')}<br>E-mail : ${escapeHtml(order.customer.email)}</p>`);
  const text = `${refunded ? 'Commande remboursée' : 'Nouvelle commande'} ${order.reference} : ${euros(order.amounts.totalCents)} €.`;
  return { to: shopEmail, subject: oneLine(`${refunded ? 'Remboursement' : 'Nouvelle commande'} — ${order.reference}`), html, text };
}
