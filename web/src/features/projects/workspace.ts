import {
  allocateVlsm,
  type VlsmPlan,
  type VlsmRequirement,
} from "@/lib/networking";

export const projectLimits = {
  nameLength: 80,
  descriptionLength: 500,
  requirements: 100,
} as const;

export interface ProjectWorkspaceInput {
  readonly name: string;
  readonly description: string;
  readonly baseNetwork: string;
  readonly requirements: readonly VlsmRequirement[];
  readonly plan: VlsmPlan;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseRequirements(
  value: FormDataEntryValue | null,
): VlsmRequirement[] {
  if (typeof value !== "string") {
    throw new Error("Project requirements are missing.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("Project requirements must be valid JSON.");
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Add at least one network requirement.");
  }
  if (parsed.length > projectLimits.requirements) {
    throw new Error(
      `A project can contain at most ${projectLimits.requirements} requirements.`,
    );
  }

  const requirements = parsed.map((candidate, index) => {
    if (!isRecord(candidate)) {
      throw new Error(`Requirement ${index + 1} is invalid.`);
    }

    const id = typeof candidate.id === "string" ? candidate.id.trim() : "";
    const name =
      typeof candidate.name === "string" ? candidate.name.trim() : "";
    const requiredHosts = candidate.requiredHosts;
    const pointToPoint = candidate.pointToPoint;

    if (!id || id.length > 100) {
      throw new Error(`Requirement ${index + 1} needs a valid identifier.`);
    }
    if (!name || name.length > projectLimits.nameLength) {
      throw new Error(
        `Requirement ${index + 1} needs a name of ${projectLimits.nameLength} characters or fewer.`,
      );
    }
    if (!Number.isSafeInteger(requiredHosts) || Number(requiredHosts) < 1) {
      throw new Error(
        `Requirement ${index + 1} needs a positive whole-number host count.`,
      );
    }
    if (pointToPoint !== undefined && typeof pointToPoint !== "boolean") {
      throw new Error(
        `Requirement ${index + 1} has an invalid point-to-point setting.`,
      );
    }

    return {
      id,
      name,
      requiredHosts: Number(requiredHosts),
      pointToPoint: pointToPoint ?? false,
    };
  });

  const names = new Set<string>();
  requirements.forEach((requirement, index) => {
    const normalizedName = requirement.name.toLowerCase();
    if (names.has(normalizedName)) {
      throw new Error(
        `Requirement ${index + 1} repeats an existing network name.`,
      );
    }
    names.add(normalizedName);
  });

  return requirements;
}

export function parseProjectWorkspace(
  formData: FormData,
): ProjectWorkspaceInput {
  const rawName = formData.get("name");
  const rawDescription = formData.get("description");
  const rawBaseNetwork = formData.get("baseNetwork");
  const name = typeof rawName === "string" ? rawName.trim() : "";
  const description =
    typeof rawDescription === "string" ? rawDescription.trim() : "";
  const baseNetwork =
    typeof rawBaseNetwork === "string" ? rawBaseNetwork.trim() : "";

  if (!name || name.length > projectLimits.nameLength) {
    throw new Error(
      `Project name must contain 1–${projectLimits.nameLength} characters.`,
    );
  }
  if (description.length > projectLimits.descriptionLength) {
    throw new Error(
      `Description must contain ${projectLimits.descriptionLength} characters or fewer.`,
    );
  }
  if (!baseNetwork) {
    throw new Error("Enter a parent network in CIDR notation.");
  }

  const requirements = parseRequirements(formData.get("requirements"));
  const plan = allocateVlsm(baseNetwork, requirements);

  return {
    name,
    description,
    baseNetwork: `${plan.parent.network}/${plan.parent.prefix}`,
    requirements,
    plan,
  };
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
