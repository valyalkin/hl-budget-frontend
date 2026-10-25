/** A plain link: /auth/logout clears the cookie and ends the Auth0 session (FR-009). */
export default function SignOutLink() {
  return (
    <a
      href="/auth/logout"
      className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-emerald-700"
    >
      Sign out
    </a>
  );
}
