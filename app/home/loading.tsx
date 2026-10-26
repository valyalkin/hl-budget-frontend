import { ProfileCardSkeleton } from '@/app/ui/skeletons';

export default function Loading() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <ProfileCardSkeleton />
    </main>
  );
}
