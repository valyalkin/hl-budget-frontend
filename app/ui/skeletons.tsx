const shimmer =
  'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-linear-to-r before:from-transparent before:via-white/60 before:to-transparent';

/** Mirrors ProfileCard's layout so nothing jumps when the profile arrives. */
export function ProfileCardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading your profile"
      className={`${shimmer} flex items-center gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200`}
    >
      <div className="size-16 rounded-full bg-slate-200" />
      <div className="flex flex-col gap-2">
        <div className="h-6 w-48 rounded bg-slate-200" />
        <div className="h-4 w-32 rounded bg-slate-100" />
      </div>
    </div>
  );
}

export function LandingActionsSkeleton() {
  return <div className="h-11 w-32 rounded-lg bg-slate-200" />;
}
