import { describe, expect, it } from "vitest";

import {
  allocateVlsm,
  checkMembership,
  detectOverlaps,
  validateAddressAssignments,
  vlsmPlanToCsv,
} from "../index";

describe("overlap detection", () => {
  it("finds the exact shared range", () => {
    const conflicts = detectOverlaps([
      "192.168.1.0/24",
      "192.168.1.128/25",
      "192.168.2.0/24",
    ]);
    expect(conflicts).toEqual([
      expect.objectContaining({
        firstNetwork: "192.168.1.0/24",
        secondNetwork: "192.168.1.128/25",
        overlapStart: "192.168.1.128",
        overlapEnd: "192.168.1.255",
      }),
    ]);
  });

  it("returns no conflict for adjacent networks", () => {
    expect(detectOverlaps(["10.0.0.0/25", "10.0.0.128/25"])).toEqual([]);
  });

  it("requires network addresses and at least two entries", () => {
    expect(() => detectOverlaps(["10.0.0.1/24", "10.0.1.0/24"])).toThrow(
      /host bits/,
    );
    expect(() => detectOverlaps(["10.0.0.0/24"])).toThrow(/at least two/);
  });
});

describe("membership checker", () => {
  it("explains a member address", () => {
    const result = checkMembership("192.168.1.50", "192.168.1.0/24");
    expect(result.belongs).toBe(true);
    expect(result.firstUsable).toBe("192.168.1.1");
    expect(result.lastUsable).toBe("192.168.1.254");
    expect(result.explanation).toMatch(/belongs/);
  });

  it("explains a non-member address", () => {
    expect(checkMembership("192.168.2.1", "192.168.1.0/24").belongs).toBe(
      false,
    );
  });
});

describe("addressing assignment validation", () => {
  it("detects reserved, outside, duplicate, and invalid assignments", () => {
    const issues = validateAddressAssignments([
      {
        id: "one",
        subnetCidr: "192.168.1.0/24",
        device: "R1",
        interfaceName: "G0/0",
        assignedIp: "192.168.1.0",
        gateway: "192.168.2.1",
      },
      {
        id: "two",
        subnetCidr: "192.168.1.0/24",
        device: "PC1",
        interfaceName: "NIC",
        assignedIp: "192.168.1.10",
        gateway: "192.168.1.1",
      },
      {
        id: "three",
        subnetCidr: "192.168.1.0/24",
        device: "PC2",
        interfaceName: "NIC",
        assignedIp: "192.168.1.10",
        gateway: "bad",
      },
    ]);
    expect(issues.map((issue) => issue.message).join(" ")).toMatch(
      /network address.*outside.*already assigned.*valid IPv4/s,
    );
  });

  it("accepts /31 endpoint addresses", () => {
    expect(
      validateAddressAssignments([
        {
          id: "wan",
          subnetCidr: "10.0.0.0/31",
          device: "R1",
          interfaceName: "G0/0",
          assignedIp: "10.0.0.0",
          gateway: "10.0.0.1",
        },
      ]),
    ).toEqual([]);
  });

  it("rejects a device's own address as its default gateway", () => {
    const issues = validateAddressAssignments([
      {
        id: "host",
        subnetCidr: "192.168.1.0/24",
        device: "PC1",
        interfaceName: "NIC",
        assignedIp: "192.168.1.10",
        gateway: "192.168.1.10",
      },
    ]);

    expect(issues).toEqual([
      expect.objectContaining({
        field: "gateway",
        message: expect.stringMatching(/own default gateway/),
      }),
    ]);
  });
});

describe("CSV export", () => {
  it("exports technical fields and safely quotes names", () => {
    const plan = allocateVlsm("192.168.1.0/24", [
      { id: "finance", name: 'Finance, "HQ"', requiredHosts: 20 },
    ]);
    const csv = vlsmPlanToCsv(plan);
    expect(csv).toContain("Network Name,Required Hosts,Capacity");
    expect(csv).toContain('"Finance, ""HQ""",20,30');
    expect(csv).toContain("192.168.1.0/27");
  });

  it.each(["=2+2", "+cmd", "-2+2", "@SUM(A1:A2)"])(
    "neutralizes spreadsheet formula name %s",
    (name) => {
      const plan = allocateVlsm("192.168.1.0/24", [
        { id: "formula", name, requiredHosts: 20 },
      ]);

      expect(vlsmPlanToCsv(plan)).toContain(`'${name},20,30`);
    },
  );
});
