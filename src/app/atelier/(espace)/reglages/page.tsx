import { redirect } from 'next/navigation';
import AutomationsCard from '@/components/createur/AutomationsCard';
import EmailTextsCard from '@/components/createur/EmailTextsCard';
import SettingsForms from '@/components/createur/SettingsForms';
import UsageSearchCard from '@/components/createur/UsageSearchCard';
import { AdminTitle } from '@/components/createur/ui';
import { requireAdmin } from '@/server/auth/session';
import { readUsageStats } from '@/server/catalog/usage-service';
import { aiEnabled } from '@/server/createur/ai';
import { readSettings } from '@/server/createur/site';
import { readAutomationsState } from '@/server/emails/automations';
import { loadEmailTexts } from '@/server/emails/settings';

export default async function ReglagesPage() {
  if (!(await requireAdmin())) redirect('/atelier/connexion');
  const [settings, automations, emailTexts, usage] = await Promise.all([readSettings(), readAutomationsState(), loadEmailTexts(), readUsageStats()]);
  return (
    <>
      <AdminTitle>Réglages</AdminTitle>
      <SettingsForms {...settings} />
      <AutomationsCard {...automations} />
      <EmailTextsCard texts={emailTexts} aiAvailable={aiEnabled()} />
      <UsageSearchCard days={usage} />
    </>
  );
}
