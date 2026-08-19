import { parseCidr } from "./cidr";
import { integerToIp } from "./ipv4";
import type { OverlapConflict } from "./types";
import { NetworkInputError } from "./validation";

export function detectOverlaps(
  networks: readonly string[],
): readonly OverlapConflict[] {
  const cleaned = networks.map((network) => network.trim()).filter(Boolean);
  if (cleaned.length < 2) {
    throw new NetworkInputError(
      "Enter at least two CIDR networks to check for overlaps.",
      "TOO_FEW_NETWORKS",
    );
  }
  const parsed = cleaned.map((network) => parseCidr(network, true));
  const conflicts: OverlapConflict[] = [];
  for (let firstIndex = 0; firstIndex < parsed.length; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < parsed.length;
      secondIndex += 1
    ) {
      const first = parsed[firstIndex]!;
      const second = parsed[secondIndex]!;
      const overlapStart = Math.max(
        first.networkInteger,
        second.networkInteger,
      );
      const overlapEnd = Math.min(
        first.broadcastInteger,
        second.broadcastInteger,
      );
      if (overlapStart <= overlapEnd) {
        conflicts.push({
          firstNetwork: `${first.network}/${first.prefix}`,
          secondNetwork: `${second.network}/${second.prefix}`,
          overlapStart: integerToIp(overlapStart),
          overlapEnd: integerToIp(overlapEnd),
          reason: `${first.network}/${first.prefix} and ${second.network}/${second.prefix} contain the same addresses from ${integerToIp(overlapStart)} through ${integerToIp(overlapEnd)}.`,
        });
      }
    }
  }
  return conflicts;
}
