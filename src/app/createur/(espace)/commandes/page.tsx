import { redirect } from 'next/navigation';
import OrderList from '@/components/createur/OrderList';
import { AdminTitle } from '@/components/createur/ui';
import { requireAdmin } from '@/server/auth/session';
import { listOrdersAdmin } from '@/server/createur/orders';

export default async function CommandesPage() {
  if (!(await requireAdmin())) redirect('/createur/connexion');
  const orders = await listOrdersAdmin();
  return (
    <>
      <AdminTitle>Commandes</AdminTitle>
      <OrderList orders={orders.map((o) => ({
        id: o.id, reference: o.reference, status: o.status, statusLabel: o.statusLabel, createdAt: o.createdAt?.toISOString() ?? null,
        name: o.shipping.name, totalCents: o.amounts.totalCents, items: o.items.reduce((n, i) => n + i.quantity, 0),
      }))} />
    </>
  );
}
