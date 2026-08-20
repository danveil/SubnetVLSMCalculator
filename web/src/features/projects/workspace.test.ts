import { describe, expect, it } from "vitest";

import { isUuid, parseProjectWorkspace } from "./workspace";

function validForm(): FormData {
  const form = new FormData();
  form.set("name", " Campus plan ");
  form.set("description", " Main building ");
  form.set("baseNetwork", "10.0.0.0/24");
  form.set(
    "requirements",
    JSON.stringify([
      { id: "users", name: "Users", requiredHosts: 100 },
      { id: "wan", name: "WAN", requiredHosts: 2, pointToPoint: true },
    ]),
  );
  return form;
}

describe("parseProjectWorkspace", () => {
  it("normalizes and recalculates a valid workspace", () => {
    const result = parseProjectWorkspace(validForm());

    expect(result.name).toBe("Campus plan");
    expect(result.description).toBe("Main building");
    expect(result.baseNetwork).toBe("10.0.0.0/24");
    expect(result.plan.allocations.map((item) => item.cidr)).toEqual([
      "10.0.0.0/25",
      "10.0.0.128/31",
    ]);
  });

  it("rejects malformed requirement JSON", () => {
    const form = validForm();
    form.set("requirements", "not-json");

    expect(() => parseProjectWorkspace(form)).toThrow("valid JSON");
  });

  it("rejects non-integer host requirements", () => {
    const form = validForm();
    form.set(
      "requirements",
      JSON.stringify([{ id: "users", name: "Users", requiredHosts: 1.5 }]),
    );

    expect(() => parseProjectWorkspace(form)).toThrow("whole-number");
  });

  it("rejects plans that do not fit the parent network", () => {
    const form = validForm();
    form.set("baseNetwork", "192.0.2.0/30");

    expect(() => parseProjectWorkspace(form)).toThrow(
      "require more address space",
    );
  });

  it("rejects duplicate network names before the database constraint", () => {
    const form = validForm();
    form.set(
      "requirements",
      JSON.stringify([
        { id: "users-a", name: "Users", requiredHosts: 20 },
        { id: "users-b", name: " users ", requiredHosts: 10 },
      ]),
    );

    expect(() => parseProjectWorkspace(form)).toThrow(
      "repeats an existing network name",
    );
  });
});

describe("isUuid", () => {
  it("accepts UUIDs and rejects arbitrary identifiers", () => {
    expect(isUuid("9a34ba18-35f3-4ebf-8ee7-9622b133dd09")).toBe(true);
    expect(isUuid("../../another-user")).toBe(false);
  });
});
