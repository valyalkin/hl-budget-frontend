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

    // The choice stays when the month changes (through the dropdown, not a reload).
    const now = new Date();
    const earlier = now.getMonth() === 0 ? 1 : now.getMonth();
    await page
      .getByRole('combobox', { name: 'Month' })
      .selectOption(String(earlier));
    await expect(page.getByRole('combobox', { name: 'Month' })).toHaveValue(
      String(earlier),
    );
    await expect(page.getByRole('button', { name: 'Pie' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(
      page.getByRole('button', { name: 'By category' }),
    ).toHaveAttribute('aria-pressed', 'true');

    // An empty month says so.
    await page.goto('/spendings?month=2001-01');
    await page.getByRole('button', { name: 'By category' }).click();
    await expect(
      phoneRoot(page).getByText(/^Nothing to break down in /),
    ).toBeVisible();

    await page.goto('/spendings');
    await deletePhoneSpendings(page, mark);
  });
});
