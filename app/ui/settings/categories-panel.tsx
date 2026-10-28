'use client';

import { createCategory, deleteCategory } from '@/app/lib/actions';
import type { NamedItem } from '@/app/lib/definitions';
import { inUse, MESSAGES } from '@/app/lib/messages';
import NamedListPanel, { usage } from '@/app/ui/settings/named-list-panel';

/**
 * The 17 defaults (locked) and the caller's own categories (FR-081). Removing one that spendings
 * use is refused with the count (FR-084).
 */
export default function CategoriesPanel({
  categories,
}: {
  categories: readonly (NamedItem & { isDefault: boolean })[];
}) {
  const defaults = categories.filter((c) => c.isDefault);
  const custom = categories.filter((c) => !c.isDefault);

  return (
    <div className="flex flex-col gap-6">
      <section
        aria-labelledby="default-categories"
        className="flex flex-col gap-3"
      >
        <h3
          id="default-categories"
          className="font-display text-base font-bold"
        >
          Default categories · {defaults.length}
        </h3>
        <p className="text-sm text-muted">
          Every account starts with the default set. Add your own for anything
          they don&apos;t cover.
        </p>
        <ul className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
          {defaults.map((category) => (
            <li
              key={category.id}
              className="flex items-center gap-2 py-1 text-sm"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                role="img"
                aria-label="Default category"
                className="shrink-0 text-muted"
              >
                <rect
                  x="3"
                  y="7"
                  width="10"
                  height="7"
                  rx="1.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M5.5 7V5a2.5 2.5 0 015 0v2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
              <span className="min-w-0 flex-1 truncate">{category.name}</span>
              <span className="text-xs text-muted">
                {usage(category.count)}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <NamedListPanel
        items={custom}
        taken={categories}
        create={createCategory}
        remove={deleteCategory}
        copy={{
          heading: 'Your categories',
          addLabel: 'New category',
          empty: 'You have not added any categories yet.',
          emptyName: MESSAGES.categoryName,
          refusal: (item) =>
            item.count > 0 ? inUse('category', item.name, item.count) : null,
        }}
      />
    </div>
  );
}
