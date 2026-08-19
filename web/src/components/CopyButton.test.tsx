import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CopyButton } from "./CopyButton";

afterEach(() => {
  Reflect.deleteProperty(navigator, "clipboard");
  vi.restoreAllMocks();
});

describe("CopyButton", () => {
  it("confirms a successful clipboard write", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    render(<CopyButton value="192.168.1.0/24" />);

    fireEvent.click(screen.getByRole("button", { name: "Copy" }));

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith("192.168.1.0/24"),
    );
    expect(screen.getByRole("button", { name: "Copied" })).toBeTruthy();
  });

  it("reports a rejected clipboard write without an unhandled error", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    render(<CopyButton value="192.168.1.0/24" />);

    fireEvent.click(screen.getByRole("button", { name: "Copy" }));

    expect(
      await screen.findByRole("button", { name: "Copy failed" }),
    ).toBeTruthy();
  });

  it("does not carry copied status to a newly rendered value", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const { rerender } = render(<CopyButton value="192.168.1.0/24" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(await screen.findByRole("button", { name: "Copied" })).toBeTruthy();

    rerender(<CopyButton value="10.0.0.0/8" />);

    expect(screen.getByRole("button", { name: "Copy" })).toBeTruthy();
    expect(writeText).toHaveBeenCalledWith("192.168.1.0/24");
  });
});
