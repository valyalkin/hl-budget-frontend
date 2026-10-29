const shimmer =
  'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-linear-to-r before:from-transparent before:via-white/60 before:to-transparent';

/** Mirrors the Spendings screen (month line, table, two cards) so nothing jumps on load. */
export function SpendingsSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading spendings"
      className={`${shimmer} mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6`}
    >
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-12">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="h-14 rounded-lg bg-line-soft" />
        ))}
      </div>
      <div className="h-8 w-48 rounded bg-line" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-2 rounded-2xl bg-surface p-4">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-8 rounded bg-line-soft" />
          ))}
        </div>
        <div className="flex flex-col gap-6">
          <div className="h-28 rounded-2xl bg-surface" />
          <div className="h-64 rounded-2xl bg-surface" />
        </div>
      </div>
    </div>
  );
}
