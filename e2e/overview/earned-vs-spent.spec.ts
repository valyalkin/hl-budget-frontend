import { expect, test } from '@playwright/test';
import { card, openOverviewTab, showAs, signIn } from './support';

/** specs/011 US2: the Earned vs spent card, as a chart and as a table. */
test.describe('Overview earned vs spent (specs/011 US2)', () => {
  test('draws the months, explains them on hover and keys, and keeps the view', async ({
    page,
  }) => {
    await signIn(page);
    await openOverviewTab(page);
    const months = card(page, 'Earned vs spent');
    await expect(months.getByText(/^Month by month, \d{4}$/)).toBeVisible();

    // Make sure the chart is shown first (another run may have left Table).
    await showAs(months, 'Chart');
    const chart = months.getByRole('img', {
      name: /^Column chart of money earned and spent in each month of \d{4}\./,
    });
    await expect(chart.locator('svg')).toBeVisible();

    // FR-014: hovering a month names it with both amounts to the cent.
    await chart.scrollIntoViewIfNeeded();
    const box = await chart.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      await page.mouse.move(box.x + box.width * 0.1, box.y + box.height / 2);
    }
    await expect(
      page.getByText(/Earned\s+\$[\d,]+\.\d{2}/).first(),
    ).toBeVisible();

    // Keyboard: focus shows January; Right moves on; Escape hides.
    const slider = months.getByRole('slider', { name: 'Months' });
    await slider.focus();
    await expect(slider).toHaveAttribute('aria-valuetext', /^January: /);
    await page.keyboard.press('ArrowRight');
    await expect(slider).toHaveAttribute('aria-valuetext', /^February: /);
    await page.keyboard.press('Escape');
    await expect(slider).toHaveAttribute(
      'aria-valuetext',
      'Use the arrow keys to read each one',
    );

    // FR-015: the table lists the months to date, with Net = Earned − Spent.
    await showAs(months, 'Table');
    const rows = months.getByRole('row');
    const last = rows.last();
    const cells = last.getByRole('cell');
    const value = async (i: number) => {
      const text = (await cells.nth(i).textContent()) ?? '';
      const n = Number.parseInt(text.replace(/[^\d]/g, ''), 10) || 0;
      return /^[−-]/.test(text) ? -n : n;
    };
    const net = (await value(1)) - (await value(2));
    // Each cell is rounded to whole dollars, so allow a dollar either way.
    expect(Math.abs((await value(3)) - net)).toBeLessThanOrEqual(1);

    // FR-023: the choice survives a reload.
    await page.reload();
    await expect(
      card(page, 'Earned vs spent').getByRole('button', { name: 'Table' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await showAs(card(page, 'Earned vs spent'), 'Chart');
  });
});
