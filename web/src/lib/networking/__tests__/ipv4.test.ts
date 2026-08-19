import { describe, expect, it } from "vitest";

import {
  addressBlockSize,
  binaryIPv4,
  calculateSubnet,
  integerToIp,
  ipToInteger,
  parseCidr,
  parseIPv4,
  prefixToSubnetMask,
  prefixToWildcardMask,
  subnetMaskToPrefix,
} from "../index";

describe("IPv4 conversion", () => {
  it.each([
    ["0.0.0.0", 0],
    ["0.0.0.1", 1],
    ["127.255.255.255", 2_147_483_647],
    ["128.0.0.0", 2_147_483_648],
    ["192.168.1.10", 3_232_235_786],
    ["255.255.255.255", 4_294_967_295],
  ])("round trips %s", (ip, integer) => {
    expect(ipToInteger(ip)).toBe(integer);
    expect(integerToIp(integer)).toBe(ip);
  });

  it.each([
    "",
    "192.168.1",
    "192.168.1.1.1",
    "192.168.1.300",
    "192.168.01.1",
    "a.b.c.d",
  ])("rejects malformed address %s", (value) =>
    expect(() => parseIPv4(value)).toThrow(/valid IPv4/),
  );

  it("rejects integers outside the unsigned IPv4 range", () => {
    expect(() => integerToIp(-1)).toThrow(/unsigned 32-bit/);
    expect(() => integerToIp(2 ** 32)).toThrow(/unsigned 32-bit/);
  });

  it("renders binary octets", () => {
    expect(binaryIPv4("192.168.1.10")).toBe(
      "11000000.10101000.00000001.00001010",
    );
  });
});

describe("CIDR utilities", () => {
  it.each([
    [0, "0.0.0.0", "255.255.255.255", 2 ** 32],
    [8, "255.0.0.0", "0.255.255.255", 2 ** 24],
    [16, "255.255.0.0", "0.0.255.255", 65_536],
    [24, "255.255.255.0", "0.0.0.255", 256],
    [25, "255.255.255.128", "0.0.0.127", 128],
    [30, "255.255.255.252", "0.0.0.3", 4],
    [31, "255.255.255.254", "0.0.0.1", 2],
    [32, "255.255.255.255", "0.0.0.0", 1],
  ])("converts /%i", (prefix, mask, wildcard, block) => {
    expect(prefixToSubnetMask(prefix)).toBe(mask);
    expect(prefixToWildcardMask(prefix)).toBe(wildcard);
    expect(subnetMaskToPrefix(mask)).toBe(prefix);
    expect(addressBlockSize(prefix)).toBe(block);
  });

  it("rejects non-contiguous masks", () => {
    expect(() => subnetMaskToPrefix("255.0.255.0")).toThrow(/not contiguous/);
  });

  it("normalizes an interface CIDR but can enforce strict network input", () => {
    expect(parseCidr("192.168.1.130/25").network).toBe("192.168.1.128");
    expect(() => parseCidr("192.168.1.130/25", true)).toThrow(/host bits set/);
  });

  it.each([
    "192.168.1.1",
    "192.168.1.1/",
    "192.168.1.1/33",
    "192.168.1.1/24/1",
    "192.168.1.1/024",
  ])("rejects malformed CIDR %s", (value) =>
    expect(() => parseCidr(value)).toThrow(),
  );
});

describe("subnet analysis", () => {
  it("calculates a normal /24", () => {
    const result = calculateSubnet("192.168.1.10/24");
    expect(result).toMatchObject({
      cidr: "192.168.1.0/24",
      network: "192.168.1.0",
      broadcast: "192.168.1.255",
      firstUsable: "192.168.1.1",
      lastUsable: "192.168.1.254",
      usableHosts: 254,
      ipClass: "C",
    });
  });

  it("calculates the full /0 boundary without signed overflow", () => {
    const result = calculateSubnet("203.0.113.1/0");
    expect(result.network).toBe("0.0.0.0");
    expect(result.broadcast).toBe("255.255.255.255");
    expect(result.usableHosts).toBe(4_294_967_294);
  });

  it("uses both /31 point-to-point addresses", () => {
    const result = calculateSubnet("10.0.0.0/31");
    expect(result.usableHosts).toBe(2);
    expect(result.firstUsable).toBe("10.0.0.0");
    expect(result.lastUsable).toBe("10.0.0.1");
    expect(result.specialUseExplanation).toMatch(/RFC 3021/);
  });

  it("treats /32 as one host route", () => {
    const result = calculateSubnet("10.0.0.9/32");
    expect(result.usableHosts).toBe(1);
    expect(result.firstUsable).toBe("10.0.0.9");
    expect(result.lastUsable).toBe("10.0.0.9");
  });
});
