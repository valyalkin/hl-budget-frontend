import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import {
  csvFile,
  dayFirst,
  E2E_ACCOUNT,
  marker,
  monthOfDaysAgo,
  openImport,
  removeImported,
  signIn,
} from './support';

/** specs/004-csv-import: import spendings from a CSV file (US1–US4, edge cases, SC-005). */

const HEADER = 'Date,Description,Category,Account,Amount';
const fixtures = join(__dirname, 'fixtures');
const chooser = (page: Page) => page.getByLabel('Choose a CSV file');
const review = (page: Page) =>
  page.getByRole('dialog', { name: 'Review import' });

function generated(rows: number, mark: string) {
  return execFileSync('node', [
    join(fixtures, 'make-csv.mjs'),
    String(rows),
    mark,
  ]);
}

test.describe('US1: import a clean CSV file', () => {
  test('adds every row, whatever its month, and lands on the latest month', async ({
    page,
  }) => {
    const mark = marker('import');
    // 2 rows ~40 days ago (last month or earlier), 3 recent ones.
    const days = [40, 41, 1, 2, 3];
    await signIn(page);
    await openImport(page);

    await chooser(page).setInputFiles(
      csvFile('clean.csv', [
        HEADER,
        ...days.map(
          (d, i) =>
            `${dayFirst(d)},${mark} Shop ${i},Groceries,${E2E_ACCOUNT},${i + 1}.25`,
        ),
      ]),
    );

    await expect(review(page)).toBeVisible();
    await expect(page.getByText('clean.csv · 5 rows')).toBeVisible();
    await expect(page.getByText('All rows look good')).toBeVisible();
    await page.getByRole('button', { name: 'Add 5 spendings' }).click();

    await expect(page.getByRole('status')).toHaveText(
      'Added 5 spendings from clean.csv',
    );
    await expect(review(page)).toHaveCount(0);
    await expect(page).toHaveURL(new RegExp(`month=${monthOfDaysAgo(1)}`));
    await expect(
      page.getByText(`${mark} Shop 2`, { exact: true }),
    ).toBeVisible();

    await page.goto(`/spendings?month=${monthOfDaysAgo(40)}`);
    await expect(
      page.getByText(`${mark} Shop 0`, { exact: true }),
    ).toBeVisible();

    await removeImported(page, mark, days.map(monthOfDaysAgo));
  });
});

test.describe('US2: fix and complete rows before adding', () => {
  test('highlights gaps, blocks adding until fixed, and saves the edits', async ({
    page,
  }) => {
    const mark = marker('import-fix');
    await signIn(page);
    await openImport(page);
    await chooser(page).setInputFiles(
      csvFile('gaps.csv', [
        HEADER,
        `${dayFirst(1)},${mark} No category,,${E2E_ACCOUNT},4.00`,
        `${dayFirst(1)},${mark} No account,Groceries,,5.00`,
        `,${mark} No date,Groceries,${E2E_ACCOUNT},6.00`,
        `${dayFirst(1)},${mark} No amount,Groceries,${E2E_ACCOUNT},`,
        `${dayFirst(1)},${mark} Unwanted,Groceries,${E2E_ACCOUNT},7.00`,
      ]),
    );

    await expect(page.getByText('4 rows need attention')).toBeVisible();
    const add = page.getByRole('button', { name: /^Add (\d+ )?spendings?$/ });
    await expect(add).toHaveText('Add spendings');
    await expect(add).toBeDisabled();

    // Keyboard only in the fields: autofill completes "Gro…" and Tab accepts it.
    await page.getByRole('combobox', { name: 'Category, row 1' }).focus();
    await page.keyboard.type('Gro');
    await page.keyboard.press('Tab');
    await page.getByRole('combobox', { name: 'Account, row 2' }).focus();
    await page.keyboard.type(E2E_ACCOUNT);
    await page.keyboard.press('Tab');
    await page.getByRole('button', { name: /^Date, row 3,/ }).press('Enter');
    await page
      .getByRole('dialog', { name: 'Choose date' })
      .getByRole('button', { name: 'Today' })
      .click();
    await page
      .getByRole('textbox', { name: /^Amount in .*, row 4$/ })
      .fill('8.50');
    await page.getByRole('button', { name: 'Remove row 5' }).click();

    await expect(page.getByText('All rows look good')).toBeVisible();
    await add.click();
    await expect(page.getByRole('status')).toHaveText(
      'Added 4 spendings from gaps.csv',
    );
    const table = page.getByRole('table').first();
    await expect(
      table.getByRole('row').filter({ hasText: `${mark} No category` }),
    ).toContainText('Groceries');
    await expect(
      table.getByRole('row').filter({ hasText: `${mark} No amount` }),
    ).toContainText('$8.50');
    await expect(page.getByText(`${mark} Unwanted`)).toHaveCount(0);

    await removeImported(page, mark, [monthOfDaysAgo(1), monthOfDaysAgo(0)]);
  });
});

test.describe('US3: download the sample file', () => {
  test('saves the sample, which imports into the review', async ({ page }) => {
    await signIn(page);
    await openImport(page);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('link', { name: 'Download sample CSV' }).click(),
    ]);
    expect(download.suggestedFilename()).toBe('sample-spendings.csv');
    const path = await download.path();
    expect(readFileSync(path, 'utf8').split('\n')[0]).toBe(
      'Date,Merchant,Category,Account,Amount',
    );
    await expect(
      page.getByRole('dialog', { name: 'Import CSV' }),
    ).toBeVisible();

    await chooser(page).setInputFiles(path);
    await expect(page.getByText(/· 10 rows$/)).toBeVisible();
    await expect(page.getByText('3 rows need attention')).toBeVisible();
    // The sample is for looking at: leave without adding it.
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  });
});

test.describe('US4: cancel an import', () => {
  test('Escape and Cancel leave without saving, and a re-import starts fresh', async ({
    page,
  }) => {
    const mark = marker('import-cancel');
    const file = csvFile('cancel.csv', [
      HEADER,
      `${dayFirst(1)},${mark} Kept as is,,${E2E_ACCOUNT},4.00`,
    ]);
    await signIn(page);
    await openImport(page);
    await chooser(page).setInputFiles(file);
    await page.getByRole('combobox', { name: 'Category, row 1' }).fill('Typed');
    await page
      .getByRole('combobox', { name: 'Merchant, row 1' })
      .fill('Edited');

    await page
      .getByRole('combobox', { name: 'Merchant, row 1' })
      .press('Escape');
    await expect(
      page.getByRole('dialog', { name: 'Import CSV' }),
    ).toBeVisible();
    await chooser(page).setInputFiles(file);
    await expect(
      page.getByRole('combobox', { name: 'Merchant, row 1' }),
    ).toHaveValue(`${mark} Kept as is`);

    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.reload();
    await expect(page.getByText(mark)).toHaveCount(0);
  });
});

test.describe('import edge cases', () => {
  test('Import CSV is unavailable while a table row is open', async ({
    page,
  }) => {
    await signIn(page);
    const importButton = page.getByRole('button', { name: 'Import CSV' });
    await page.getByRole('button', { name: 'Add a spending row' }).click();
    await expect(importButton).toBeDisabled();
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await expect(importButton).toBeEnabled();
  });

  test('refuses files it cannot import, without opening the review', async ({
    page,
  }) => {
    await signIn(page);
    await openImport(page);
    const alert = page.getByRole('alert');
    const cases: [
      Parameters<ReturnType<typeof chooser>['setInputFiles']>[0],
      string,
    ][] = [
      [
        join(fixtures, 'not-csv.png'),
        'That doesn’t look like a CSV file. Choose a .csv export.',
      ],
      [join(fixtures, 'empty.csv'), 'No spendings found in that file.'],
      [join(fixtures, 'header-only.csv'), 'No spendings found in that file.'],
      [
        {
          name: 'many.csv',
          mimeType: 'text/csv',
          buffer: generated(1001, 'e2e-many'),
        },
        'That file is too large.',
      ],
      [
        {
          name: 'huge.csv',
          mimeType: 'text/csv',
          buffer: Buffer.alloc(1_048_577, 'a'),
        },
        'That file is too large.',
      ],
    ];
    for (const [file, message] of cases) {
      await chooser(page).setInputFiles(file);
      await expect(alert).toContainText(message);
      await expect(review(page)).toHaveCount(0);
    }
  });

  test('SC-005: a 1,000-row file is in the review within 3 s and edits are quick', async ({
    page,
  }) => {
    await signIn(page);
    await openImport(page);
    const started = Date.now();
    await chooser(page).setInputFiles({
      name: 'big.csv',
      mimeType: 'text/csv',
      buffer: generated(1000, 'e2e-big'),
    });
    await expect(page.getByText('big.csv · 1,000 rows')).toBeVisible({
      timeout: 3_000,
    });
    expect(Date.now() - started).toBeLessThan(3_000);

    const amount = page.getByRole('textbox', { name: /^Amount in .*, row 1$/ });
    const typed = Date.now();
    await amount.fill('');
    await expect(page.getByText('1 row needs attention')).toBeVisible();
    expect(Date.now() - typed).toBeLessThan(1_000);
    // Only a speed check: leave without adding.
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  });
});
