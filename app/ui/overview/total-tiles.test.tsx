import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TotalTiles from '@/app/ui/overview/total-tiles';
import { overviewData } from '@/app/ui/overview/test-support';

function tile(label: 'earned' | 'spent' | 'saved') {
  return screen.getByTestId(`tile-${label}`);
}

describe('TotalTiles (specs/011 US1)', () => {
  it('shows Earned, Spent and Saved with monthly averages and the saved share', () => {
    render(<TotalTiles data={overviewData()} />);
    expect(
      screen.getByRole('region', { name: 'Year totals' }),
    ).toBeInTheDocument();

    expect(within(tile('earned')).getByText('Earned')).toBeInTheDocument();
    expect(within(tile('earned')).getByTestId('tile-amount')).toHaveTextContent(
      '$61,000',
    );
    expect(tile('earned')).toHaveTextContent('avg $6,100 a month');

    expect(within(tile('spent')).getByTestId('tile-amount')).toHaveTextContent(
      '$48,240',
    );
    expect(tile('spent')).toHaveTextContent('avg $4,824 a month');

    expect(within(tile('saved')).getByText('Saved')).toBeInTheDocument();
    expect(within(tile('saved')).getByTestId('tile-amount')).toHaveTextContent(
      '$12,760',
    );
    expect(tile('saved')).toHaveTextContent('21% of what you earned');
  });

  it('divides by twelve for a past year', () => {
    render(
      <TotalTiles
        data={overviewData({
          year: 2025,
          monthsElapsed: 12,
          totals: {
            earnedCents: 1200000,
            spentCents: 600000,
            savedCents: 600000,
          },
        })}
      />,
    );
    expect(tile('earned')).toHaveTextContent('avg $1,000 a month');
    expect(tile('spent')).toHaveTextContent('avg $500 a month');
    expect(tile('saved')).toHaveTextContent('50% of what you earned');
  });

  it('shows a negative Saved with a minus sign and says so', () => {
    render(
      <TotalTiles
        data={overviewData({
          totals: {
            earnedCents: 100000,
            spentCents: 224000,
            savedCents: -124000,
          },
        })}
      />,
    );
    expect(within(tile('saved')).getByTestId('tile-amount')).toHaveTextContent(
      '−$1,240',
    );
    expect(tile('saved')).toHaveTextContent('Spent more than earned');
  });

  it('never shows a share of nothing earned', () => {
    render(
      <TotalTiles
        data={overviewData({
          totals: { earnedCents: 0, spentCents: 5000, savedCents: -5000 },
        })}
      />,
    );
    expect(tile('saved')).toHaveTextContent('Spent more than earned');
    expect(tile('saved')).not.toHaveTextContent('%');
  });

  it('says when nothing is recorded in the year', () => {
    render(
      <TotalTiles
        data={overviewData({
          totals: { earnedCents: 0, spentCents: 0, savedCents: 0 },
        })}
      />,
    );
    for (const label of ['earned', 'spent', 'saved'] as const) {
      expect(within(tile(label)).getByTestId('tile-amount')).toHaveTextContent(
        '$0',
      );
    }
    expect(tile('earned')).toHaveTextContent('avg $0 a month');
    expect(tile('saved')).toHaveTextContent('Nothing recorded in 2026');
  });
});
