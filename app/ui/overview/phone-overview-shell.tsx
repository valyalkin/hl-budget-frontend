'use client';

import { Fragment, useEffect } from 'react';
import type { SettingsData } from '@/app/lib/definitions';
import AccountMenu from '@/app/ui/phone/account-menu';
import PhoneHeader from '@/app/ui/phone/phone-header';
import PhoneSettings from '@/app/ui/phone/phone-settings';
import { usePhoneUi } from '@/app/ui/phone/phone-ui-provider';
import { useIsPhone } from '@/app/ui/phone/use-is-phone';

/**
 * The phone chrome around the Overview (specs/011 research R-008): the header with the
 * Spendings | Income | Overview switch, and the account menu with Settings and Sign out. There is
 * nothing to import into here, so the menu has no Import CSV. Before hydration CSS shows it only
 * below 640px; once the width is known it renders nothing on a desktop and closes its layers.
 */
export default function PhoneOverviewShell({
  settings,
}: {
  settings: SettingsData;
}) {
  const isPhone = useIsPhone();
  const ui = usePhoneUi();
  const { reset } = ui;

  useEffect(() => {
    if (isPhone === false) {
      reset();
    }
  }, [isPhone, reset]);

  if (isPhone === false) {
    return null;
  }
  return (
    <div className="contents sm:hidden">
      <PhoneHeader current="overview" />
      {ui.layers.map((layer, index) => (
        <Fragment key={`${index}-${layer.kind}`}>
          {layer.kind === 'menu' ? <AccountMenu allowImport={false} /> : null}
          {layer.kind === 'settings' ? (
            <PhoneSettings {...settings} initialTab={layer.tab} />
          ) : null}
        </Fragment>
      ))}
    </div>
  );
}
