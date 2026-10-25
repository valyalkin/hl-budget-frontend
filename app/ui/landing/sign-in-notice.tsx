/** Announced politely to screen readers; shown after a cancelled or failed sign-in (FR-006). */
export default function SignInNotice() {
  return (
    <p
      role="status"
      aria-live="polite"
      className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200"
    >
      Sign-in did not complete. You can try again.
    </p>
  );
}

/** Reads searchParams inside <Suspense> so the landing shell stays prerendered. */
export async function SignInNoticeSection({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { signin } = await searchParams;
  return signin === 'failed' ? <SignInNotice /> : null;
}
