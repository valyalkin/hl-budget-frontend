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

  // specs/008: the By account card in both views.
  await expectAccessible(page, 'by account: table');
  await page
    .getByRole('region', { name: 'By account' })
    .getByRole('button', { name: 'Pie' })
    .click();
  await expectAccessible(page, 'by account: pie');
  await page
    .getByRole('region', { name: 'By account' })
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

test('the Income screen, its cards and Settings sections (specs/009)', async ({
  page,
}) => {
  await signIn(page);
  await page.goto('/income');
  await expect(page.getByRole('region', { name: 'Income list' })).toBeVisible();
  await expectAccessible(page, 'income plain');

  await page.getByRole('button', { name: 'Add an income row' }).click();
  await expect(page.getByRole('dialog', { name: 'Choose date' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expectAccessible(page, 'income entry row open');
  await page.keyboard.press('Escape');

  for (const card of ['By category', 'By account']) {
    await page
      .getByRole('region', { name: card })
      .getByRole('button', { name: 'Pie' })
      .click();
  }
  await expectAccessible(page, 'income cards as pies');
  for (const card of ['By category', 'By account']) {
    await page
      .getByRole('region', { name: card })
      .getByRole('button', { name: 'Table' })
      .click();
  }

  await page.getByRole('button', { name: 'User settings' }).click();
  const dialog = page.getByRole('dialog', { name: 'Settings' });
  await dialog.getByRole('tab', { name: 'Income categories' }).click();
  await expectAccessible(page, 'settings income categories');
  await dialog.getByRole('tab', { name: 'Spending categories' }).click();
  await dialog.getByRole('button', { name: 'Close settings' }).click();
});

test('the Overview in chart and table views (specs/011 SC-005)', async ({
  page,
}) => {
  await signIn(page);
  await page.goto('/overview');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Overview' }),
  ).toBeVisible();
  const cards = ['Earned vs spent', 'Spent by category', 'Spent by account'];

  for (const card of cards) {
    await page
      .getByRole('region', { name: card })
      .getByRole('button', { name: 'Chart' })
      .click();
  }
  await expectAccessible(page, 'overview charts');

  // A focused chart shows its tooltip and announces the month.
  await page
    .getByRole('region', { name: 'Earned vs spent' })
    .getByRole('slider', { name: 'Months' })
    .focus();
  await expectAccessible(page, 'overview chart focused');

  for (const card of cards) {
    await page
      .getByRole('region', { name: card })
      .getByRole('button', { name: 'Table' })
      .click();
  }
  await expectAccessible(page, 'overview tables');
  for (const card of cards) {
    await page
      .getByRole('region', { name: card })
      .getByRole('button', { name: 'Chart' })
      .click();
  }
});
