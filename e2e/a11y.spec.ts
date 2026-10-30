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

test('the CSV import window in each of its states', async ({ page }) => {
  await signIn(page);
  await page.getByRole('button', { name: 'Import CSV' }).click();
  await expectAccessible(page, 'import: pick');
  await page.getByLabel('Choose a CSV file').setInputFiles({
    name: 'x.png',
    mimeType: 'image/png',
    buffer: Buffer.from('x'),
  });
  await expectAccessible(page, 'import: pick with an error');

  const rows = Array.from(
    { length: 30 },
    (_, i) =>
      `2026-10-01,e2e-a11y Shop ${i},${i === 29 ? '' : 'Groceries'},E2E card,1.00`,
  );
  await page.getByLabel('Choose a CSV file').setInputFiles({
    name: 'a11y.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(
      ['Date,Merchant,Category,Account,Amount', ...rows].join('\n'),
    ),
  });
  await expectAccessible(page, 'import: review with a highlighted row');

  // The last row's popups show in full, inside the window (FR-025).
  const inViewport = async (
    name: string,
    locator: ReturnType<Page['locator']>,
  ) => {
    const box = await locator.boundingBox();
    const viewport = page.viewportSize();
    expect(box, name).not.toBeNull();
    if (box && viewport) {
      expect(box.y + box.height, name).toBeLessThanOrEqual(viewport.height);
      expect(box.x + box.width, name).toBeLessThanOrEqual(viewport.width);
    }
  };
  await page.getByRole('button', { name: /^Date, row 30,/ }).click();
  const calendar = page.getByRole('dialog', { name: 'Choose date' });
  await expect(calendar).toBeVisible();
  await inViewport('calendar', calendar);
  await expectAccessible(page, 'import: calendar open');
  await page.keyboard.press('Escape');

  await page.getByRole('combobox', { name: 'Category, row 30' }).fill('G');
  const list = page.getByRole('listbox');
  await expect(list).toBeVisible();
  await inViewport('category list', list);
  await expectAccessible(page, 'import: category list open');

  // Tab never reaches the page behind the modal window. Past the window's last
  // control Chromium hands focus to the browser itself (activeElement is then
  // body) before wrapping back into the window.
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    expect(
      await page.evaluate(() => {
        const active = document.activeElement;
        return active === document.body || !!active?.closest('dialog');
      }),
    ).toBe(true);
  }
});
