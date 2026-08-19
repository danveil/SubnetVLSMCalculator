import { assertUnsignedIPv4Integer, NetworkInputError } from "./validation";

export const MAX_IPV4_INTEGER = 0xffff_ffff;

export function parseIPv4(
  value: string,
): readonly [number, number, number, number] {
  const input = value.trim();
  const parts = input.split(".");
  if (parts.length !== 4) {
    throw new NetworkInputError(
      `${value || "The empty value"} is not a valid IPv4 address. Enter four octets.`,
      "INVALID_IPV4",
    );
  }

  const octets = parts.map((part) => {
    if (!/^\d{1,3}$/.test(part) || (part.length > 1 && part.startsWith("0"))) {
      throw new NetworkInputError(
        `${value} is not a valid IPv4 address. Use decimal octets without leading zeros.`,
        "INVALID_IPV4",
      );
    }
    const octet = Number(part);
    if (octet > 255) {
      throw new NetworkInputError(
        `${value} is not a valid IPv4 address. Each octet must be between 0 and 255.`,
        "INVALID_IPV4",
      );
    }
    return octet;
  });

  return [octets[0]!, octets[1]!, octets[2]!, octets[3]!];
}

export function ipToInteger(value: string): number {
  const [a, b, c, d] = parseIPv4(value);
  return ((a * 256 + b) * 256 + c) * 256 + d;
}

export function integerToIp(value: number): string {
  assertUnsignedIPv4Integer(value);
  const a = Math.floor(value / 256 ** 3);
  const remainderA = value - a * 256 ** 3;
  const b = Math.floor(remainderA / 256 ** 2);
  const remainderB = remainderA - b * 256 ** 2;
  const c = Math.floor(remainderB / 256);
  const d = remainderB - c * 256;
  return `${a}.${b}.${c}.${d}`;
}

export function binaryIPv4(value: string): string {
  return parseIPv4(value)
    .map((octet) => octet.toString(2).padStart(8, "0"))
    .join(".");
}

export function educationalIpClass(value: string): string {
  const [first] = parseIPv4(value);
  if (first <= 127) return "A";
  if (first <= 191) return "B";
  if (first <= 223) return "C";
  if (first <= 239) return "D (multicast)";
  return "E (reserved/experimental)";
}
