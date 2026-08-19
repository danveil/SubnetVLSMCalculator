import type { VlsmPlan } from "@/lib/networking";

export function AllocationMap({ plan }: { plan: VlsmPlan }) {
  return (
    <div
      className="visualization"
      aria-label={`Address-space allocation for ${plan.parent.network}/${plan.parent.prefix}`}
    >
      <div className="visualization-heading">
        <div>
          <span>Parent address space</span>
          <strong>
            {plan.parent.network}/{plan.parent.prefix}
          </strong>
        </div>
        <span>{plan.parent.totalAddresses.toLocaleString()} addresses</span>
      </div>
      <div className="allocation-strip">
        {plan.allocations.map((allocation, index) => (
          <div
            className={`allocation-block allocation-color-${index % 5}`}
            style={{ flexGrow: allocation.totalAddresses }}
            key={allocation.requirementId}
            title={`${allocation.name}: ${allocation.cidr}, ${allocation.totalAddresses} addresses`}
          >
            <strong>{allocation.name}</strong>
            <code>{allocation.cidr}</code>
            <span>{allocation.requiredHosts} requested</span>
          </div>
        ))}
        {plan.metrics.unallocatedAddresses > 0 ? (
          <div
            className="allocation-block allocation-free"
            style={{ flexGrow: plan.metrics.unallocatedAddresses }}
            title={`${plan.metrics.unallocatedAddresses} unallocated addresses`}
          >
            <strong>Unallocated</strong>
            <span>
              {plan.metrics.unallocatedAddresses.toLocaleString()} addresses
            </span>
          </div>
        ) : null}
      </div>
      <p className="table-note">
        Block widths are proportional where space allows; labels always come
        from the calculated plan.
      </p>
    </div>
  );
}
