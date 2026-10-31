import { expect, test } from '@playwright/test';
import {
  addSpendingPhone,
  checkScreen,
  deletePhoneSpendings,
  marker,
  phoneRoot,
  signInPhone,
  spendingRow,
} from './support';

test.describe('US1 (phone): see my spendings for a month', () => {
  test('the current month is selected and its spendings, total and count show', async ({
    page,
  }) => {
    const mark = marker('phone-month');
    await signInPhone(page);
    const now = new Date();
    await expect(page.getByRole('combobox', { name: 'Month' })).toHaveValue(
      String(now.getMonth() + 1),
    );
    await expect(page.getByRole('combobox', { name: 'Year' })).toHaveValue(
      String(now.getFullYear()),
    );

    const month = page.getByRole('combobox', { name: 'Month' });
    if (now.getMonth() < 11) {
      await expect(
        month.locator(`option[value="${now.getMonth() + 2}"]`),
      ).toBeDisabled();
    }

    await addSpendingPhone(page, {
      merchant: `${mark} Market`,
      category: 'Groceries',
      amount: '12.40',
    });
    const row = spendingRow(page, `${mark} Market`);
    await expect(row).toContainText('Groceries');
    await expect(row).toContainText('$12.40');
    await expect(row).not.toContainText(mark);
    await checkScreen(page);
    await deletePhoneSpendings(page, mark);
  });

  test('changing month reloads the list; a future month is clamped when the year changes', async ({
    page,
  }) => {
    await signInPhone(page);
    const now = new Date();
    const lastYear = now.getFullYear() - 1;
    await page.goto(`/spendings?month=${lastYear}-12`);
    await expect(page.getByRole('combobox', { name: 'Year' })).toHaveValue(
      String(lastYear),
    );
    await expect(page.getByRole('combobox', { name: 'Month' })).toHaveValue(
      '12',
    );
    await page
      .getByRole('combobox', { name: 'Year' })
      .selectOption(String(now.getFullYear()));
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    await expect(page).toHaveURL(new RegExp(`month=${expected}`));
    await expect(page.getByRole('combobox', { name: 'Month' })).toHaveValue(
      String(now.getMonth() + 1),
    );
  });

  test('an empty month says so', async ({ page }) => {
    await signInPhone(page);
    await page.goto('/spendings?month=2001-01');
    // 2001 is before any spending, so the clamp keeps the param only if the year is offered.
    await expect(phoneRoot(page).getByText(/^No spendings in /)).toBeVisible();
    await expect(phoneRoot(page).getByText('0 spendings')).toBeVisible();
  });

  test('the floating Add spending button stays visible and never covers the last row', async ({
    page,
  }) => {
    const mark = marker('phone-fab');
    await signInPhone(page);
    for (let i = 0; i < 12; i += 1) {
      await addSpendingPhone(page, {
        merchant: `${mark} ${i}`,
        amount: `${i + 1}.00`,
      });
    }
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const fab = page.getByRole('button', { name: 'Add spending' });
    await expect(fab).toBeInViewport();
    const rows = phoneRoot(page).getByRole('listitem');
    const last = await rows.last().boundingBox();
    const button = await fab.boundingBox();
    expect(last && button && last.y + last.height <= button.y).toBe(true);
    await deletePhoneSpendings(page, mark);
  });

  for (const width of [320, 390, 430]) {
    test(`fits ${width}px without sideways scrolling, with 44px targets`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await signInPhone(page);
      await checkScreen(page);
      await page.getByRole('button', { name: 'By category' }).click();
      await checkScreen(page);
    });
  }
});

test('signed out on a phone: the signed-out screen with a 44px Sign in', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: "You're signed out" }),
  ).toBeVisible();
  const signIn = page.getByRole('link', { name: 'Sign in' }).last();
  const box = await signIn.boundingBox();
  expect(box && box.height >= 44).toBe(true);
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 800 });
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  }
});
