const shimmer =
  'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-linear-to-r before:from-transparent before:via-white/60 before:to-transparent';

/** Mirrors the Overview (heading, three tiles, three cards) so nothing jumps on load. */
export default function OverviewSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading overview"
      className={`${shimmer} mx-auto flex max-w-[1240px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="h-10 w-48 rounded bg-line" />
        <div className="h-14 w-44 rounded-[14px] bg-surface" />
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="h-28 rounded-[14px] bg-surface" />
        ))}
      </div>
      <div className="h-96 rounded-[14px] bg-surface" />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(460px,100%),1fr))] gap-6">
        <div className="h-80 rounded-[14px] bg-surface" />
        <div className="h-64 rounded-[14px] bg-surface" />
      </div>
    </div>
  );
}
