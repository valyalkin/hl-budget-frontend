import { getAccounts, getCategories } from '@/app/lib/data';
import SettingsDialog from '@/app/ui/settings/settings-dialog';

/** Loads what Settings shows and hands it to the dialog as plain arrays (research R-011). */
export default async function SettingsSection() {
  const [categories, accounts] = await Promise.all([
    getCategories(),
    getAccounts(),
  ]);
  return <SettingsDialog categories={categories} accounts={accounts} />;
}
