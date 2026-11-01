import { expect, test } from '@playwright/test';
import {
  addSpendingViaUi,
  marker,
  removeSpendingsCreatedBy,
  signIn,
} from './support';

test.describe('US5: where the month’s money went', () => {
  test('table and pie show only categories with spending; the view is kept', async ({
    page,
  }) => {
    const mark = marker('cat');
    await signIn(page);
    await addSpendingViaUi(page, {
      merchant: `${mark} A`,
      category: 'Groceries',
      amount: '10.00',
    });
    await addSpendingViaUi(page, {
      merchant: `${mark} B`,
      category: 'Taxi',
      amount: '5.00',
    });

    const card = page.getByRole('region', { name: 'By category' });
    await expect(
      card.getByRole('rowheader', { name: 'Total', exact: true }),
    ).toBeVisible();
    await expect(
      card.getByRole('cell', { name: 'Groceries', exact: true }),
    ).toBeVisible();

    await card.getByRole('button', { name: 'Pie' }).click();
    const chart = card.getByRole('group', { name: /^Spending by category/ });
    await expect(chart).toBeVisible();
    // specs/007: each slice is filled with its category's colour, the same as its swatch.
    const groceries = chart.getByRole('img', { name: /^Groceries:/ });
    const taxi = chart.getByRole('img', { name: /^Taxi:/ });
    await expect(groceries).toHaveAttribute('fill', '#c2410c');
    await expect(taxi).toHaveAttribute('fill', '#8a6d00');
    const fills = await chart
      .getByRole('img')
      .evaluateAll((paths) => paths.map((path) => getComputedStyle(path).fill));
    for (const fill of fills) {
      expect(fill).toMatch(/^rgb\(/);
      expect(fill).not.toBe('rgb(0, 0, 0)');
    }
    // Hover and keyboard focus name the slice in the centre at once.
    await groceries.hover();
    await expect(card.getByTestId('donut-centre')).toContainText('Groceries', {
      timeout: 500,
    });
    await taxi.focus();
    await expect(card.getByTestId('donut-centre')).toContainText('Taxi');
    await expect(card.getByText('Everything else')).toHaveCount(0);
    await expect(card.getByRole('list', { name: 'Legend' })).toContainText(
      'Taxi',
    );

    await page.reload();
    await expect(
      page
        .getByRole('region', { name: 'By category' })
        .getByRole('button', { name: 'Pie' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await page
      .getByRole('region', { name: 'By category' })
      .getByRole('button', { name: 'Table' })
      .click();

    await removeSpendingsCreatedBy(page, mark);
  });
});
