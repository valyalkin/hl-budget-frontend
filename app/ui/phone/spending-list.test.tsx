import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { Spending } from '@/app/lib/definitions';
import SpendingList from '@/app/ui/phone/spending-list';
import { usePhoneUi } from '@/app/ui/phone/phone-ui-provider';
import { renderPhone } from '@/app/ui/phone/test-support';
import { spendings } from '@/mocks/fixtures';

function Layers() {
  const { layers } = usePhoneUi();
  return <p data-testid="layers">{JSON.stringify(layers)}</p>;
}

describe('SpendingList', () => {
  it('lists date, category and amount, and names the merchant for screen readers', () => {
    renderPhone(
      <SpendingList spendings={spendings as Spending[]} label="October 2026" />,
    );
    const row = screen.getByRole('button', {
      name: 'Oct 27, Neighbourhood Market, Groceries, $84.37',
    });
    expect(row).toHaveTextContent('Oct 27');
    expect(row).toHaveTextContent('Groceries');
    expect(row).toHaveTextContent('$84.37');
    expect(row).not.toHaveTextContent('Neighbourhood Market');
    expect(within(row).getByText('Groceries')).toHaveClass('truncate');
  });

  it('opens the spending, or a new one from the floating button', async () => {
    renderPhone(
      <>
        <SpendingList
          spendings={spendings as Spending[]}
          label="October 2026"
        />
        <Layers />
      </>,
    );
    await userEvent.click(screen.getByRole('button', { name: /^Oct 27,/ }));
    expect(screen.getByTestId('layers')).toHaveTextContent(
      spendings[0]?.id ?? '',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Add spending' }));
    expect(screen.getByTestId('layers').textContent).toContain(
      '{"kind":"edit"}',
    );
  });

  it('says when the month is empty', () => {
    renderPhone(<SpendingList spendings={[]} label="March 2026" />);
    expect(screen.getByText('No spendings in March 2026.')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Add spending' }),
    ).toBeInTheDocument();
  });
});
