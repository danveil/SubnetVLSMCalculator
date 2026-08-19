import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NetworkTools } from "./NetworkTools";

describe("NetworkTools", () => {
  it("reports the exact overlap in the example", () => {
    render(<NetworkTools />);

    expect(
      screen.getByText("Run the checker to analyze the current list."),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Check overlaps" }));

    expect(screen.getByText("192.168.1.0/24 ↔ 192.168.1.128/25")).toBeTruthy();
    expect(screen.getByText("192.168.1.128 — 192.168.1.255")).toBeTruthy();
  });

  it("checks membership through the rendered form", () => {
    render(<NetworkTools />);

    fireEvent.click(screen.getByRole("button", { name: "Check membership" }));

    expect(screen.getByText("Belongs to network")).toBeTruthy();
    expect(screen.getByText("192.168.1.1 — 192.168.1.254")).toBeTruthy();
  });

  it("clears stale overlap output when the network list changes", () => {
    render(<NetworkTools />);
    fireEvent.click(screen.getByRole("button", { name: "Check overlaps" }));
    fireEvent.change(
      screen.getByLabelText("One strict network CIDR per line"),
      { target: { value: "10.0.0.0/25\n10.0.0.128/25" } },
    );

    expect(screen.queryByText("192.168.1.0/24 ↔ 192.168.1.128/25")).toBeNull();
    expect(
      screen.getByText("Run the checker to analyze the current list."),
    ).toBeTruthy();
  });

  it("clears stale membership output when an input changes", () => {
    render(<NetworkTools />);
    fireEvent.click(screen.getByRole("button", { name: "Check membership" }));
    fireEvent.change(screen.getByLabelText("IPv4 address"), {
      target: { value: "192.168.2.1" },
    });

    expect(screen.queryByText("Belongs to network")).toBeNull();
  });

  it("renders every pair when the same CIDR is repeated", () => {
    render(<NetworkTools />);
    fireEvent.change(
      screen.getByLabelText("One strict network CIDR per line"),
      {
        target: {
          value: "10.0.0.0/24\n10.0.0.0/24\n10.0.0.0/24",
        },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Check overlaps" }));

    expect(screen.getAllByText("10.0.0.0/24 ↔ 10.0.0.0/24")).toHaveLength(3);
  });
});
