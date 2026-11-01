import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import AdminShell from '@/components/createur/AdminShell';
import { requireAdmin } from '@/server/auth/session';
import { countNewOrders } from '@/server/createur/orders';

// Atelier : droit `admin` relu sur le compte à chaque requête (chaque page et chaque action le revérifient).
export const metadata: Metadata = { title: 'Atelier | Jaelle & JC', robots: { index: false, follow: false } };

export default async function EspaceLayout({ children }: { children: ReactNode }) {
  if (!(await requireAdmin())) redirect('/atelier/connexion');
  return <AdminShell newOrders={await countNewOrders()}>{children}</AdminShell>;
}
