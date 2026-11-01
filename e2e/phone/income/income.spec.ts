import { expect, test, type Page } from '@playwright/test';
import {
  checkScreen,
  E2E_ACCOUNT,
  expectAccessible,
  expectPhoneLayout,
  marker,
  phoneRoot,
  signInPhone,
  spendingRow,
} from '../support';

/** From the phone Spendings screen, switch to Income with the header switch. */
async function toIncome(page: Page) {
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'Income' })
    .click();
  await page.waitForURL('**/income**');
  await expectPhoneLayout(page);
}

async function addIncomePhone(page: Page, source: string, amount: string) {
  await page.getByRole('button', { name: 'Add income' }).click();
  const form = page.getByRole('dialog', { name: 'New income' });
  await expect(form).toBeVisible();
  await form.getByRole('textbox', { name: 'Amount (CAD)' }).fill(amount);
  await form.getByRole('combobox', { name: 'Source' }).fill(source);
  await form.getByRole('combobox', { name: 'Category' }).fill('Salary');
  await form.getByRole('combobox', { name: 'Account' }).fill(E2E_ACCOUNT);
  await form.getByRole('button', { name: 'Add income' }).click();
  await expect(form).toHaveCount(0);
  await expect(spendingRow(page, source).first()).toBeVisible();
}

test.describe('specs/009 US6 (phone): income on the phone', () => {
  test('the Spendings | Income switch fits, keeps the month and has 44px targets', async ({
    page,
  }) => {
    await signInPhone(page);
    const nav = page.getByRole('navigation', { name: 'Main' });
    await expect(nav.getByRole('link', { name: 'Spendings' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await page.getByRole('combobox', { name: 'Month' }).selectOption('1');
    await page.waitForURL(/month=\d{4}-01/);
    await toIncome(page);
    expect(page.url()).toMatch(/\/income\?month=\d{4}-01$/);
    await expect(page.getByRole('combobox', { name: 'Month' })).toHaveValue(
      '1',
    );
    await checkScreen(page);

    await page.setViewportSize({ width: 360, height: 780 });
    const box = await nav.getByRole('link', { name: 'Income' }).boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    await checkScreen(page);
  });

  test('add, edit and delete an income; the back gesture closes the form, not the tab', async ({
    page,
  }) => {
    const mark = marker('phone-inc');
    const source = `${mark} Employer`;
    await signInPhone(page);
    await toIncome(page);
    await expect(
      page.getByRole('group', { name: 'View' }).getByRole('button', {
        name: 'Income',
      }),
    ).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('button', { name: 'Add income' }).click();
    await expect(
      page.getByRole('dialog', { name: 'New income' }),
    ).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('dialog', { name: 'New income' })).toHaveCount(
      0,
    );
    await expect(page).toHaveURL(/\/income/);

    await addIncomePhone(page, source, '1500.00');

    await spendingRow(page, source).click();
    const edit = page.getByRole('dialog', { name: 'Edit income' });
    await expect(edit).toBeVisible();
    await edit.getByRole('button', { name: 'Delete income' }).click();
    const sheet = page.getByRole('alertdialog', {
      name: 'Delete this income?',
    });
    await expect(sheet).toBeVisible();
    await sheet.getByRole('button', { name: 'Delete income' }).click();
    await expect(spendingRow(page, source)).toHaveCount(0);
  });

  test('By category on the phone shows income categories; an empty month says so', async ({
    page,
  }) => {
    const mark = marker('phone-inc-bd');
    await signInPhone(page);
    await toIncome(page);
    await addIncomePhone(page, `${mark} Pay`, '900.00');
    await page
      .getByRole('group', { name: 'View' })
      .getByRole('button', { name: 'By category' })
      .click();
    await expect(
      phoneRoot(page).getByRole('table', { name: 'Income by category' }),
    ).toContainText('Salary');
    await expectAccessible(page, 'income by category');

    await page
      .getByRole('group', { name: 'View' })
      .getByRole('button', { name: 'Income' })
      .click();
    await spendingRow(page, `${mark} Pay`).click();
    await page
      .getByRole('dialog', { name: 'Edit income' })
      .getByRole('button', { name: 'Delete income' })
      .click();
    await page
      .getByRole('alertdialog', { name: 'Delete this income?' })
      .getByRole('button', { name: 'Delete income' })
      .click();

    await page.goto('/income?month=2025-01');
    await expectPhoneLayout(page);
    await expect(page.getByText('No income in January 2025.')).toBeVisible();
    await expectAccessible(page, 'income list');
  });

  test('phone Settings has Income categories with the defaults', async ({
    page,
  }) => {
    await signInPhone(page);
    await page.getByRole('button', { name: 'Account menu' }).click();
    await page
      .getByRole('dialog', { name: 'Account menu' })
      .getByRole('button', { name: 'Settings' })
      .click();
    const settings = page.getByRole('dialog', { name: 'Settings' });
    await settings.getByRole('button', { name: 'Income categories' }).click();
    await expect(
      settings.getByRole('heading', { name: /Default income categories · 2/ }),
    ).toBeVisible();
    await expect(
      settings.getByRole('textbox', { name: 'New income category' }),
    ).toBeVisible();
    await checkScreen(page);
    await settings.getByRole('button', { name: 'Close settings' }).click();
  });
});
