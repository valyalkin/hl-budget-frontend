import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import YearPicker from '@/app/ui/overview/year-picker';

const linkProps: Record<string, unknown>[] = [];
vi.mock('next/link', () => ({
  default: (
    props: Record<string, unknown> & {
      href: string;
      children: React.ReactNode;
    },
  ) => {
    linkProps.push(props);
    return (
      <a
        href={props.href}
        aria-label={String(props['aria-label'])}
        className={String(props.className)}
      >
        {props.children}
      </a>
    );
  },
}));

describe('YearPicker (specs/011 US4)', () => {
  it('steps a year either way, keeping ?month=, without adding history or scrolling', () => {
    linkProps.length = 0;
    render(
      <YearPicker
        year={2025}
        minYear={2023}
        currentYear={2026}
        month="2026-03"
      />,
    );
    const group = screen.getByRole('group', { name: 'Choose year' });
    expect(within(group).getByText('2025')).toHaveAttribute(
      'aria-live',
      'polite',
    );
    expect(
      within(group).getByRole('link', { name: 'Previous year' }),
    ).toHaveAttribute('href', '/overview?month=2026-03&year=2024');
    expect(
      within(group).getByRole('link', { name: 'Next year' }),
    ).toHaveAttribute('href', '/overview?month=2026-03&year=2026');
    expect(linkProps).toHaveLength(2);
    for (const props of linkProps) {
      expect(props).toMatchObject({ replace: true, scroll: false });
    }
  });

  it('links with the year alone when no month is selected', () => {
    render(
      <YearPicker year={2025} minYear={2023} currentYear={2026} month={null} />,
    );
    expect(screen.getByRole('link', { name: 'Previous year' })).toHaveAttribute(
      'href',
      '/overview?year=2024',
    );
  });

  it('disables Next on the current year and Previous on the earliest year', () => {
    render(
      <YearPicker year={2026} minYear={2026} currentYear={2026} month={null} />,
    );
    for (const name of ['Previous year', 'Next year']) {
      const control = screen.getByRole('link', { name });
      expect(control).toHaveAttribute('aria-disabled', 'true');
      expect(control).not.toHaveAttribute('href');
    }
  });

  it('gives each arrow a 44px target', () => {
    render(
      <YearPicker year={2025} minYear={2023} currentYear={2026} month={null} />,
    );
    expect(screen.getByRole('link', { name: 'Next year' })).toHaveClass(
      'size-11',
    );
    expect(screen.getByRole('link', { name: 'Previous year' })).toHaveClass(
      'size-11',
    );
  });
});
