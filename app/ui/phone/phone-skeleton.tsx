/** The phone screen's shape while it loads; text-free except for one status for screen readers. */
export default function PhoneSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-4 py-3">
      <p role="status" className="sr-only">
        Loading spendings
      </p>
      <div aria-hidden="true" className="flex flex-col gap-4">
        <div className="flex h-11 items-center justify-between">
          <div className="h-6 w-32 rounded bg-line-soft" />
          <div className="size-11 rounded-full bg-line-soft" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="h-12 rounded-xl bg-line-soft" />
          <div className="h-12 rounded-xl bg-line-soft" />
        </div>
        <div className="h-10 w-48 rounded bg-line-soft" />
        <div className="h-11 rounded-xl bg-line-soft" />
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-14 rounded-xl bg-surface" />
        ))}
      </div>
    </div>
  );
}
