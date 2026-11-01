import { expect, test } from '@playwright/test';
import {
  addAccountInSettings,
  addIncomeViaUi,
  closeSettingsDialog,
  marker,
  openIncomeCategories,
  removeAccountInSettings,
  removeIncomeCreatedBy,
  signIn,
} from './support';

test.describe('specs/009 US4: income categories in Settings', () => {
  test('Salary and Investments are defaults; a custom one is used only on Income, and is kept while used', async ({
    page,
  }) => {
    const mark = marker('inc-set');
    const name = `Inc ${mark}`.slice(0, 40);
    await signIn(page);

    let dialog = await openIncomeCategories(page);
    await expect(
      dialog.getByRole('heading', { name: /^Default income categories · 2$/ }),
    ).toBeVisible();
    await expect(dialog.getByText('Salary')).toBeVisible();
    await expect(dialog.getByText('Investments')).toBeVisible();
    await expect(
      dialog.getByRole('button', { name: 'Remove Salary' }),
    ).toHaveCount(0);

    await dialog
      .getByRole('textbox', { name: 'New income category' })
      .fill(name);
    await dialog.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(
      dialog.getByRole('button', { name: `Remove ${name}` }),
    ).toBeVisible();
    await dialog
      .getByRole('textbox', { name: 'New income category' })
      .fill('salary');
    await dialog.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(dialog.getByText('“salary” already exists.')).toBeVisible();
    await closeSettingsDialog(page);

    // Not a spending category: the Spendings entry row refuses it.
    await page.getByRole('button', { name: 'Add a spending row' }).click();
    await page.keyboard.press('Escape');
    await page.getByRole('combobox', { name: 'Merchant' }).fill(`${mark} X`);
    await page.getByRole('combobox', { name: 'Category' }).fill(name);
    await page.getByRole('combobox', { name: 'Account' }).fill('E2E card');
    await page.getByRole('textbox', { name: /^Amount in / }).fill('1.00');
    await page.getByRole('button', { name: 'Save spending' }).click();
    await expect(page.getByText('Not one of your categories')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel new spending' }).click();

    await page.goto('/income');
    await addIncomeViaUi(page, {
      source: `${mark} Gig`,
      category: name,
      amount: '40.00',
    });
    dialog = await openIncomeCategories(page);
    await dialog.getByRole('button', { name: `Remove ${name}` }).click();
    await expect(
      dialog.getByText(`${name} is used by 1 entry, so it can’t be removed.`),
    ).toBeVisible();
    await closeSettingsDialog(page);

    await removeIncomeCreatedBy(page, mark);
    dialog = await openIncomeCategories(page);
    await dialog.getByRole('button', { name: `Remove ${name}` }).click();
    await expect(
      dialog.getByRole('button', { name: `Remove ${name}` }),
    ).toHaveCount(0);
    await closeSettingsDialog(page);
  });

  test('an account used by income shows both counts and cannot be removed', async ({
    page,
  }) => {
    const mark = marker('inc-acc');
    const account = `Acc ${mark}`.slice(0, 40);
    await signIn(page);
    await addAccountInSettings(page, account);
    await page.goto('/income');
    await addIncomeViaUi(page, {
      source: `${mark} Pay`,
      account,
      amount: '10.00',
    });

    await page.getByRole('button', { name: 'User settings' }).click();
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await dialog.getByRole('tab', { name: 'Accounts' }).click();
    await expect(
      dialog.getByText('0 spendings · 1 income entry'),
    ).toBeVisible();
    await dialog.getByRole('button', { name: `Remove ${account}` }).click();
    await expect(
      dialog.getByText(
        `${account} has 1 income entry, so it can’t be removed.`,
      ),
    ).toBeVisible();
    await closeSettingsDialog(page);

    await removeIncomeCreatedBy(page, mark);
    await removeAccountInSettings(page, account);
  });
});
