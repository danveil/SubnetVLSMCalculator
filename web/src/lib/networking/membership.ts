import { parseCidr } from "./cidr";
import { ipToInteger } from "./ipv4";
import { calculateSubnet } from "./subnet";
import type { MembershipResult } from "./types";

export function checkMembership(
  ip: string,
  networkCidr: string,
): MembershipResult {
  const ipInteger = ipToInteger(ip);
  const network = parseCidr(networkCidr, true);
  const subnet = calculateSubnet(`${network.network}/${network.prefix}`);
  const belongs =
    ipInteger >= network.networkInteger &&
    ipInteger <= network.broadcastInteger;
  return {
    belongs,
    ip,
    network: subnet.cidr,
    broadcast: subnet.broadcast,
    firstUsable: subnet.firstUsable,
    lastUsable: subnet.lastUsable,
    explanation: belongs
      ? `${ip} falls between ${network.network} and ${network.broadcast}, so it belongs to ${subnet.cidr}.`
      : `${ip} falls outside ${network.network} through ${network.broadcast}, so it does not belong to ${subnet.cidr}.`,
  };
}
