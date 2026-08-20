import Link from "next/link";

export type PublicNavigationAuthState = "checking" | "signed-in" | "signed-out";

interface PublicNavigationProps {
  readonly authState: PublicNavigationAuthState;
}

export function PublicNavigation({ authState }: PublicNavigationProps) {
  const isAuthenticated = authState === "signed-in";

  return (
    <nav aria-label="Primary navigation">
      <a href="#workspace">Calculator</a>
      <a href="#vlsm">VLSM</a>
      <a href="#validation-tools">Validate</a>
      <a href="#features">Features</a>
      <Link href="/dashboard">Projects</Link>
      {authState === "checking" ? (
        <span
          aria-live="polite"
          className="navigation-account-loading"
          role="status"
        >
          Checking account
        </span>
      ) : isAuthenticated ? (
        <form action="/auth/signout" method="post">
          <button className="navigation-account-button" type="submit">
            Sign out
          </button>
        </form>
      ) : (
        <Link href="/login">Sign in</Link>
      )}
      <span className="status-pill">
        {isAuthenticated ? "Cloud workspace" : "Local-first"}
      </span>
    </nav>
  );
}
