'use client';

import { useState } from 'react';

/**
 * The one client leaf on the home page: it needs onError to swap a broken image for the
 * initials placeholder.
 */
export default function Avatar({
  url,
  initials,
  label,
}: {
  url: string | null;
  initials: string | null;
  label: string;
}) {
  const [failed, setFailed] = useState(false);

  if (url && !failed) {
    return (
      // Avatars come from any https host at the identity provider; next/image would need every
      // host listed in remotePatterns.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={label}
        width={64}
        height={64}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="size-16 rounded-full object-cover"
      />
    );
  }

  return (
    <span
      role="img"
      aria-label={label}
      className="flex size-16 items-center justify-center rounded-full bg-emerald-100 text-xl font-semibold text-emerald-800"
    >
      {initials ?? (
        <svg
          aria-hidden="true"
          data-testid="neutral-avatar-icon"
          viewBox="0 0 24 24"
          className="size-8"
          fill="currentColor"
        >
          <path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0 2.25c-3.9 0-7.5 2-7.5 4.75 0 .55.45 1 1 1h13c.55 0 1-.45 1-1 0-2.75-3.6-4.75-7.5-4.75Z" />
        </svg>
      )}
    </span>
  );
}
