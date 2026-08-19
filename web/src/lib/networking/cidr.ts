import { integerToIp, ipToInteger, MAX_IPV4_INTEGER } from "./ipv4";
import type { ParsedCidr } from "./types";
import { assertPrefix, NetworkInputError } from "./validation";

export function prefixToMaskInteger(prefix: number): number {
  assertPrefix(prefix);
  return prefix === 0 ? 0 : MAX_IPV4_INTEGER - (2 ** (32 - prefix) - 1);
}

export function prefixToSubnetMask(prefix: number): string {
  return integerToIp(prefixToMaskInteger(prefix));
}

export function prefixToWildcardMask(prefix: number): string {
  return integerToIp(MAX_IPV4_INTEGER - prefixToMaskInteger(prefix));
}

export function subnetMaskToPrefix(mask: string): number {
  const maskInteger = ipToInteger(mask);
  const bits = maskInteger.toString(2).padStart(32, "0");
  if (!/^1*0*$/.test(bits)) {
    throw new NetworkInputError(
      `${mask} is not a valid subnet mask because its one-bits are not contiguous.`,
      "NON_CONTIGUOUS_MASK",
    );
  }
  return bits.indexOf("0") === -1 ? 32 : bits.indexOf("0");
}

export function addressBlockSize(prefix: number): number {
  assertPrefix(prefix);
  return 2 ** (32 - prefix);
}

export function parseCidr(value: string, strictNetwork = false): ParsedCidr {
  const input = value.trim();
  const match = /^([^/]+)\/(\d+)$/.exec(input);
  if (!match) {
    throw new NetworkInputError(
      `${value || "The empty value"} is not valid CIDR notation. Use an address such as 192.168.1.0/24.`,
      "INVALID_CIDR",
    );
  }
  const ip = match[1]!;
  const prefixText = match[2]!;
  if (prefixText.length > 1 && prefixText.startsWith("0")) {
    throw new NetworkInputError(
      `${value} uses an ambiguous leading-zero prefix. Write /${Number(prefixText)} instead.`,
      "INVALID_CIDR",
    );
  }
  const prefix = Number(prefixText);
  assertPrefix(prefix);
  const ipInteger = ipToInteger(ip);
  const totalAddresses = addressBlockSize(prefix);
  const networkInteger =
    Math.floor(ipInteger / totalAddresses) * totalAddresses;
  const broadcastInteger = networkInteger + totalAddresses - 1;
  const network = integerToIp(networkInteger);
  if (strictNetwork && ipInteger !== networkInteger) {
    throw new NetworkInputError(
      `${value} has host bits set. Use the network address ${network}/${prefix}.`,
      "HOST_BITS_SET",
    );
  }
  return {
    input,
    ip: integerToIp(ipInteger),
    ipInteger,
    prefix,
    network,
    networkInteger,
    broadcast: integerToIp(broadcastInteger),
    broadcastInteger,
    totalAddresses,
  };
}
