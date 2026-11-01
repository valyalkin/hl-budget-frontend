import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import DonutChart, { type DonutSlice } from '@/app/ui/charts/donut-chart';

const slices: DonutSlice[] = [
  {
    key: 'rent',
    label: 'Rent',
    cents: 185000,
    amountText: '$1,850.00',
    shareText: '42%',
    color: '#1e5b45',
  },
  {
    key: 'groceries',
    label: 'Groceries',
    cents: 120000,
    amountText: '$1,200.00',
    shareText: '27%',
    color: '#c2410c',
  },
  {
    key: 'coffee',
    label: 'Coffee',
    cents: 9000,
    amountText: '$90.00',
    shareText: '2%',
    color: '#e11d48',
  },
];

function renderChart(list = slices) {
  render(
    <>
      <DonutChart
        slices={list}
        totalText="$4,400"
        summary="Spending by category"
      />
      <button type="button">Elsewhere</button>
    </>,
  );
  const chart = screen.getByRole('group', { name: 'Spending by category' });
  const slice = (name: string) =>
    within(chart).getByRole('img', { name: new RegExp(`^${name}:`) });
  return { chart, slice };
}

const centre = () => screen.getByTestId('donut-centre');

describe('DonutChart', () => {
  it('draws each slice in its own colour, labelled, with no native tooltips', () => {
    const { slice } = renderChart();
    expect(slice('Rent')).toHaveAttribute('fill', '#1e5b45');
    expect(slice('Groceries')).toHaveAttribute('fill', '#c2410c');
    expect(slice('Coffee')).toHaveAccessibleName('Coffee: $90.00, 2%');
    // No <title>: the browser's own tooltip would show late and twice.
    expect(slice('Rent')).toBeEmptyDOMElement();
    expect(centre()).toHaveTextContent('Total$4,400');
  });

  it('names the hovered slice in the centre and dims the others', () => {
    const { chart, slice } = renderChart();
    fireEvent.pointerEnter(slice('Groceries'));
    expect(centre()).toHaveTextContent('Groceries');
    expect(centre()).toHaveTextContent('$1,200.00 · 27%');
    expect(slice('Rent')).toHaveAttribute('opacity', '0.35');
    expect(slice('Groceries')).toHaveAttribute('opacity', '1');
    expect(slice('Groceries')).toHaveAttribute('data-active', 'true');

    fireEvent.pointerEnter(slice('Coffee'));
    expect(centre()).toHaveTextContent('Coffee');

    fireEvent.pointerLeave(chart);
    expect(centre()).toHaveTextContent('Total$4,400');
    expect(slice('Rent')).toHaveAttribute('opacity', '1');
  });

  it('shows the same label for keyboard focus, and clears it when focus leaves', async () => {
    const { slice } = renderChart();
    await userEvent.tab();
    expect(slice('Rent')).toHaveFocus();
    expect(centre()).toHaveTextContent('Rent');
    await userEvent.tab();
    expect(slice('Groceries')).toHaveFocus();
    expect(centre()).toHaveTextContent('Groceries');
    await userEvent.tab();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Elsewhere' })).toHaveFocus();
    expect(centre()).toHaveTextContent('Total$4,400');
  });

  it('shows the label on a tap, and hides it on a tap elsewhere', () => {
    const { slice } = renderChart();
    fireEvent.click(slice('Coffee'));
    expect(centre()).toHaveTextContent('Coffee');
    fireEvent.pointerDown(slice('Coffee'));
    expect(centre()).toHaveTextContent('Coffee');
    fireEvent.pointerDown(document.body);
    expect(centre()).toHaveTextContent('Total$4,400');
  });

  it('draws one category as a full ring that can still be named', () => {
    const { slice } = renderChart(slices.slice(0, 1));
    fireEvent.pointerEnter(slice('Rent'));
    expect(centre()).toHaveTextContent('Rent');
    expect(slice('Rent')).toHaveAttribute('tabindex', '0');
  });
});
