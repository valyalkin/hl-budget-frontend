'use client';

import { createIncomeCategory, deleteIncomeCategory } from '@/app/lib/actions';
import type { NamedItem } from '@/app/lib/definitions';
import { incomeCategoryUsage, inUse, MESSAGES } from '@/app/lib/messages';
import NamedListPanel from '@/app/ui/settings/named-list-panel';

/**
 * Salary and Investments (locked) and the caller's own income categories, each with its colour
 * and how many income entries use it (specs/009 FR-090, FR-091). A separate list from spending
 * categories: the same name may exist in both. Removing one that income uses is refused with the
 * count (FR-023).
 */
export default function IncomeCategoriesPanel({
  categories,
}: {
  categories: readonly (NamedItem & { isDefault: boolean; color: string })[];
}) {
  const defaults = categories.filter((c) => c.isDefault);
  const custom = categories.filter((c) => !c.isDefault);
  const colorOf = (item: NamedItem) =>
    categories.find((c) => c.id === item.id)?.color;

  return (
    <div className="flex flex-col gap-6">
      <section
        aria-labelledby="default-income-categories"
        className="flex flex-col gap-3"
      >
        <h3
          id="default-income-categories"
          className="font-display text-base font-bold"
        >
          Default income categories · {defaults.length}
        </h3>
        <ul className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
          {defaults.map((category) => (
            <li
              key={category.id}
              className="flex items-center gap-2 py-1 text-sm"
            >
              <span
                aria-hidden="true"
                data-testid="income-category-swatch"
                className="size-3 shrink-0 rounded-sm"
                style={{ backgroundColor: category.color }}
              />
              <span className="min-w-0 flex-1 truncate">{category.name}</span>
              <span className="sr-only">Default income category</span>
              <span className="text-xs text-muted">
                {incomeCategoryUsage(category.count)}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <NamedListPanel
        items={custom}
        taken={categories}
        create={createIncomeCategory}
        remove={deleteIncomeCategory}
        copy={{
          heading: 'Your income categories',
          addLabel: 'New income category',
          empty: 'You have not added any income categories yet.',
          emptyName: MESSAGES.categoryName,
          describe: (item) => incomeCategoryUsage(item.count),
          colorOf,
          refusal: (item) =>
            item.count > 0
              ? inUse('incomeCategory', item.name, item.count, item.count)
              : null,
        }}
      />
    </div>
  );
}
