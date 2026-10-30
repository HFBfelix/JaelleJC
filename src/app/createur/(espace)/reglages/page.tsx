import { redirect } from 'next/navigation';
import SettingsForms from '@/components/createur/SettingsForms';
import { AdminTitle } from '@/components/createur/ui';
import { requireAdmin } from '@/server/auth/session';
import { readSettings } from '@/server/createur/site';

export default async function ReglagesPage() {
  if (!(await requireAdmin())) redirect('/createur/connexion');
  const settings = await readSettings();
  return (
    <>
      <AdminTitle>Réglages</AdminTitle>
      <SettingsForms {...settings} />
    </>
  );
}
