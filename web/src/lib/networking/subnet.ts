import { binaryIPv4, educationalIpClass, integerToIp } from "./ipv4";
import { parseCidr, prefixToSubnetMask, prefixToWildcardMask } from "./cidr";
import type { SubnetAnalysis } from "./types";

export function calculateSubnet(cidr: string): SubnetAnalysis {
  const parsed = parseCidr(cidr);
  const { prefix, networkInteger, broadcastInteger } = parsed;
  let usableHosts: number;
  let firstUsable: string;
  let lastUsable: string;
  let specialUseExplanation: string | undefined;

  if (prefix === 32) {
    usableHosts = 1;
    firstUsable = parsed.network;
    lastUsable = parsed.network;
    specialUseExplanation =
      "A /32 is a single-host route. It identifies one address and has no ordinary multi-host range.";
  } else if (prefix === 31) {
    usableHosts = 2;
    firstUsable = parsed.network;
    lastUsable = parsed.broadcast;
    specialUseExplanation =
      "A /31 uses both addresses on a point-to-point link under RFC 3021; neither endpoint is reserved as a network or broadcast host.";
  } else {
    usableHosts = parsed.totalAddresses - 2;
    firstUsable = integerToIp(networkInteger + 1);
    lastUsable = integerToIp(broadcastInteger - 1);
  }

  const subnetMask = prefixToSubnetMask(prefix);
  return {
    ...parsed,
    cidr: `${parsed.network}/${prefix}`,
    subnetMask,
    wildcardMask: prefixToWildcardMask(prefix),
    firstUsable,
    lastUsable,
    usableHosts,
    ipClass: educationalIpClass(parsed.ip),
    binaryIp: binaryIPv4(parsed.ip),
    binaryMask: binaryIPv4(subnetMask),
    networkBits: prefix,
    hostBits: 32 - prefix,
    isNetworkAddress: parsed.ipInteger === networkInteger,
    isBroadcastAddress: parsed.ipInteger === broadcastInteger,
    ...(specialUseExplanation ? { specialUseExplanation } : {}),
  };
}
