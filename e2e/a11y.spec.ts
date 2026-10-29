import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { signIn } from './support';

/** SC-008: no serious or critical accessibility issues on the new screens, in each state. */
async function expectAccessible(page: Page, state: string) {
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter(
    (violation) =>
      violation.impact === 'serious' || violation.impact === 'critical',
  );
  expect(
    blocking.map((v) => `${v.id}: ${v.help}`),
    state,
  ).toEqual([]);
}

test('the signed-out screen', async ({ page }) => {
  await page.goto('/');
  await expectAccessible(page, 'signed out');
});

test('the Spendings screen in each of its states', async ({ page }) => {
  await signIn(page);
  await expectAccessible(page, 'plain');

  await page.getByRole('button', { name: 'Add a spending row' }).click();
  // A new row opens its calendar by itself.
  await expect(page.getByRole('dialog', { name: 'Choose date' })).toBeVisible();
  await expectAccessible(page, 'entry row with calendar open');
  await page.keyboard.press('Escape');
  await expectAccessible(page, 'entry row open');
  await page.getByRole('combobox', { name: 'Category' }).focus();
  await expectAccessible(page, 'category list open');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');

  await page
    .getByRole('region', { name: 'By category' })
    .getByRole('button', { name: 'Pie' })
    .click();
  await expectAccessible(page, 'pie view');
  await page
    .getByRole('region', { name: 'By category' })
    .getByRole('button', { name: 'Table' })
    .click();

  await page.getByRole('button', { name: 'User settings' }).click();
  await expectAccessible(page, 'settings: categories');
  await page.getByRole('dialog').getByRole('tab', { name: 'Accounts' }).click();
  await expectAccessible(page, 'settings: accounts');
});
