import { describe, expect, it } from 'vitest';
import { LEDGER, ledgerHref, LEDGERS } from '@/app/lib/ledger';

/** specs/009 research R-006: what the screens word and store differently per ledger. */
describe('LEDGER', () => {
  it('keeps the spending wording exactly as before feature 009', () => {
    const t = LEDGER.spendings;
    expect(t.route).toBe('/spendings');
    expect(t.party).toBe('Merchant');
    expect(t.emptyMonth('October 2026')).toBe(
      'No spendings recorded in October 2026.',
    );
    expect(t.emptyMonthPhone('October 2026')).toBe(
      'No spendings in October 2026.',
    );
    expect(t.count(1)).toBe('1 spending');
    expect(t.count(14)).toBe('14 spendings');
    expect(t.partyMissing).toBe('Add a merchant name.');
    expect(t.unknownCategory).toBe('Not one of your categories');
    expect(t.storageKeys).toEqual({
      category: 'hlb.byCategoryView',
      account: 'hlb.byAccountView',
    });
    expect(t.sample).toBe('/sample-spendings.csv');
    expect(t.addLabel(0)).toBe('Add spendings');
    expect(t.addLabel(2)).toBe('Add 2 spendings');
  });

  it('words income as entries with a Source, and keeps its own chart choices', () => {
    const t = LEDGER.income;
    expect(t.route).toBe('/income');
    expect(t.tab).toBe('Income');
    expect(t.party).toBe('Source');
    expect(t.emptyMonth('October 2026')).toBe(
      'No income recorded in October 2026.',
    );
    expect(t.emptyMonthPhone('October 2026')).toBe(
      'No income in October 2026.',
    );
    expect(t.count(1)).toBe('1 entry');
    expect(t.count(3)).toBe('3 entries');
    expect(t.partyMissing).toBe('Add a source.');
    expect(t.unknownCategory).toBe('Not one of your income categories');
    expect(t.addButton).toBe('Add income');
    expect(t.storageKeys).toEqual({
      category: 'hlb.income.byCategoryView',
      account: 'hlb.income.byAccountView',
    });
    expect(t.sample).toBe('/sample-income.csv');
    expect(t.importTitle).toBe('Import income');
    expect(t.added(2, 'oct.csv')).toBe('Added 2 income entries from oct.csv');
  });

  it('builds each ledger’s address for a month', () => {
    expect(LEDGERS).toEqual(['spendings', 'income']);
    expect(ledgerHref('income', '2026-09')).toBe('/income?month=2026-09');
    expect(ledgerHref('spendings', '2026-09')).toBe('/spendings?month=2026-09');
  });
});
