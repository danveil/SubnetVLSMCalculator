import type { VlsmPlan } from "./types";

function csvCell(value: string | number): string {
  const raw = String(value);
  const text =
    typeof value === "string" && /^[=+\-@\t\r\n]/.test(raw) ? `'${raw}` : raw;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function vlsmPlanToCsv(plan: VlsmPlan): string {
  const headings = [
    "Network Name",
    "Required Hosts",
    "Capacity",
    "Wasted Capacity",
    "Network Address",
    "Prefix",
    "CIDR",
    "Subnet Mask",
    "Wildcard Mask",
    "First Host",
    "Last Host",
    "Broadcast",
    "Utilization %",
  ];
  const rows = plan.allocations.map((item) => [
    item.name,
    item.requiredHosts,
    item.capacity,
    item.wastedCapacity,
    item.network,
    item.prefix,
    item.cidr,
    item.subnetMask,
    item.wildcardMask,
    item.firstUsable,
    item.lastUsable,
    item.broadcast,
    item.utilizationPercentage,
  ]);
  return (
    [headings, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") +
    "\r\n"
  );
}
