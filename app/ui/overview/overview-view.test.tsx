import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import OverviewView from '@/app/ui/overview/overview-view';
import { overviewData } from '@/app/ui/overview/test-support';

vi.mock('@/app/ui/charts/echart', () => ({
  default: ({ label }: { label: string }) => (
    <div role="img" aria-label={label} />
  ),
}));

describe('OverviewView period line (specs/011 FR-007)', () => {
  it('names a past year in full', () => {
    render(
      <OverviewView data={overviewData({ year: 2025, monthsElapsed: 12 })} />,
    );
    expect(
      screen.getByRole('heading', { level: 1, name: 'Overview' }),
    ).toBeInTheDocument();
    expect(screen.getByText('January to December 2025')).toBeInTheDocument();
  });

  it('says year to date for the current year', () => {
    render(<OverviewView data={overviewData({ monthsElapsed: 11 })} />);
    expect(
      screen.getByText('January to November 2026 (year to date)'),
    ).toBeInTheDocument();
  });

  it('still says year to date in December of the current year', () => {
    render(<OverviewView data={overviewData({ monthsElapsed: 12 })} />);
    expect(
      screen.getByText('January to December 2026 (year to date)'),
    ).toBeInTheDocument();
  });
});
