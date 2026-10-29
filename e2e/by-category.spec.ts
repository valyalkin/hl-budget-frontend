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
    await expect(card.getByRole('img')).toBeVisible();
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
