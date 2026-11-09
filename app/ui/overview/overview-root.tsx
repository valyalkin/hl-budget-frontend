'use client';

import type { ReactNode } from 'react';
import { useIsPhone } from '@/app/ui/phone/use-is-phone';

/**
 * The Overview's outer box. On a phone it is the phone layout's root (`data-layout="phone"`), as
 * on the other tabs, so the header, the content and any open sheet sit in one tree (R-008).
 */
export default function OverviewRoot({ children }: { children: ReactNode }) {
  const isPhone = useIsPhone();
  return (
    <div
      data-layout={isPhone === null ? undefined : isPhone ? 'phone' : 'desktop'}
      className="min-h-dvh bg-ground"
    >
      {children}
    </div>
  );
}
