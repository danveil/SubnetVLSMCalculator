import type { ReactNode } from "react";
import Link from "next/link";

import styles from "@/features/projects/projects.module.css";

export default function DashboardLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <Link className="brand" href="/" aria-label="SubnetForge home">
          <span className="brand-mark">SF</span>
          <span>
            <strong>SubnetForge</strong>
            <small>Cloud workspace</small>
          </span>
        </Link>
        <nav aria-label="Workspace navigation">
          <Link href="/">Calculator</Link>
          <Link href="/dashboard">Projects</Link>
          <form action="/auth/signout" method="post">
            <button className="text-button" type="submit">
              Sign out
            </button>
          </form>
        </nav>
      </header>
      {children}
    </main>
  );
}
