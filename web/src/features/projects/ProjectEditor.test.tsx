import { StrictMode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { projectDraftStorageKey, storeProjectDraft } from "./draft";
import { ProjectEditor } from "./ProjectEditor";

vi.mock("@/app/dashboard/actions", () => ({
  saveProjectAction: vi.fn(async () => ({ error: "" })),
}));

describe("ProjectEditor calculator draft restore", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("consumes and restores a cross-tab draft under Strict Mode", async () => {
    storeProjectDraft(window.localStorage, {
      baseNetwork: "192.0.2.0/24",
      requirements: [
        { id: "restored-users", name: "Restored users", requiredHosts: 40 },
      ],
    });

    render(
      <StrictMode>
        <ProjectEditor
          initialBaseNetwork="10.0.0.0/8"
          initialDescription=""
          initialName="Untitled project"
          initialRequirements={[
            { id: "default-users", name: "Users", requiredHosts: 10 },
          ]}
          restoreCalculatorDraft
        />
      </StrictMode>,
    );

    await waitFor(() => {
      expect(
        (screen.getByLabelText("Parent network") as HTMLInputElement).value,
      ).toBe("192.0.2.0/24");
    });
    expect(screen.getByDisplayValue("Restored users")).toBeTruthy();
    expect(window.localStorage.getItem(projectDraftStorageKey)).toBeNull();
  });
});
