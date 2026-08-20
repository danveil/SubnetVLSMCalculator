import { describe, expect, it } from "vitest";

import {
  consumeProjectDraft,
  parseProjectDraft,
  projectDraftStorageKey,
  projectDraftTtlMs,
  serializeProjectDraft,
  storeProjectDraft,
  type ProjectDraftStorage,
} from "./draft";

const savedAt = Date.UTC(2026, 7, 19, 12);
const exampleDraft = {
  baseNetwork: "10.20.0.0/24",
  requirements: [
    { id: "users", name: "Users", requiredHosts: 40 },
    { id: "wan", name: "WAN", requiredHosts: 2, pointToPoint: true },
  ],
} as const;

function memoryStorage(): ProjectDraftStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

describe("project draft handoff", () => {
  it("round-trips a validated local calculator plan", () => {
    const serialized = serializeProjectDraft(exampleDraft, savedAt);

    expect(parseProjectDraft(serialized, savedAt)).toMatchObject({
      baseNetwork: "10.20.0.0/24",
      requirements: [
        { name: "Users", requiredHosts: 40 },
        { name: "WAN", requiredHosts: 2, pointToPoint: true },
      ],
    });
  });

  it("rejects malformed or impossible drafts", () => {
    expect(() => parseProjectDraft("not-json", savedAt)).toThrow("invalid");
    expect(() =>
      parseProjectDraft(
        JSON.stringify({
          version: 1,
          savedAt,
          draft: {
            baseNetwork: "192.0.2.0/30",
            requirements: [{ id: "users", name: "Users", requiredHosts: 40 }],
          },
        }),
        savedAt,
      ),
    ).toThrow("require more address space");
  });

  it("expires a cross-tab draft after a short retention window", () => {
    const serialized = serializeProjectDraft(exampleDraft, savedAt);

    expect(() =>
      parseProjectDraft(serialized, savedAt + projectDraftTtlMs + 1),
    ).toThrow("expired");
  });

  it("consumes a stored draft exactly once", () => {
    const storage = memoryStorage();
    storeProjectDraft(storage, exampleDraft, savedAt);

    expect(storage.getItem(projectDraftStorageKey)).not.toBeNull();
    expect(consumeProjectDraft(storage, savedAt)).toMatchObject({
      baseNetwork: "10.20.0.0/24",
    });
    expect(storage.getItem(projectDraftStorageKey)).toBeNull();
    expect(consumeProjectDraft(storage, savedAt)).toBeNull();
  });

  it("deletes malformed storage before reporting the validation error", () => {
    const storage = memoryStorage();
    storage.setItem(projectDraftStorageKey, "not-json");

    expect(() => consumeProjectDraft(storage, savedAt)).toThrow("invalid");
    expect(storage.getItem(projectDraftStorageKey)).toBeNull();
  });
});
