import { expect, test } from '@playwright/test';
import {
  addSpendingViaUi,
  marker,
  removeSpendingsCreatedBy,
  signIn,
} from './support';

test.describe('US6: manage categories and accounts', () => {
  test('add, refuse duplicates and in-use removal, remove, close', async ({
    page,
  }) => {
    const mark = marker('set');
    const name = `Cat ${mark}`.slice(0, 40);
    await signIn(page);

    await page.getByRole('button', { name: 'User settings' }).click();
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await dialog.getByRole('textbox', { name: 'New category' }).fill(name);
    await dialog.getByRole('button', { name: 'Add' }).click();
    await expect(
      dialog.getByRole('button', { name: `Remove ${name}` }),
    ).toBeVisible();

    await dialog
      .getByRole('textbox', { name: 'New category' })
      .fill(name.toUpperCase());
    await dialog.getByRole('button', { name: 'Add' }).click();
    await expect(
      dialog.getByText(`“${name.toUpperCase()}” already exists.`),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    await addSpendingViaUi(page, {
      merchant: `${mark} Use`,
      category: name,
      amount: '1.00',
    });
    await page.getByRole('button', { name: 'User settings' }).click();
    await dialog.getByRole('button', { name: `Remove ${name}` }).click();
    await expect(
      dialog.getByText(
        `${name} is used by 1 spending, so it can’t be removed.`,
      ),
    ).toBeVisible();
    await dialog.getByRole('button', { name: 'Close settings' }).click();

    await removeSpendingsCreatedBy(page, mark);
    await page.getByRole('button', { name: 'User settings' }).click();
    await dialog.getByRole('button', { name: `Remove ${name}` }).click();
    await expect(
      dialog.getByRole('button', { name: `Remove ${name}` }),
    ).toHaveCount(0);

    await dialog.getByRole('tab', { name: 'Accounts' }).click();
    await expect(
      dialog.getByRole('textbox', { name: 'New account' }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
  });
});
