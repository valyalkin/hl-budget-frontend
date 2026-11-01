import { expect, test } from '@playwright/test';
import {
  addAccountsPhone,
  addSpendingPhone,
  checkScreen,
  deletePhoneSpendings,
  marker,
  phoneRoot,
  removeAccountsPhone,
  signInPhone,
} from './support';

test.describe('specs/008 US3 (phone): the month by account', () => {
  test('a third switch option; Table with a total, Pie with the top 6 plus Everything else; own choice', async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const mark = marker('pacct');
    await signInPhone(page);
    // Leftovers of an earlier run that stopped before its clean-up.
    await deletePhoneSpendings(page, 'e2e-pacct-');
    await removeAccountsPhone(page, 'e2e-pacct-');

    // Eight accounts with spending this month, so the pie needs "Everything else".
    const names = Array.from({ length: 8 }, (_, i) => `${mark} ${i + 1}`);
    await addAccountsPhone(page, names);
    try {
      for (const [i, account] of names.entries()) {
        await addSpendingPhone(page, {
          merchant: `${mark} m${i}`,
          account,
          amount: `${(9 - i) * 1000}.00`,
        });
      }

      // The switch: three options on one row, each a 44px target, no sideways scroll (FR-015).
      const view = phoneRoot(page).getByRole('group', { name: 'View' });
      await expect(view.getByRole('button')).toHaveText([
        'Spendings',
        'By category',
        'By account',
      ]);
      for (const width of [390, 360]) {
        await page.setViewportSize({ width, height: 800 });
        const boxes = await view
          .getByRole('button')
          .evaluateAll((buttons) =>
            buttons.map((b) => b.getBoundingClientRect().toJSON() as DOMRect),
          );
        for (const box of boxes) {
          expect(box.top).toBe(boxes[0]!.top);
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
        await checkScreen(page);
      }
      await page.setViewportSize({ width: 390, height: 844 });

      await view.getByRole('button', { name: 'By account' }).click();
      const table = page.getByRole('table', { name: 'Spending by account' });
      await expect(table).toBeVisible();
      for (const name of names) {
        await expect(
          table.getByRole('row').filter({ hasText: name }),
        ).toHaveCount(1);
      }
      await expect(table.getByRole('row').last()).toContainText('Total');
      await expect(table.getByRole('row').last()).toContainText('100%');
      await checkScreen(page);

      await page.getByRole('button', { name: 'Pie' }).click();
      const chart = page.getByRole('group', {
        name: /^Donut chart of .* spending by account\./,
      });
      await expect(chart).toBeVisible();
      await expect(chart.getByRole('img')).toHaveCount(7);
      await chart.getByRole('img', { name: new RegExp(`^${names[1]}:`) }).tap();
      await expect(phoneRoot(page).getByTestId('donut-centre')).toContainText(
        names[1]!,
        {
          timeout: 500,
        },
      );
      const legend = phoneRoot(page).getByRole('listitem');
      await expect(legend).toHaveCount(7);
      await expect(legend.last()).toContainText('Everything else');
      await checkScreen(page);

      // By category keeps its own Table choice; both stay when the month changes.
      await view.getByRole('button', { name: 'By category' }).click();
      await expect(
        page.getByRole('table', { name: 'Spending by category' }),
      ).toBeVisible();
      await view.getByRole('button', { name: 'By account' }).click();
      await expect(page.getByRole('button', { name: 'Pie' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      const now = new Date();
      const earlier = now.getMonth() === 0 ? 1 : now.getMonth();
      await page
        .getByRole('combobox', { name: 'Month' })
        .selectOption(String(earlier));
      await expect(page.getByRole('combobox', { name: 'Month' })).toHaveValue(
        String(earlier),
      );
      await expect(
        view.getByRole('button', { name: 'By account' }),
      ).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByRole('button', { name: 'Pie' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await view.getByRole('button', { name: 'By category' }).click();
      await expect(page.getByRole('button', { name: 'Table' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );

      // An empty month says so.
      await page.goto('/spendings?month=2001-01');
      await phoneRoot(page)
        .getByRole('group', { name: 'View' })
        .getByRole('button', { name: 'By account' })
        .click();
      await expect(
        phoneRoot(page).getByText(/^Nothing to break down in /),
      ).toBeVisible();
    } finally {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto('/spendings');
      await deletePhoneSpendings(page, mark);
      await removeAccountsPhone(page, mark);
    }
  });
});
