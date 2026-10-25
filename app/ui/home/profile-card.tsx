import type { UserProfile } from '@/app/lib/definitions';
import { greeting, initials } from '@/app/lib/utils';
import Avatar from '@/app/ui/home/avatar';

export default function ProfileCard({ profile }: { profile: UserProfile }) {
  const label = profile.displayName ?? profile.email ?? 'Your avatar';

  return (
    <section
      aria-labelledby="profile-greeting"
      className="flex items-center gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
    >
      <Avatar
        url={profile.avatarUrl}
        initials={initials(profile)}
        label={label}
      />
      <div className="min-w-0">
        <h2 id="profile-greeting" className="truncate text-xl font-semibold">
          {greeting(profile)}
        </h2>
        {profile.email ? (
          <p className="truncate text-sm text-slate-600">{profile.email}</p>
        ) : null}
      </div>
    </section>
  );
}
