import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import {
  checkScreen,
  csvFile,
  dayFirst,
  deletePhoneSpendings,
  E2E_ACCOUNT,
  marker,
  monthOfDaysAgo,
  openFromMenu,
  phoneRoot,
  signInPhone,
} from './support';

const FIXTURES = path.join(__dirname, '..', 'fixtures');

/** `YYYY-MM-DD`, `daysAgo` days before today. */
function iso(daysAgo: number): string {
  const day = new Date(Date.now() - daysAgo * 86_400_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
}

function picker(page: Page) {
  return page
    .getByRole('dialog', { name: 'Import CSV' })
    .getByLabel('Choose a CSV file');
}

test.describe('US6 (phone): import a CSV file', () => {
  test('refuses files it cannot import', async ({ page }) => {
    await signInPhone(page);
    await openFromMenu(page, 'Import CSV');
    const screen = page.getByRole('dialog', { name: 'Import CSV' });
    await expect(screen.getByText('Choose file')).toBeVisible();
    await expect(screen.getByText(/drag|drop/i)).toHaveCount(0);
    await checkScreen(page);

    await picker(page).setInputFiles(path.join(FIXTURES, 'not-csv.png'));
    await expect(screen.getByRole('alert')).toHaveText(
      'That doesn’t look like a CSV file. Choose a .csv export.',
    );
    await picker(page).setInputFiles(path.join(FIXTURES, 'empty.csv'));
    await expect(screen.getByRole('alert')).toContainText(
      'No spendings found in that file.',
    );
    await picker(page).setInputFiles(path.join(FIXTURES, 'header-only.csv'));
    await expect(screen.getByRole('alert')).toContainText(
      'No spendings found in that file.',
    );
  });

  test('review, fix and remove rows, then add them all', async ({ page }) => {
    const mark = marker('phone-import');
    const coffee = `${mark} Coffee`;
    const file = csvFile('phone-import.csv', [
      'Date,Description,Category,Account,Amount',
      `${iso(2)},${mark} Bakery,Groceries,${E2E_ACCOUNT},12.40`,
      `${iso(3)},"${mark} Fuel, Hwy 7",Car,${E2E_ACCOUNT},61.20`,
      `${iso(3)},${mark} Dental,,${E2E_ACCOUNT},185.00`,
      `${iso(4)},${mark} Yoga,Sport,,24.00`,
      `,${mark} Hardware,Household,Cash,41.18`,
      `${iso(5)},${mark} Thrift,Clothes,${E2E_ACCOUNT},`,
      `${iso(5)},${mark} Ride,Taxi,${E2E_ACCOUNT},"-18.90"`,
      `10/27/2026,${mark} Cafe,${coffee},${E2E_ACCOUNT},6.75`,
      `${dayFirst(1)},${mark} Library,Education,${E2E_ACCOUNT},5.00`,
      `${iso(1)},${mark} Market,Groceries,${E2E_ACCOUNT},"$1,204.50"`,
    ]);
    await signInPhone(page);
    await openFromMenu(page, 'Import CSV');
    await picker(page).setInputFiles(file);

    const review = page.getByRole('dialog', { name: 'Review import' });
    await expect(review).toBeVisible();
    await expect(review.getByText('phone-import.csv · 10 rows')).toBeVisible();
    await expect(review.getByRole('status')).toHaveText(
      '5 rows need attention',
    );
    await expect(
      review.getByRole('button', { name: new RegExp(`^${mark} Fuel, Hwy 7,`) }),
    ).toBeVisible();
    await expect(
      review.getByRole('button', {
        name: new RegExp(`^${mark} Ride, .*\\$18\\.90$`),
      }),
    ).toBeVisible();
    await expect(
      review.getByRole('button', {
        name: new RegExp(`^${mark} Market, .*\\$1,204\\.50$`),
      }),
    ).toBeVisible();
    await expect(
      review.getByRole('button', {
        name: new RegExp(`^${mark} Cafe, No date,`),
      }),
    ).toBeVisible();
    await expect(review.getByText('No category')).toBeVisible();
    await expect(review.getByText('No account')).toBeVisible();
    await expect(review.getByText('No amount')).toBeVisible();
    await expect(
      review.getByRole('button', { name: 'Add spendings' }),
    ).toBeDisabled();
    await checkScreen(page);

    const fix = page.getByRole('dialog', { name: 'Fix row' });
    const openRow = (name: string) =>
      review
        .getByRole('button', { name: new RegExp(`^${mark} ${name},`) })
        .click();

    // Save row refuses an incomplete row.
    await openRow('Dental');
    await fix.getByRole('button', { name: 'Save row' }).click();
    await expect(fix.getByRole('alert')).toHaveText(
      'Choose or type a category.',
    );
    await fix.getByRole('combobox', { name: 'Category' }).fill('Health');
    await fix.getByRole('button', { name: 'Save row' }).click();
    await expect(fix).toHaveCount(0);
    await expect(review.getByRole('status')).toHaveText(
      '4 rows need attention',
    );

    await openRow('Yoga');
    await fix.getByRole('combobox', { name: 'Account' }).fill(E2E_ACCOUNT);
    await fix.getByRole('button', { name: 'Save row' }).click();

    for (const name of ['Hardware', 'Cafe']) {
      await openRow(name);
      await fix.getByRole('button', { name: /^Date/ }).click();
      await fix.getByRole('button', { name: 'Today' }).click();
      await fix.getByRole('button', { name: 'Save row' }).click();
      await expect(fix).toHaveCount(0);
    }

    // Remove row: at once, no confirmation.
    await openRow('Thrift');
    await fix.getByRole('button', { name: 'Remove row' }).click();
    await expect(fix).toHaveCount(0);
    await expect(
      review.getByRole('button', { name: new RegExp(`^${mark} Thrift,`) }),
    ).toHaveCount(0);

    await expect(review.getByRole('status')).toHaveText('All rows look good');
    await review.getByRole('button', { name: 'Add 9 spendings' }).dblclick();
    await expect(review).toHaveCount(0);
    await expect(phoneRoot(page).getByRole('status')).toHaveText(
      'Added 9 spendings from phone-import.csv',
    );

    // Clean up: every month the rows landed in, and the new category.
    for (const month of new Set([
      monthOfDaysAgo(0),
      monthOfDaysAgo(1),
      monthOfDaysAgo(5),
    ])) {
      await page.goto(`/spendings?month=${month}`);
      await deletePhoneSpendings(page, mark);
    }
    await openFromMenu(page, 'Settings');
    await page.getByRole('button', { name: `Remove ${coffee}` }).click();
    await expect(
      page.getByRole('button', { name: `Remove ${coffee}` }),
    ).toHaveCount(0);
  });

  test('Back on the review discards it and returns to the file step', async ({
    page,
  }) => {
    const mark = marker('phone-import-back');
    await signInPhone(page);
    await openFromMenu(page, 'Import CSV');
    await picker(page).setInputFiles(
      csvFile('back.csv', [
        'Date,Merchant,Category,Account,Amount',
        `${iso(1)},${mark},Groceries,${E2E_ACCOUNT},1.00`,
      ]),
    );
    const review = page.getByRole('dialog', { name: 'Review import' });
    await expect(review).toBeVisible();
    await review
      .getByRole('button', { name: 'Back to file selection' })
      .click();
    await expect(review).toHaveCount(0);
    await expect(
      page.getByRole('dialog', { name: 'Import CSV' }),
    ).toBeVisible();
  });
});
