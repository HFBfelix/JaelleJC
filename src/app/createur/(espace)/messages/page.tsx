import { redirect } from 'next/navigation';
import MessagesView from '@/components/createur/MessagesView';
import { AdminTitle } from '@/components/createur/ui';
import { requireAdmin } from '@/server/auth/session';
import { listMessages, listNewsletter } from '@/server/createur/site';

export default async function MessagesPage() {
  if (!(await requireAdmin())) redirect('/createur/connexion');
  const [messages, newsletter] = await Promise.all([listMessages(), listNewsletter()]);
  return (
    <>
      <AdminTitle>Messages et newsletter</AdminTitle>
      <MessagesView messages={messages} newsletterCount={newsletter.length} />
    </>
  );
}
