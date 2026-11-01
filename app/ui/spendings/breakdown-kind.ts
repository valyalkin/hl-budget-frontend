/** What a breakdown groups the month's spending by: categories (feature 003) or accounts (specs/008). */
export type BreakdownKind = 'category' | 'account';

/** One row of a breakdown: a category or an account with its month total. */
export type BreakdownItem = {
  id: string;
  name: string;
  cents: number;
  /** The item's own colour, `#rrggbb` (specs/007 FR-004, specs/008 FR-024). */
  color: string;
};

/** The labels, ids and storage key that differ between the two breakdowns (specs/008 research R-006). */
export const BREAKDOWN: Record<
  BreakdownKind,
  {
    heading: string;
    headingId: string;
    column: string;
    singular: string;
    plural: string;
    swatchTestId: string;
    legendTestId: string;
    storageKey: string;
  }
> = {
  category: {
    heading: 'By category',
    headingId: 'by-category',
    column: 'Category',
    singular: 'category',
    plural: 'categories',
    swatchTestId: 'category-swatch',
    legendTestId: 'legend-swatch',
    storageKey: 'hlb.byCategoryView',
  },
  account: {
    heading: 'By account',
    headingId: 'by-account',
    column: 'Account',
    singular: 'account',
    plural: 'accounts',
    swatchTestId: 'account-swatch',
    legendTestId: 'account-legend-swatch',
    storageKey: 'hlb.byAccountView',
  },
};
