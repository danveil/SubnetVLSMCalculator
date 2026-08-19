import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { VlsmPlanner } from "./VlsmPlanner";

describe("VlsmPlanner", () => {
  it("renders a complete anonymous example plan", () => {
    render(<VlsmPlanner />);

    expect(screen.getAllByText("10.10.0.0/23").length).toBeGreaterThanOrEqual(
      2,
    );
    expect(screen.getAllByText("10.10.2.0/25").length).toBeGreaterThanOrEqual(
      2,
    );
    expect(screen.getByRole("button", { name: "Export CSV" })).toBeTruthy();
    expect(screen.getByText("No validation issues")).toBeTruthy();
  });

  it("recalculates when the parent network changes", () => {
    render(<VlsmPlanner />);

    const parent = screen.getByLabelText("Parent network");
    fireEvent.change(parent, { target: { value: "172.16.0.0/16" } });

    expect(screen.getAllByText("172.16.0.0/23").length).toBeGreaterThanOrEqual(
      2,
    );
    expect(screen.queryAllByText("10.10.0.0/23")).toHaveLength(0);
  });

  it("preserves addressing edits when the plan gains a network", () => {
    render(<VlsmPlanner />);

    const device = screen.getByLabelText(
      "Device for 10.10.0.0/23",
    ) as HTMLInputElement;
    fireEvent.change(device, { target: { value: "R1" } });
    fireEvent.click(screen.getByRole("button", { name: "Add network" }));

    expect(
      (screen.getByLabelText("Device for 10.10.0.0/23") as HTMLInputElement)
        .value,
    ).toBe("R1");
  });

  it("preserves addressing edits through a temporary plan error", () => {
    render(<VlsmPlanner />);

    fireEvent.change(screen.getByLabelText("Device for 10.10.0.0/23"), {
      target: { value: "R1" },
    });
    const firstName = screen.getByLabelText("Network name row 1");
    fireEvent.change(firstName, { target: { value: "" } });
    expect(screen.getByRole("alert")).toBeTruthy();

    fireEvent.change(firstName, { target: { value: "Students" } });
    expect(
      (screen.getByLabelText("Device for 10.10.0.0/23") as HTMLInputElement)
        .value,
    ).toBe("R1");
  });
});
