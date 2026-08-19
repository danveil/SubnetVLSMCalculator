import { parseCidr } from "./cidr";
import { ipToInteger } from "./ipv4";
import type { AddressAssignment, AssignmentIssue } from "./types";

export function validateAddressAssignments(
  assignments: readonly AddressAssignment[],
): readonly AssignmentIssue[] {
  const issues: AssignmentIssue[] = [];
  const usedAddresses = new Map<number, string>();
  for (const assignment of assignments) {
    const subnet = parseCidr(assignment.subnetCidr, true);
    let assignedAddress: number | undefined;
    if (assignment.assignedIp.trim()) {
      try {
        const address = ipToInteger(assignment.assignedIp);
        assignedAddress = address;
        if (
          address < subnet.networkInteger ||
          address > subnet.broadcastInteger
        ) {
          issues.push({
            assignmentId: assignment.id,
            field: "assignedIp",
            message: `${assignment.assignedIp} is outside ${assignment.subnetCidr}.`,
          });
        } else if (subnet.prefix <= 30 && address === subnet.networkInteger) {
          issues.push({
            assignmentId: assignment.id,
            field: "assignedIp",
            message: `${assignment.assignedIp} is the network address and cannot be assigned to a host.`,
          });
        } else if (subnet.prefix <= 30 && address === subnet.broadcastInteger) {
          issues.push({
            assignmentId: assignment.id,
            field: "assignedIp",
            message: `${assignment.assignedIp} is the broadcast address and cannot be assigned to a host.`,
          });
        }
        const previous = usedAddresses.get(address);
        if (previous) {
          issues.push({
            assignmentId: assignment.id,
            field: "assignedIp",
            message: `${assignment.assignedIp} is already assigned to ${previous}.`,
          });
        } else {
          usedAddresses.set(
            address,
            assignment.device || assignment.interfaceName || "another row",
          );
        }
      } catch (error) {
        issues.push({
          assignmentId: assignment.id,
          field: "assignedIp",
          message:
            error instanceof Error
              ? error.message
              : "Invalid assigned IP address.",
        });
      }
    }
    if (assignment.gateway.trim()) {
      try {
        const gateway = ipToInteger(assignment.gateway);
        if (
          gateway < subnet.networkInteger ||
          gateway > subnet.broadcastInteger
        ) {
          issues.push({
            assignmentId: assignment.id,
            field: "gateway",
            message: `${assignment.gateway} is outside ${assignment.subnetCidr}.`,
          });
        } else if (
          subnet.prefix <= 30 &&
          (gateway === subnet.networkInteger ||
            gateway === subnet.broadcastInteger)
        ) {
          issues.push({
            assignmentId: assignment.id,
            field: "gateway",
            message: `${assignment.gateway} is reserved and cannot be used as a gateway.`,
          });
        } else if (assignedAddress === gateway) {
          issues.push({
            assignmentId: assignment.id,
            field: "gateway",
            message: `${assignment.gateway} cannot be this device's own default gateway. Clear the gateway for a router interface or enter a different next-hop address.`,
          });
        }
      } catch (error) {
        issues.push({
          assignmentId: assignment.id,
          field: "gateway",
          message:
            error instanceof Error ? error.message : "Invalid gateway address.",
        });
      }
    }
  }
  return issues;
}
