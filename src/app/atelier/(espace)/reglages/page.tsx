import { redirect } from 'next/navigation';
import AutomationsCard from '@/components/createur/AutomationsCard';
import SettingsForms from '@/components/createur/SettingsForms';
import { AdminTitle } from '@/components/createur/ui';
import { requireAdmin } from '@/server/auth/session';
import { readSettings } from '@/server/createur/site';
import { readAutomationsState } from '@/server/emails/automations';

export default async function ReglagesPage() {
  if (!(await requireAdmin())) redirect('/atelier/connexion');
  const [settings, automations] = await Promise.all([readSettings(), readAutomationsState()]);
  return (
    <>
      <AdminTitle>Réglages</AdminTitle>
      <SettingsForms {...settings} />
      <AutomationsCard {...automations} />
    </>
  );
}
