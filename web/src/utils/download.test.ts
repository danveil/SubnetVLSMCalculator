import { afterEach, describe, expect, it, vi } from "vitest";

import { downloadTextFile } from "./download";

describe("downloadTextFile", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("delivers a named Blob before revoking its object URL", () => {
    vi.useFakeTimers();
    const createObjectURL = vi.fn(() => "blob:subnetforge-csv");
    const revokeObjectURL = vi.fn();
    Object.defineProperties(URL, {
      createObjectURL: { configurable: true, value: createObjectURL },
      revokeObjectURL: { configurable: true, value: revokeObjectURL },
    });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    downloadTextFile(
      "network,cidr\nStudents,10.0.0.0/24",
      "plan.csv",
      "text/csv",
    );

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).not.toHaveBeenCalled();

    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:subnetforge-csv");
  });
});
