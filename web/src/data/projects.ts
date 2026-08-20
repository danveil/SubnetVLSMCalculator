import "server-only";

import { allocateVlsm, type VlsmRequirement } from "@/lib/networking";
import type { Tables } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export interface ProjectSummary {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly baseNetwork: string;
  readonly updatedAt: string;
}

export interface StoredProject extends ProjectSummary {
  readonly requirements: readonly VlsmRequirement[];
}

type ProjectRow = Pick<
  Tables<"projects">,
  "id" | "name" | "description" | "base_network" | "updated_at"
>;

type RequirementRow = Pick<
  Tables<"requirements">,
  "id" | "name" | "required_hosts" | "point_to_point" | "position"
>;

function toSummary(row: ProjectRow): ProjectSummary {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    baseNetwork: row.base_network,
    updatedAt: row.updated_at,
  };
}

export async function listProjects(userId: string): Promise<ProjectSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, description, base_network, updated_at")
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Unable to list projects", { code: error.code });
    throw new Error("Unable to load saved projects.");
  }

  return data.map(toSummary);
}

export async function getProject(
  userId: string,
  projectId: string,
): Promise<StoredProject | null> {
  const supabase = await createClient();
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, name, description, base_network, updated_at")
    .eq("id", projectId)
    .eq("owner_id", userId)
    .maybeSingle();

  if (projectError) {
    console.error("Unable to load project", { code: projectError.code });
    throw new Error("Unable to load this project.");
  }
  if (!project) return null;

  const { data: requirements, error: requirementsError } = await supabase
    .from("requirements")
    .select("id, name, required_hosts, point_to_point, position")
    .eq("project_id", projectId)
    .order("position", { ascending: true });

  if (requirementsError) {
    console.error("Unable to load project requirements", {
      code: requirementsError.code,
    });
    throw new Error("Unable to load this project's requirements.");
  }

  const normalizedRequirements = requirements.map((row: RequirementRow) => ({
    id: row.id,
    name: row.name,
    requiredHosts: row.required_hosts,
    pointToPoint: row.point_to_point,
  }));

  // Stored inputs are never treated as proof that a previous calculation was
  // correct. Revalidate the complete plan whenever it crosses the data layer.
  allocateVlsm(project.base_network, normalizedRequirements);

  return {
    ...toSummary(project),
    requirements: normalizedRequirements,
  };
}
