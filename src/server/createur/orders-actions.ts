'use server';

// Server Actions de l'espace créatrice : commandes (statut, expédition) et stocks. Droit admin relu à chaque appel.
import { z } from 'zod';
import { requireAdmin } from '../auth/session';
import { sendPendingEmails } from '../orders/notify';
import { moveOrder, setStock, shipInput, stockInput } from './orders';

// E-mail du nouveau statut : un échec d'envoi ne défait jamais le changement de statut (renvoi possible).
async function thenEmail(orderId: string, status: string) {
  if (status !== 'ok') return;
  try {
    await sendPendingEmails(orderId);
  } catch {
    console.error('espace créatrice : e-mail de commande non envoyé');
  }
}

type Denied = { status: 'connexion' | 'invalide' | 'erreur' };

async function run<T>(label: string, fn: (uid: string) => Promise<T>): Promise<T | Denied> {
  const admin = await requireAdmin();
  if (!admin) return { status: 'connexion' };
  try {
    return await fn(admin.uid);
  } catch {
    console.error(`espace créatrice : ${label} impossible`);
    return { status: 'erreur' };
  }
}

const orderId = z.string().regex(/^[A-Za-z0-9_-]{1,200}$/);

export async function moveOrderAction(input: unknown) {
  const parsed = z.strictObject({ orderId, to: z.enum(['preparing', 'delivered']) }).safeParse(input);
  if (!parsed.success) return { status: 'invalide' as const };
  return run('commande', async (uid) => {
    const status = await moveOrder(uid, parsed.data.orderId, parsed.data.to);
    await thenEmail(parsed.data.orderId, status);
    return { status };
  });
}

// Renvoi des e-mails restés « en attente » (Brevo indisponible au moment du changement de statut).
export async function resendOrderEmailsAction(input: unknown) {
  const parsed = z.strictObject({ orderId }).safeParse(input);
  if (!parsed.success) return { status: 'invalide' as const };
  return run('renvoi des e-mails', async () => {
    await sendPendingEmails(parsed.data.orderId);
    return { status: 'ok' as const };
  });
}

export async function shipOrderAction(input: unknown) {
  const parsed = shipInput.safeParse(input);
  if (!parsed.success || (parsed.data.carrier === 'autre' && !parsed.data.url)) return { status: 'invalide' as const };
  const { orderId: id, ...tracking } = parsed.data;
  return run('expédition', async (uid) => {
    const status = await moveOrder(uid, id, 'shipped', tracking);
    await thenEmail(id, status);
    return { status };
  });
}

export async function setStockAction(input: unknown) {
  const parsed = stockInput.safeParse(input);
  if (!parsed.success) return { status: 'invalide' as const };
  return run('stock', async (uid) => ({ status: await setStock(uid, parsed.data) }));
}
