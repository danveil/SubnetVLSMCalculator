import Link from "next/link";
import type { ReactNode } from "react";

import { brand } from "@/config/brand";

import styles from "./auth.module.css";

type Notice = {
  tone: "error" | "success";
  message: string;
};

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
  notice?: Notice;
};

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
  notice,
}: AuthShellProps) {
  const titleId = `auth-${eyebrow.toLowerCase().replaceAll(" ", "-")}`;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link
          className={styles.brand}
          href="/"
          aria-label={`${brand.name} home`}
        >
          <span className={styles.brandMark} aria-hidden="true">
            SF
          </span>
          <span>
            <strong>{brand.name}</strong>
            <small>Address planning workspace</small>
          </span>
        </Link>
        <Link className={styles.homeLink} href="/">
          Back to calculator
        </Link>
      </header>

      <section className={styles.card} aria-labelledby={titleId}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={styles.title} id={titleId}>
          {title}
        </h1>
        <p className={styles.description}>{description}</p>

        {notice ? (
          <p
            className={`${styles.notice} ${
              notice.tone === "error"
                ? styles.noticeError
                : styles.noticeSuccess
            }`}
            role={notice.tone === "error" ? "alert" : "status"}
          >
            {notice.message}
          </p>
        ) : null}

        {children}
        <div className={styles.footer}>{footer}</div>
      </section>
    </main>
  );
}
