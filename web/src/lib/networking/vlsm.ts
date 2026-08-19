import {
  addressBlockSize,
  parseCidr,
  prefixToSubnetMask,
  prefixToWildcardMask,
} from "./cidr";
import { integerToIp } from "./ipv4";
import type {
  AddressRange,
  VlsmAllocation,
  VlsmPlan,
  VlsmRequirement,
} from "./types";
import {
  assertHostRequirement,
  NetworkInputError,
  normalizedRequirementName,
} from "./validation";
import { calculateUtilization } from "./utilization";

interface PreparedRequirement extends VlsmRequirement {
  readonly name: string;
  readonly inputIndex: number;
  readonly prefix: number;
}

export function prefixForHostRequirement(
  requiredHosts: number,
  pointToPoint = false,
): number {
  assertHostRequirement(requiredHosts);
  if (pointToPoint && requiredHosts <= 2) return 31;
  const requiredAddresses = requiredHosts + 2;
  let blockSize = 1;
  let hostBits = 0;
  while (blockSize < requiredAddresses) {
    blockSize *= 2;
    hostBits += 1;
  }
  return 32 - hostBits;
}

function usableCapacity(prefix: number): number {
  if (prefix === 32) return 1;
  if (prefix === 31) return 2;
  return addressBlockSize(prefix) - 2;
}

function prepareRequirements(
  requirements: readonly VlsmRequirement[],
): PreparedRequirement[] {
  if (requirements.length === 0) {
    throw new NetworkInputError(
      "Add at least one network requirement.",
      "EMPTY_REQUIREMENTS",
    );
  }
  const names = new Set<string>();
  const ids = new Set<string>();
  return requirements.map((requirement, inputIndex) => {
    const id = requirement.id.trim();
    if (!id) {
      throw new NetworkInputError(
        "Every network requirement must have a non-empty identifier.",
        "EMPTY_REQUIREMENT_ID",
      );
    }
    if (ids.has(id)) {
      throw new NetworkInputError(
        `Requirement identifier “${id}” is duplicated.`,
        "DUPLICATE_REQUIREMENT_ID",
      );
    }
    ids.add(id);
    const name = normalizedRequirementName(requirement.name);
    const comparisonName = name.toLocaleLowerCase("en");
    if (names.has(comparisonName)) {
      throw new NetworkInputError(
        `Network name “${name}” is duplicated. Use a unique name for every requirement.`,
        "DUPLICATE_NETWORK_NAME",
      );
    }
    names.add(comparisonName);
    assertHostRequirement(requirement.requiredHosts, name);
    return {
      ...requirement,
      id,
      name,
      inputIndex,
      prefix: prefixForHostRequirement(
        requirement.requiredHosts,
        requirement.pointToPoint,
      ),
    };
  });
}

function allocationExplanation(
  requirement: PreparedRequirement,
  network: string,
  totalAddresses: number,
): readonly string[] {
  if (requirement.pointToPoint && requirement.prefix === 31) {
    return [
      `${requirement.requiredHosts} endpoints are explicitly marked point-to-point.`,
      "RFC 3021 permits both addresses in a /31 to be used as endpoints.",
      `The next valid /31 boundary is ${network}.`,
    ];
  }
  const needed = requirement.requiredHosts + 2;
  const exponent = Math.log2(totalAddresses);
  return [
    `${requirement.requiredHosts} hosts need ${needed} addresses after traditional network and broadcast reservations.`,
    `The next power of two is ${totalAddresses} = 2^${exponent}.`,
    `Prefix = 32 - ${exponent} = /${requirement.prefix}.`,
    `The next valid /${requirement.prefix} boundary is ${network}.`,
  ];
}

export function allocateVlsm(
  parentCidr: string,
  requirements: readonly VlsmRequirement[],
): VlsmPlan {
  const parent = parseCidr(parentCidr, true);
  const prepared = prepareRequirements(requirements).sort(
    (first, second) =>
      first.prefix - second.prefix || first.inputIndex - second.inputIndex,
  );
  const allocations: VlsmAllocation[] = [];
  const unallocatedRanges: AddressRange[] = [];
  let cursor = parent.networkInteger;

  for (const requirement of prepared) {
    const totalAddresses = addressBlockSize(requirement.prefix);
    const alignedStart = Math.ceil(cursor / totalAddresses) * totalAddresses;
    if (alignedStart > cursor) {
      unallocatedRanges.push({
        first: integerToIp(cursor),
        last: integerToIp(alignedStart - 1),
        totalAddresses: alignedStart - cursor,
      });
    }
    const allocationEnd = alignedStart + totalAddresses - 1;
    if (allocationEnd > parent.broadcastInteger) {
      throw new NetworkInputError(
        `The requested subnets require more address space than ${parent.network}/${parent.prefix} provides. ${requirement.name} needs a /${requirement.prefix} block of ${totalAddresses} addresses.`,
        "INSUFFICIENT_ADDRESS_SPACE",
      );
    }

    const capacity = usableCapacity(requirement.prefix);
    const network = integerToIp(alignedStart);
    const broadcast = integerToIp(allocationEnd);
    const firstUsable =
      requirement.prefix >= 31 ? network : integerToIp(alignedStart + 1);
    const lastUsable =
      requirement.prefix >= 31 ? broadcast : integerToIp(allocationEnd - 1);
    allocations.push({
      requirementId: requirement.id,
      name: requirement.name,
      requiredHosts: requirement.requiredHosts,
      capacity,
      wastedCapacity: capacity - requirement.requiredHosts,
      network,
      cidr: `${network}/${requirement.prefix}`,
      prefix: requirement.prefix,
      subnetMask: prefixToSubnetMask(requirement.prefix),
      wildcardMask: prefixToWildcardMask(requirement.prefix),
      firstUsable,
      lastUsable,
      broadcast,
      totalAddresses,
      utilizationPercentage:
        Math.round((requirement.requiredHosts / capacity) * 10_000) / 100,
      explanation: allocationExplanation(requirement, network, totalAddresses),
    });
    cursor = allocationEnd + 1;
  }

  if (cursor <= parent.broadcastInteger) {
    unallocatedRanges.push({
      first: integerToIp(cursor),
      last: parent.broadcast,
      totalAddresses: parent.broadcastInteger - cursor + 1,
    });
  }

  return {
    parent,
    allocations,
    unallocatedRanges,
    metrics: calculateUtilization(parent.totalAddresses, allocations),
  };
}
