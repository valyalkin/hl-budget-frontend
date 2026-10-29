import { expect, test } from '@playwright/test';
import {
  addSpendingViaUi,
  marker,
  removeSpendingsCreatedBy,
  signIn,
} from './support';

test.describe('US4: edit and delete from the table', () => {
  test('edit a row’s amount, then remove it at once', async ({ page }) => {
    const mark = marker('edit');
    const merchant = `${mark} Diner`;
    await signIn(page);
    await addSpendingViaUi(page, { merchant, amount: '20.00' });

    const row = page.getByRole('row').filter({ hasText: merchant });
    await row.hover();
    await row.getByRole('button', { name: /^Edit / }).click();
    const amount = page.getByRole('textbox', { name: /^Amount in / });
    await amount.fill('25.50');
    await amount.press('Enter');
    await expect(
      page.getByRole('row').filter({ hasText: merchant }),
    ).toContainText('$25.50');

    // Keyboard users reach the same buttons.
    await page
      .getByRole('row')
      .filter({ hasText: merchant })
      .getByRole('button', { name: /^Remove / })
      .focus();
    await expect(
      page
        .getByRole('row')
        .filter({ hasText: merchant })
        .getByRole('button', { name: /^Remove / }),
    ).toBeVisible();

    await page
      .getByRole('row')
      .filter({ hasText: merchant })
      .getByRole('button', { name: /^Remove / })
      .click();
    await expect(page.getByText(merchant)).toHaveCount(0);
    await removeSpendingsCreatedBy(page, mark);
  });
});
