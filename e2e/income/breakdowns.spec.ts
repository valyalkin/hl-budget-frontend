import { expect, test } from '@playwright/test';
import {
  addIncomeViaUi,
  marker,
  removeIncomeCreatedBy,
  signIn,
} from './support';

test.describe('specs/009 US3: where the month’s income came from', () => {
  test('By category and By account show income only, in fixed colours, with their own Table / Pie choice', async ({
    page,
  }) => {
    const mark = marker('inc-bd');
    await signIn(page);
    // Spendings' By category on Table, so a change on Income can be seen not to touch it.
    await page
      .getByRole('region', { name: 'By category' })
      .getByRole('button', { name: 'Table' })
      .click();

    await page.goto('/income');
    await addIncomeViaUi(page, {
      source: `${mark} Employer`,
      category: 'Salary',
      amount: '3000.00',
    });
    await addIncomeViaUi(page, {
      source: `${mark} Broker`,
      category: 'Investments',
      amount: '25.00',
    });

    const byCategory = page.getByRole('region', { name: 'By category' });
    await expect(byCategory.getByRole('row', { name: /Salary/ })).toBeVisible();
    await expect(
      byCategory.getByRole('row', { name: /Investments/ }),
    ).toBeVisible();
    await expect(byCategory.getByText('Groceries')).toHaveCount(0);

    await byCategory.getByRole('button', { name: 'Pie' }).click();
    const salary = byCategory.getByRole('img', { name: /^Salary: / });
    await expect(salary).toHaveAttribute('fill', '#1e5b45');
    await expect(
      byCategory.getByRole('img', { name: /^Investments: / }),
    ).toHaveAttribute('fill', '#1d4ed8');
    // The slice is nearly a full ring, so its box centre falls in the hole: focus it instead.
    await salary.focus();
    await expect(byCategory.getByTestId('donut-centre')).toContainText(
      'Salary',
    );
    await expect(
      byCategory.getByRole('group', { name: /^Income by category/ }),
    ).toBeVisible();

    await expect(
      page
        .getByRole('region', { name: 'By account' })
        .getByRole('row', { name: /E2E card/ }),
    ).toBeVisible();

    // The Income choice is kept after a reload and a tab switch; Spendings keeps its own.
    await page.reload();
    await expect(
      page
        .getByRole('region', { name: 'By category' })
        .getByRole('button', { name: 'Pie' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'Spendings' })
      .click();
    await page.waitForURL('**/spendings**');
    await expect(
      page
        .getByRole('region', { name: 'By category' })
        .getByRole('button', { name: 'Table' }),
    ).toHaveAttribute('aria-pressed', 'true');

    await page.goto('/income');
    await page
      .getByRole('region', { name: 'By category' })
      .getByRole('button', { name: 'Table' })
      .click();
    await removeIncomeCreatedBy(page, mark);
  });

  test('an empty month says nothing was received', async ({ page }) => {
    await signIn(page);
    await page.goto('/income?month=2001-01');
    await expect(
      page
        .getByRole('region', { name: 'By category' })
        .getByText('Nothing received in January 2001.'),
    ).toBeVisible();
  });
});
