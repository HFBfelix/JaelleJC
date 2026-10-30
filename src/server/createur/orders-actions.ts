'use server';

// Server Actions de l'espace créatrice : commandes (statut, expédition) et stocks. Droit admin relu à chaque appel.
import { z } from 'zod';
import { requireAdmin } from '../auth/session';
import { moveOrder, setStock, shipInput, stockInput } from './orders';

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
  return run('commande', async (uid) => ({ status: await moveOrder(uid, parsed.data.orderId, parsed.data.to) }));
}

export async function shipOrderAction(input: unknown) {
  const parsed = shipInput.safeParse(input);
  if (!parsed.success || (parsed.data.carrier === 'autre' && !parsed.data.url)) return { status: 'invalide' as const };
  const { orderId: id, ...tracking } = parsed.data;
  return run('expédition', async (uid) => ({ status: await moveOrder(uid, id, 'shipped', tracking) }));
}

export async function setStockAction(input: unknown) {
  const parsed = stockInput.safeParse(input);
  if (!parsed.success) return { status: 'invalide' as const };
  return run('stock', async (uid) => ({ status: await setStock(uid, parsed.data) }));
}
