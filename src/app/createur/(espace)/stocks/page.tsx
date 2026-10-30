import { redirect } from 'next/navigation';
import StockTable from '@/components/createur/StockTable';
import { AdminTitle } from '@/components/createur/ui';
import { requireAdmin } from '@/server/auth/session';
import { listStocks } from '@/server/createur/orders';

export default async function StocksPage() {
  if (!(await requireAdmin())) redirect('/createur/connexion');
  return (
    <>
      <AdminTitle>Stocks</AdminTitle>
      <StockTable rows={await listStocks()} />
    </>
  );
}
