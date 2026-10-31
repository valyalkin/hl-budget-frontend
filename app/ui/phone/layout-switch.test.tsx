import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DesktopOnly, PhoneOnly } from '@/app/ui/phone/layout-switch';

const { isPhone } = vi.hoisted(() => ({
  isPhone: { value: null as boolean | null },
}));
vi.mock('@/app/ui/phone/use-is-phone', () => ({
  useIsPhone: () => isPhone.value,
}));

function renderBoth() {
  return render(
    <>
      <DesktopOnly>
        <p>desktop tree</p>
      </DesktopOnly>
      <PhoneOnly>
        <p>phone tree</p>
      </PhoneOnly>
    </>,
  );
}

describe('DesktopOnly and PhoneOnly', () => {
  it('before the width is known: desktop in a box-less wrapper, phone as a skeleton', () => {
    isPhone.value = null;
    renderBoth();
    const desktop = screen.getByText('desktop tree');
    // The wrapper's classes are the point here: it must add no box on a desktop.
    // eslint-disable-next-line testing-library/no-node-access
    expect(desktop.parentElement).toHaveClass('contents', 'max-sm:hidden');
    expect(screen.queryByText('phone tree')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Loading spendings');
    // eslint-disable-next-line testing-library/no-node-access
    expect(screen.getByRole('status').closest('.sm\\:hidden')).not.toBeNull();
  });

  it('on a desktop: only the desktop tree', () => {
    isPhone.value = false;
    renderBoth();
    expect(screen.getByText('desktop tree')).toBeInTheDocument();
    expect(screen.queryByText('phone tree')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('on a phone: only the phone tree', () => {
    isPhone.value = true;
    renderBoth();
    expect(screen.getByText('phone tree')).toBeInTheDocument();
    expect(screen.queryByText('desktop tree')).not.toBeInTheDocument();
  });
});
