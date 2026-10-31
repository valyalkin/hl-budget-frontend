import { expect, test } from '@playwright/test';
import {
  addSpendingPhone,
  checkScreen,
  deletePhoneSpendings,
  marker,
  phoneRoot,
  signInPhone,
} from './support';

test.describe('US4 (phone): the month by category', () => {
  test('Table with a total, Pie with the top 6 plus Everything else, kept across months', async ({
    page,
  }) => {
    const mark = marker('phone-cat');
    await signInPhone(page);
    // Eight categories with spending this month, so the pie needs "Everything else".
    const names = [
      'Rent',
      'Groceries',
      'Bills',
      'Car',
      'Pet',
      'Health',
      'Taxi',
      'Sport',
    ];
    for (const [i, category] of names.entries()) {
      await addSpendingPhone(page, {
        merchant: `${mark} ${i}`,
        category,
        amount: `${(9 - i) * 1000}.00`,
      });
    }

    await page.getByRole('button', { name: 'By category' }).click();
    const table = page.getByRole('table', { name: 'Spending by category' });
    await expect(table).toBeVisible();
    await expect(table.getByRole('row').last()).toContainText('Total');
    await expect(table.getByRole('row').last()).toContainText('100%');
    await checkScreen(page);

    await page.getByRole('button', { name: 'Pie' }).click();
    await expect(
      page.getByRole('img', { name: /^Donut chart of / }),
    ).toBeVisible();
    const legend = phoneRoot(page).getByRole('listitem');
    await expect(legend).toHaveCount(7);
    await expect(legend.last()).toContainText('Everything else');
    await checkScreen(page);

    // The choice stays when the month changes.
    await page.goto('/spendings?month=2001-01');
    await expect(page.getByRole('button', { name: 'Pie' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(
      phoneRoot(page).getByText(/^Nothing to break down in /),
    ).toBeVisible();

    await page.goto('/spendings');
    await page.getByRole('button', { name: 'Spendings' }).click();
    await deletePhoneSpendings(page, mark);
  });
});
