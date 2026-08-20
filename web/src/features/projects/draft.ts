import type { VlsmRequirement } from "@/lib/networking";

import { parseProjectWorkspace } from "./workspace";

export const projectDraftStorageKey = "subnetforge.project-draft.v2";
export const projectDraftTtlMs = 30 * 60 * 1_000;

const projectDraftVersion = 1;
const allowedFutureClockSkewMs = 60 * 1_000;

export interface ProjectDraftStorage {
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

export interface ProjectDraft {
  readonly baseNetwork: string;
  readonly requirements: readonly VlsmRequirement[];
}

function validatedProjectDraft(draft: ProjectDraft): ProjectDraft {
  const form = new FormData();
  form.set("name", "Imported calculator plan");
  form.set("description", "");
  form.set("baseNetwork", draft.baseNetwork);
  form.set("requirements", JSON.stringify(draft.requirements));
  const parsed = parseProjectWorkspace(form);

  return {
    baseNetwork: parsed.baseNetwork,
    requirements: parsed.requirements,
  };
}

export function serializeProjectDraft(
  draft: ProjectDraft,
  savedAt = Date.now(),
): string {
  if (!Number.isSafeInteger(savedAt) || savedAt < 0) {
    throw new Error("The saved calculator draft has an invalid timestamp.");
  }

  return JSON.stringify({
    version: projectDraftVersion,
    savedAt,
    draft: validatedProjectDraft(draft),
  });
}

export function parseProjectDraft(
  value: string,
  now = Date.now(),
): ProjectDraft {
  let candidate: unknown;
  try {
    candidate = JSON.parse(value);
  } catch {
    throw new Error("The saved calculator draft is invalid.");
  }
  if (typeof candidate !== "object" || candidate === null) {
    throw new Error("The saved calculator draft is invalid.");
  }

  const envelope = candidate as Record<string, unknown>;
  if (
    envelope.version !== projectDraftVersion ||
    typeof envelope.savedAt !== "number" ||
    !Number.isSafeInteger(envelope.savedAt) ||
    !Number.isSafeInteger(now) ||
    now < 0
  ) {
    throw new Error("The saved calculator draft is invalid.");
  }
  if (
    envelope.savedAt > now + allowedFutureClockSkewMs ||
    now - envelope.savedAt > projectDraftTtlMs
  ) {
    throw new Error("The saved calculator draft has expired.");
  }
  if (typeof envelope.draft !== "object" || envelope.draft === null) {
    throw new Error("The saved calculator draft is invalid.");
  }

  const draft = envelope.draft as Record<string, unknown>;

  return validatedProjectDraft({
    baseNetwork: typeof draft.baseNetwork === "string" ? draft.baseNetwork : "",
    requirements: Array.isArray(draft.requirements)
      ? (draft.requirements as VlsmRequirement[])
      : [],
  });
}

export function storeProjectDraft(
  storage: ProjectDraftStorage,
  draft: ProjectDraft,
  savedAt = Date.now(),
): void {
  storage.setItem(
    projectDraftStorageKey,
    serializeProjectDraft(draft, savedAt),
  );
}

export function consumeProjectDraft(
  storage: ProjectDraftStorage,
  now = Date.now(),
): ProjectDraft | null {
  const value = storage.getItem(projectDraftStorageKey);
  if (value === null) return null;

  // Consume before parsing so malformed or expired drafts cannot get stuck in
  // a restore loop. The caller may catch a validation error and use defaults.
  storage.removeItem(projectDraftStorageKey);
  return parseProjectDraft(value, now);
}
