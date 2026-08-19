import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SubnetCalculator } from "./SubnetCalculator";

describe("SubnetCalculator", () => {
  it("calculates a /27 through the rendered form and reveals the working", () => {
    render(<SubnetCalculator />);

    const input = screen.getByLabelText("IPv4 address and prefix");
    fireEvent.change(input, { target: { value: "192.168.50.77/27" } });
    fireEvent.click(screen.getByRole("button", { name: "Calculate" }));

    expect(screen.getByText("192.168.50.64/27")).toBeTruthy();
    expect(screen.getByText("192.168.50.65")).toBeTruthy();
    expect(screen.getByText("192.168.50.94")).toBeTruthy();
    expect(screen.getByText("192.168.50.95")).toBeTruthy();

    fireEvent.click(screen.getByLabelText("Show educational working"));
    expect(screen.getByText("How the boundary is found")).toBeTruthy();
  });

  it("shows a clear error for malformed input", () => {
    render(<SubnetCalculator />);

    fireEvent.change(screen.getByLabelText("IPv4 address and prefix"), {
      target: { value: "192.168.1/24" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Calculate" }));

    expect(screen.getByRole("alert").textContent).toContain(
      "not a valid IPv4 address",
    );
  });
});
