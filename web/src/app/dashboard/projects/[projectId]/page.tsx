import { notFound, redirect } from "next/navigation";

import { getProject } from "@/data/projects";
import { ProjectEditor } from "@/features/projects/ProjectEditor";
import { isUuid } from "@/features/projects/workspace";
import { getVerifiedUser } from "@/lib/supabase/auth";

import styles from "@/features/projects/projects.module.css";

interface ProjectPageProps {
  readonly params: Promise<{ readonly projectId: string }>;
  readonly searchParams: Promise<{ readonly saved?: string }>;
}

export default async function ProjectPage({
  params,
  searchParams,
}: ProjectPageProps) {
  const [{ projectId }, query, user] = await Promise.all([
    params,
    searchParams,
    getVerifiedUser(),
  ]);
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(`/dashboard/projects/${projectId}`)}`,
    );
  }
  if (!isUuid(projectId)) notFound();

  const project = await getProject(user.id, projectId);
  if (!project) notFound();

  return (
    <>
      {query.saved === "1" ? (
        <p className={styles.notice} role="status">
          Project saved and recalculated successfully.
        </p>
      ) : null}
      <p className="eyebrow">Saved project</p>
      <h1>Edit {project.name}</h1>
      <ProjectEditor
        initialBaseNetwork={project.baseNetwork}
        initialDescription={project.description}
        initialName={project.name}
        initialRequirements={project.requirements}
        projectId={project.id}
      />
    </>
  );
}
