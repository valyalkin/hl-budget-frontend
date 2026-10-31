'use client';

import type { ReactNode } from 'react';
import PhoneSkeleton from '@/app/ui/phone/phone-skeleton';
import { useIsPhone } from '@/app/ui/phone/use-is-phone';

/**
 * The desktop tree, unchanged (research R-001). Before hydration CSS hides it below 640px; the
 * wrapper is `display: contents` at 640px and wider, so it adds no box. On a phone, once known,
 * it renders nothing, so desktop client code (such as the page's Enter shortcut) stops running.
 */
export function DesktopOnly({ children }: { children: ReactNode }) {
  const isPhone = useIsPhone();
  if (isPhone) {
    return null;
  }
  return <div className="contents max-sm:hidden">{children}</div>;
}

/**
 * The phone tree. Before hydration it shows a skeleton below 640px and nothing wider; once the
 * width is known it renders its children on a phone and nothing on a desktop.
 */
export function PhoneOnly({ children }: { children: ReactNode }) {
  const isPhone = useIsPhone();
  if (isPhone === null) {
    return (
      <div className="sm:hidden">
        <PhoneSkeleton />
      </div>
    );
  }
  return isPhone ? children : null;
}
