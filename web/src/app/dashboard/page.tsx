import Link from "next/link";
import { redirect } from "next/navigation";

import { listProjects } from "@/data/projects";
import {
  deleteProjectAction,
  duplicateProjectAction,
} from "@/app/dashboard/actions";
import { getVerifiedUser } from "@/lib/supabase/auth";

import styles from "@/features/projects/projects.module.css";

interface DashboardPageProps {
  readonly searchParams: Promise<{
    readonly error?: string;
    readonly notice?: string;
  }>;
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const user = await getVerifiedUser();
  if (!user) redirect("/login?next=/dashboard");
  const [projects, query] = await Promise.all([
    listProjects(user.id),
    searchParams,
  ]);

  return (
    <>
      <section className={styles.intro}>
        <div>
          <p className="eyebrow">Saved workspace</p>
          <h1>Your network projects</h1>
          <p>
            Inputs are private to your account. Every allocation is recalculated
            when it is saved or loaded.
          </p>
        </div>
        <Link className="button button-primary" href="/dashboard/new">
          New project
        </Link>
      </section>

      {query.notice === "deleted" ? (
        <p className={styles.notice} role="status">
          Project deleted.
        </p>
      ) : null}
      {query.notice === "duplicated" ? (
        <p className={styles.notice} role="status">
          Project duplicated.
        </p>
      ) : null}
      {query.error ? (
        <p className={styles.error} role="alert">
          The requested project operation could not be completed.
        </p>
      ) : null}

      {projects.length === 0 ? (
        <section className={styles.empty}>
          <h2>No saved projects yet</h2>
          <p>Create a private project and add the networks you need to plan.</p>
        </section>
      ) : (
        <section className={styles.grid} aria-label="Saved projects">
          {projects.map((project) => (
            <article className={styles.card} key={project.id}>
              <p className="eyebrow">Updated</p>
              <h2>{project.name}</h2>
              <p>{project.description || "No description"}</p>
              <code>{project.baseNetwork}</code>
              <div className={styles.cardActions}>
                <Link
                  className="button button-secondary"
                  href={`/dashboard/projects/${project.id}`}
                >
                  Open
                </Link>
                <form action={duplicateProjectAction}>
                  <input name="projectId" type="hidden" value={project.id} />
                  <button className="text-button" type="submit">
                    Duplicate
                  </button>
                </form>
                <form action={deleteProjectAction}>
                  <input name="projectId" type="hidden" value={project.id} />
                  <button className="text-button danger" type="submit">
                    Delete
                  </button>
                </form>
              </div>
            </article>
          ))}
        </section>
      )}
    </>
  );
}
