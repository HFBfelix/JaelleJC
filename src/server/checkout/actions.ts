'use server';

// Server Action « Confirmer et payer ». Entrées : option cadeau, adresse de livraison confirmée et choix de
// l'enregistrer (Zod strict, aucun prix).
// Session obligatoire : la commande appartient toujours à un compte (parcours « e-mail d'abord »).
import { getSessionUser } from '../auth/session';
import { checkoutInput } from './logic';
import { startCheckout, type StartCheckoutResult } from './service';

export type CheckoutActionResult = StartCheckoutResult | { status: 'connexion' | 'invalide' | 'erreur' };

export async function startCheckoutAction(input: unknown): Promise<CheckoutActionResult> {
  const parsed = checkoutInput.safeParse(input);
  if (!parsed.success) return { status: 'invalide' };
  const user = await getSessionUser();
  if (!user) return { status: 'connexion' };
  try {
    return await startCheckout(user, parsed.data.gift, parsed.data.shipping, parsed.data.saveAddress);
  } catch {
    console.error('paiement : création de la session impossible'); // ni panier, ni adresse dans le journal
    return { status: 'erreur' };
  }
}
