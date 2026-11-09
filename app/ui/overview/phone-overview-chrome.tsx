import { getSettingsData } from '@/app/lib/data';
import PhoneOverviewShell from '@/app/ui/overview/phone-overview-shell';

/** Loads what the phone's Settings shows, for the Overview's account menu (specs/011 R-008). */
export default async function PhoneOverviewChrome() {
  const settings = await getSettingsData();
  return <PhoneOverviewShell settings={settings} />;
}
