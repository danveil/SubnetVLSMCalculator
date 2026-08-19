import { describe, expect, it } from "vitest";

import { allocateVlsm, prefixForHostRequirement } from "../index";

const requirements = [
  { id: "students", name: "Students", requiredHosts: 500 },
  { id: "staff", name: "Staff", requiredHosts: 120 },
  { id: "servers", name: "Servers", requiredHosts: 50 },
  { id: "cctv", name: "CCTV", requiredHosts: 30 },
  { id: "management", name: "Management", requiredHosts: 12 },
  { id: "wan-a", name: "WAN-A", requiredHosts: 2, pointToPoint: true },
  { id: "wan-b", name: "WAN-B", requiredHosts: 2, pointToPoint: true },
] as const;

describe("prefix selection", () => {
  it.each([
    [500, false, 23],
    [120, false, 25],
    [50, false, 26],
    [30, false, 27],
    [12, false, 28],
    [2, false, 30],
    [2, true, 31],
  ])("selects /%i for %i hosts", (hosts, pointToPoint, prefix) => {
    expect(prefixForHostRequirement(hosts, pointToPoint)).toBe(prefix);
  });

  it.each([0, -1, 1.5, Number.NaN])(
    "rejects invalid host count %s",
    (hosts) => {
      expect(() => prefixForHostRequirement(hosts)).toThrow(
        /positive whole number/,
      );
    },
  );

  it("accepts the full traditional host capacity of an IPv4 /0", () => {
    expect(prefixForHostRequirement(0xffff_fffe)).toBe(0);
  });
});

describe("VLSM allocation", () => {
  it("allocates a manually verifiable campus plan largest-first", () => {
    const plan = allocateVlsm("10.10.0.0/16", requirements);
    expect(plan.allocations.map((item) => item.cidr)).toEqual([
      "10.10.0.0/23",
      "10.10.2.0/25",
      "10.10.2.128/26",
      "10.10.2.192/27",
      "10.10.2.224/28",
      "10.10.2.240/31",
      "10.10.2.242/31",
    ]);
    expect(plan.allocations[0]).toMatchObject({
      name: "Students",
      capacity: 510,
      wastedCapacity: 10,
      firstUsable: "10.10.0.1",
      lastUsable: "10.10.1.254",
      broadcast: "10.10.1.255",
    });
  });

  it("preserves input order for requirements of equal size", () => {
    const plan = allocateVlsm("192.168.1.0/24", [
      { id: "a", name: "First", requiredHosts: 10 },
      { id: "b", name: "Second", requiredHosts: 10 },
    ]);
    expect(plan.allocations.map((item) => item.name)).toEqual([
      "First",
      "Second",
    ]);
  });

  it("sorts mixed two-host requirements by allocated block size", () => {
    const plan = allocateVlsm("10.0.0.0/29", [
      { id: "wan-a", name: "WAN-A", requiredHosts: 2, pointToPoint: true },
      { id: "lan", name: "LAN", requiredHosts: 2 },
      { id: "wan-b", name: "WAN-B", requiredHosts: 2, pointToPoint: true },
    ]);

    expect(plan.allocations.map((item) => item.cidr)).toEqual([
      "10.0.0.0/30",
      "10.0.0.4/31",
      "10.0.0.6/31",
    ]);
    expect(plan.metrics.unallocatedAddresses).toBe(0);
  });

  it("returns exact-fit and utilization metrics with explicit definitions", () => {
    const plan = allocateVlsm("192.168.1.0/24", [
      { id: "all", name: "Users", requiredHosts: 254 },
    ]);
    expect(plan.metrics).toEqual({
      parentTotalAddresses: 256,
      allocatedAddresses: 256,
      unallocatedAddresses: 0,
      requestedHosts: 254,
      usableAllocatedCapacity: 254,
      wastedUsableCapacity: 0,
      addressSpaceUtilizationPercentage: 100,
      allocationEfficiencyPercentage: 100,
    });
    expect(plan.unallocatedRanges).toEqual([]);
  });

  it("allocates the maximum valid host requirement as an exact /0", () => {
    const plan = allocateVlsm("0.0.0.0/0", [
      { id: "internet", name: "Full IPv4 space", requiredHosts: 0xffff_fffe },
    ]);

    expect(plan.allocations[0]?.cidr).toBe("0.0.0.0/0");
    expect(plan.metrics.addressSpaceUtilizationPercentage).toBe(100);
    expect(plan.metrics.allocationEfficiencyPercentage).toBe(100);
  });

  it("reports remaining space", () => {
    const plan = allocateVlsm("192.168.1.0/24", [
      { id: "users", name: "Users", requiredHosts: 60 },
    ]);
    expect(plan.unallocatedRanges).toEqual([
      { first: "192.168.1.64", last: "192.168.1.255", totalAddresses: 192 },
    ]);
  });

  it("rejects insufficient parent space", () => {
    expect(() =>
      allocateVlsm("10.0.0.0/25", [
        { id: "large", name: "Large", requiredHosts: 200 },
      ]),
    ).toThrow(/require more address space/);
  });

  it("rejects parents with host bits set", () => {
    expect(() =>
      allocateVlsm("10.0.0.1/24", [{ id: "a", name: "A", requiredHosts: 2 }]),
    ).toThrow(/host bits set/);
  });

  it("rejects empty and duplicate names", () => {
    expect(() => allocateVlsm("10.0.0.0/24", [])).toThrow(/at least one/);
    expect(() =>
      allocateVlsm("10.0.0.0/24", [
        { id: "a", name: "Users", requiredHosts: 2 },
        { id: "b", name: " users ", requiredHosts: 2 },
      ]),
    ).toThrow(/duplicated/);
  });

  it("rejects empty and duplicate requirement identifiers", () => {
    expect(() =>
      allocateVlsm("10.0.0.0/24", [
        { id: " ", name: "Users", requiredHosts: 2 },
      ]),
    ).toThrow(/non-empty identifier/);
    expect(() =>
      allocateVlsm("10.0.0.0/24", [
        { id: "same", name: "Users", requiredHosts: 2 },
        { id: "same", name: "Servers", requiredHosts: 2 },
      ]),
    ).toThrow(/identifier.*duplicated/);
  });

  it("explains the prefix calculation", () => {
    const allocation = allocateVlsm("10.0.0.0/16", [
      { id: "students", name: "Students", requiredHosts: 500 },
    ]).allocations[0]!;
    expect(allocation.explanation.join(" ")).toMatch(/502.*512 = 2\^9.*\/23/);
  });
});
