import type { UtilizationMetrics, VlsmAllocation } from "./types";

function percentage(numerator: number, denominator: number): number {
  return denominator === 0
    ? 0
    : Math.round((numerator / denominator) * 10_000) / 100;
}

export function calculateUtilization(
  parentTotalAddresses: number,
  allocations: readonly VlsmAllocation[],
): UtilizationMetrics {
  const allocatedAddresses = allocations.reduce(
    (sum, item) => sum + item.totalAddresses,
    0,
  );
  const requestedHosts = allocations.reduce(
    (sum, item) => sum + item.requiredHosts,
    0,
  );
  const usableAllocatedCapacity = allocations.reduce(
    (sum, item) => sum + item.capacity,
    0,
  );
  return {
    parentTotalAddresses,
    allocatedAddresses,
    unallocatedAddresses: parentTotalAddresses - allocatedAddresses,
    requestedHosts,
    usableAllocatedCapacity,
    wastedUsableCapacity: usableAllocatedCapacity - requestedHosts,
    addressSpaceUtilizationPercentage: percentage(
      allocatedAddresses,
      parentTotalAddresses,
    ),
    allocationEfficiencyPercentage: percentage(
      requestedHosts,
      usableAllocatedCapacity,
    ),
  };
}
