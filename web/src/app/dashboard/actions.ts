"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getProject } from "@/data/projects";
import type { ProjectActionState } from "@/features/projects/action-state";
import { isUuid, parseProjectWorkspace } from "@/features/projects/workspace";
import { planLimits } from "@/config/plans";
import { getVerifiedUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

async function authenticatedContext() {
  const user = await getVerifiedUser();
  if (!user) return null;
  return { user, supabase: await createClient() };
}

async function canCreateProject(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", userId);

  if (error) {
    console.error("Unable to check project capacity", { code: error.code });
    throw new Error("Unable to check project capacity.");
  }
  return (count ?? 0) < planLimits.free.savedProjects;
}

function projectLimitError(): ProjectActionState {
  return {
    error: `The free plan supports ${planLimits.free.savedProjects} saved projects. Delete one before creating another.`,
  };
}

export async function saveProjectAction(
  _previous: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const context = await authenticatedContext();
  if (!context) return { error: "Sign in before saving a project." };

  const rawProjectId = formData.get("projectId");
  const projectId = typeof rawProjectId === "string" ? rawProjectId : "";
  if (projectId && !isUuid(projectId)) {
    return { error: "The project identifier is invalid." };
  }

  let workspace;
  try {
    workspace = parseProjectWorkspace(formData);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "The project is invalid.",
    };
  }

  if (!projectId) {
    try {
      if (!(await canCreateProject(context.user.id))) {
        return projectLimitError();
      }
    } catch {
      return { error: "Unable to save this project. Please try again." };
    }
  }
  if (projectId) {
    const existing = await getProject(context.user.id, projectId);
    if (!existing) return { error: "Project not found." };
  }

  const requirements = workspace.requirements.map((requirement, position) => ({
    name: requirement.name,
    required_hosts: requirement.requiredHosts,
    point_to_point: requirement.pointToPoint ?? false,
    position,
  }));
  const { data, error } = await context.supabase.rpc("save_project_workspace", {
    p_project_id: projectId || null,
    p_name: workspace.name,
    p_description: workspace.description || null,
    p_base_network: workspace.baseNetwork,
    p_requirements: requirements,
  });

  if (error?.code === "P0003") {
    return projectLimitError();
  }
  if (error || typeof data !== "string") {
    console.error("Unable to save project", { code: error?.code });
    return { error: "Unable to save this project. Please try again." };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/projects/${data}`);
  redirect(`/dashboard/projects/${data}?saved=1`);
}

export async function duplicateProjectAction(
  formData: FormData,
): Promise<void> {
  const context = await authenticatedContext();
  if (!context) redirect("/login");

  const rawProjectId = formData.get("projectId");
  const projectId = typeof rawProjectId === "string" ? rawProjectId : "";
  if (!isUuid(projectId)) {
    redirect("/dashboard?error=duplicate");
  }

  let hasCapacity: boolean;
  try {
    hasCapacity = await canCreateProject(context.user.id);
  } catch {
    redirect("/dashboard?error=duplicate");
  }
  if (!hasCapacity) redirect("/dashboard?error=duplicate");

  const source = await getProject(context.user.id, projectId);
  if (!source) redirect("/dashboard?error=duplicate");

  const form = new FormData();
  form.set("name", `${source.name} copy`.slice(0, 80));
  form.set("description", source.description);
  form.set("baseNetwork", source.baseNetwork);
  form.set("requirements", JSON.stringify(source.requirements));
  const workspace = parseProjectWorkspace(form);
  const requirements = workspace.requirements.map((requirement, position) => ({
    name: requirement.name,
    required_hosts: requirement.requiredHosts,
    point_to_point: requirement.pointToPoint ?? false,
    position,
  }));
  const { error } = await context.supabase.rpc("save_project_workspace", {
    p_project_id: null,
    p_name: workspace.name,
    p_description: workspace.description || null,
    p_base_network: workspace.baseNetwork,
    p_requirements: requirements,
  });

  if (error) {
    console.error("Unable to duplicate project", { code: error.code });
    redirect("/dashboard?error=duplicate");
  }
  revalidatePath("/dashboard");
  redirect("/dashboard?notice=duplicated");
}

export async function deleteProjectAction(formData: FormData): Promise<void> {
  const context = await authenticatedContext();
  if (!context) redirect("/login");

  const rawProjectId = formData.get("projectId");
  const projectId = typeof rawProjectId === "string" ? rawProjectId : "";
  if (!isUuid(projectId)) redirect("/dashboard?error=delete");

  const { data, error } = await context.supabase
    .from("projects")
    .delete()
    .eq("id", projectId)
    .eq("owner_id", context.user.id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("Unable to delete project", { code: error?.code });
    redirect("/dashboard?error=delete");
  }
  revalidatePath("/dashboard");
  redirect("/dashboard?notice=deleted");
}
