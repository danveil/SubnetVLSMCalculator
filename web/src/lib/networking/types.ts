export interface ParsedCidr {
  readonly input: string;
  readonly ip: string;
  readonly ipInteger: number;
  readonly prefix: number;
  readonly network: string;
  readonly networkInteger: number;
  readonly broadcast: string;
  readonly broadcastInteger: number;
  readonly totalAddresses: number;
}

export interface SubnetAnalysis extends ParsedCidr {
  readonly cidr: string;
  readonly subnetMask: string;
  readonly wildcardMask: string;
  readonly firstUsable: string;
  readonly lastUsable: string;
  readonly usableHosts: number;
  readonly ipClass: string;
  readonly binaryIp: string;
  readonly binaryMask: string;
  readonly networkBits: number;
  readonly hostBits: number;
  readonly isNetworkAddress: boolean;
  readonly isBroadcastAddress: boolean;
  readonly specialUseExplanation?: string;
}

export interface VlsmRequirement {
  readonly id: string;
  readonly name: string;
  readonly requiredHosts: number;
  readonly pointToPoint?: boolean;
}

export interface VlsmAllocation {
  readonly requirementId: string;
  readonly name: string;
  readonly requiredHosts: number;
  readonly capacity: number;
  readonly wastedCapacity: number;
  readonly network: string;
  readonly cidr: string;
  readonly prefix: number;
  readonly subnetMask: string;
  readonly wildcardMask: string;
  readonly firstUsable: string;
  readonly lastUsable: string;
  readonly broadcast: string;
  readonly totalAddresses: number;
  readonly utilizationPercentage: number;
  readonly explanation: readonly string[];
}

export interface UtilizationMetrics {
  readonly parentTotalAddresses: number;
  readonly allocatedAddresses: number;
  readonly unallocatedAddresses: number;
  readonly requestedHosts: number;
  readonly usableAllocatedCapacity: number;
  readonly wastedUsableCapacity: number;
  readonly addressSpaceUtilizationPercentage: number;
  readonly allocationEfficiencyPercentage: number;
}

export interface AddressRange {
  readonly first: string;
  readonly last: string;
  readonly totalAddresses: number;
}

export interface VlsmPlan {
  readonly parent: ParsedCidr;
  readonly allocations: readonly VlsmAllocation[];
  readonly unallocatedRanges: readonly AddressRange[];
  readonly metrics: UtilizationMetrics;
}

export interface OverlapConflict {
  readonly firstNetwork: string;
  readonly secondNetwork: string;
  readonly overlapStart: string;
  readonly overlapEnd: string;
  readonly reason: string;
}

export interface MembershipResult {
  readonly belongs: boolean;
  readonly ip: string;
  readonly network: string;
  readonly broadcast: string;
  readonly firstUsable: string;
  readonly lastUsable: string;
  readonly explanation: string;
}

export interface AddressAssignment {
  readonly id: string;
  readonly subnetCidr: string;
  readonly device: string;
  readonly interfaceName: string;
  readonly assignedIp: string;
  readonly gateway: string;
}

export interface AssignmentIssue {
  readonly assignmentId: string;
  readonly field: "assignedIp" | "gateway";
  readonly message: string;
}
