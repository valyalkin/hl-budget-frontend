import { ensureMyProfile } from '@/app/lib/data';
import ProfileCard from '@/app/ui/home/profile-card';

/** The async boundary of the home page: reads the per-user profile at request time. */
export default async function ProfileSection() {
  const profile = await ensureMyProfile();
  return <ProfileCard profile={profile} />;
}
