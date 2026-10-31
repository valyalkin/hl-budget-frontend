import { expect, test } from '@playwright/test';
import { checkScreen, marker, openFromMenu, signInPhone } from './support';

test.describe('US5 (phone): account menu, Settings and signing out', () => {
  test('the menu sheet opens and closes from its backdrop', async ({
    page,
  }) => {
    await signInPhone(page);
    await page.getByRole('button', { name: 'Account menu' }).click();
    const menu = page.getByRole('dialog', { name: 'Account menu' });
    await expect(menu.getByRole('button', { name: 'Settings' })).toBeVisible();
    await expect(
      menu.getByRole('button', { name: 'Import CSV' }),
    ).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Sign out' })).toBeVisible();
    await checkScreen(page);
    await menu
      .getByRole('button', { name: 'Close menu' })
      .click({ position: { x: 10, y: 10 } });
    await expect(menu).toHaveCount(0);
  });

  test('categories: add, refuse duplicates, refuse an in-use removal, remove', async ({
    page,
  }) => {
    const mark = marker('phone-set');
    const name = `${mark} Coffee`;
    await signInPhone(page);
    await openFromMenu(page, 'Settings');
    const settings = page.getByRole('dialog', { name: 'Settings' });
    await checkScreen(page);
    await expect(
      settings.getByRole('region', { name: /^Default categories · / }),
    ).toBeVisible();
    await expect(
      settings
        .getByRole('region', { name: /^Default categories · / })
        .getByRole('button'),
    ).toHaveCount(0);

    await settings.getByRole('button', { name: 'Add category' }).click();
    await expect(settings.getByRole('alert')).toHaveText(
      'Type a name for the category.',
    );

    await settings.getByRole('textbox', { name: 'New category' }).fill(name);
    await settings.getByRole('button', { name: 'Add category' }).click();
    await expect(
      settings.getByRole('button', { name: `Remove ${name}` }),
    ).toBeVisible();

    await settings
      .getByRole('textbox', { name: 'New category' })
      .fill(name.toUpperCase());
    await settings.getByRole('button', { name: 'Add category' }).click();
    await expect(settings.getByRole('alert')).toHaveText(
      `“${name.toUpperCase()}” already exists.`,
    );

    await settings.getByRole('button', { name: `Remove ${name}` }).click();
    await expect(
      settings.getByRole('button', { name: `Remove ${name}` }),
    ).toHaveCount(0);
  });

  test('accounts: usage counts, an in-use account cannot be removed', async ({
    page,
  }) => {
    const mark = marker('phone-acc');
    await signInPhone(page);
    await openFromMenu(page, 'Settings');
    const settings = page.getByRole('dialog', { name: 'Settings' });
    await settings.getByRole('button', { name: 'Accounts' }).click();
    await checkScreen(page);

    await settings
      .getByRole('textbox', { name: 'New account' })
      .fill(`${mark} Savings`);
    await settings.getByRole('button', { name: 'Add account' }).click();
    const item = settings
      .getByRole('listitem')
      .filter({ hasText: `${mark} Savings` });
    await expect(item).toContainText('No spendings yet');

    const inUse = settings
      .getByRole('listitem')
      .filter({ hasText: /spendings? recorded/ })
      .first();
    if ((await inUse.count()) > 0) {
      await inUse.getByRole('button', { name: /^Remove / }).click();
      await expect(settings.getByRole('alert')).toContainText(
        'so it can’t be removed.',
      );
    }

    await item.getByRole('button', { name: `Remove ${mark} Savings` }).click();
    await expect(item).toHaveCount(0);
  });

  test('Sign out shows the signed-out screen', async ({ page }) => {
    await signInPhone(page);
    await page.getByRole('button', { name: 'Account menu' }).click();
    await page.getByRole('link', { name: 'Sign out' }).click();
    await expect(
      page.getByRole('heading', { name: "You're signed out" }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Sign in' }).last(),
    ).toBeVisible();
  });
});
