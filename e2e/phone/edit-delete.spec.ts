import { expect, test } from '@playwright/test';
import {
  addSpendingPhone,
  checkScreen,
  marker,
  phoneRoot,
  signInPhone,
  spendingRow,
} from './support';

test.describe('US3 (phone): edit or delete a spending', () => {
  test('edit the amount, then delete through the confirmation sheet', async ({
    page,
  }) => {
    const mark = marker('phone-edit');
    const merchant = `${mark} Diner`;
    await signInPhone(page);
    await addSpendingPhone(page, { merchant, amount: '20.00' });

    await spendingRow(page, merchant).click();
    const form = page.getByRole('dialog', { name: 'Edit spending' });
    const amount = form.getByRole('textbox', { name: 'Amount (CAD)' });
    await expect(amount).toHaveValue('20.00');
    await amount.fill('25.50');
    await form.getByRole('button', { name: 'Save changes' }).click();
    await expect(form).toHaveCount(0);
    await expect(spendingRow(page, merchant)).toContainText('$25.50');

    // X keeps the old values.
    await spendingRow(page, merchant).click();
    await form.getByRole('textbox', { name: 'Amount (CAD)' }).fill('99.00');
    await form.getByRole('button', { name: 'Close without saving' }).click();
    await expect(spendingRow(page, merchant)).toContainText('$25.50');

    await spendingRow(page, merchant).click();
    await form.getByRole('button', { name: 'Delete spending' }).click();
    const sheet = page.getByRole('alertdialog', {
      name: 'Delete this spending?',
    });
    await expect(sheet).toContainText(`${merchant} · $25.50 · `);
    await checkScreen(page);

    await sheet.getByRole('button', { name: 'Cancel' }).click();
    await expect(sheet).toHaveCount(0);
    await expect(form).toBeVisible();

    await form.getByRole('button', { name: 'Delete spending' }).click();
    await sheet
      .getByRole('button', { name: 'Keep this spending' })
      .click({ position: { x: 10, y: 10 } });
    await expect(sheet).toHaveCount(0);
    await expect(form).toBeVisible();

    await form.getByRole('button', { name: 'Delete spending' }).click();
    await sheet.getByRole('button', { name: 'Delete spending' }).click();
    await expect(form).toHaveCount(0);
    await expect(phoneRoot(page).getByRole('status')).toHaveText(
      `Deleted ${merchant} · $25.50`,
    );
    await expect(spendingRow(page, merchant)).toHaveCount(0);

    // The note goes on the next action.
    await page.getByRole('button', { name: 'By category' }).click();
    await expect(
      phoneRoot(page).getByText(`Deleted ${merchant} · $25.50`),
    ).toHaveCount(0);
  });
});
