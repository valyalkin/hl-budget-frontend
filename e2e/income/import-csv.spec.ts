import { expect, test } from '@playwright/test';
import {
  csvFile,
  dayFirst,
  E2E_ACCOUNT,
  marker,
  monthOfDaysAgo,
  removeIncomeCreatedBy,
  signIn,
} from './support';

test.describe('specs/009 US5: import income from a CSV file', () => {
  test('the income import offers its sample, flags a spending category, and adds income only', async ({
    page,
  }) => {
    const mark = marker('inc-imp');
    await signIn(page);
    await page.goto('/income');
    await page.getByRole('button', { name: 'Import CSV' }).click();
    const dialog = page.getByRole('dialog', { name: 'Import income' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('link', { name: /sample/i })).toHaveAttribute(
      'href',
      '/sample-income.csv',
    );

    await page
      .getByLabel('Choose a CSV file')
      .setInputFiles(
        csvFile('income.csv', [
          'Date,Source,Category,Account,Amount',
          `${dayFirst(1)},${mark} Employer,Salary,${E2E_ACCOUNT},"2,000.00"`,
          `${dayFirst(1)},${mark} Broker,Groceries,${E2E_ACCOUNT},12.00`,
        ]),
      );
    const review = page.getByRole('dialog', { name: 'Review import' });
    await expect(review).toBeVisible();
    await expect(
      review.getByText('Not one of your income categories'),
    ).toBeVisible();
    await expect(review.getByRole('button', { name: /^Add / })).toBeDisabled();

    const category = review.getByRole('combobox', { name: /^Category, row 2/ });
    await category.fill('Investments');
    await category.press('Tab');
    await review.getByRole('button', { name: 'Add 2 income entries' }).click();
    await expect(page.getByRole('status')).toHaveText(
      'Added 2 income entries from income.csv',
    );
    await expect(page).toHaveURL(
      new RegExp(`/income\\?month=${monthOfDaysAgo(1)}`),
    );
    await expect(page.getByText(`${mark} Employer`)).toBeVisible();

    await page.goto(`/spendings?month=${monthOfDaysAgo(1)}`);
    await expect(page.getByText(`${mark} Employer`)).toHaveCount(0);

    await page.goto(`/income?month=${monthOfDaysAgo(1)}`);
    await removeIncomeCreatedBy(page, mark);
  });
});
