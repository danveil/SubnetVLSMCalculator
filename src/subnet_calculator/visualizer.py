"""Plain-text visualizations independent from terminal output libraries."""

from subnet_calculator.models import IPv4Analysis, VLSMResult


def binary_boundary_map(result: IPv4Analysis) -> str:
    """Show network and host bits with a visible CIDR boundary."""
    bits = result.binary_ip.replace(".", "")
    prefix = result.prefix_length
    boundary = f"{bits[:prefix]}|{bits[prefix:]}"
    return (
        f"IP bits:      {boundary}\n"
        f"              {'N' * prefix}|{'H' * (32 - prefix)}\n"
        f"Network bits: {prefix}    Host bits: {32 - prefix}"
    )


def allocation_map(result: VLSMResult) -> str:
    """Render allocations and remaining ranges as an ASCII tree."""
    entries = [
        f"{item.cidr:<19} {item.segment:<20} {item.allocated_capacity} usable"
        for item in result.allocations
    ]
    remaining = ", ".join(result.remaining_ranges) or "none"
    lines = [result.parent_network]
    for index, entry in enumerate(entries):
        connector = "`--" if index == len(entries) - 1 and remaining == "none" else "+--"
        lines.append(f"{connector} {entry}")
    lines.append(f"`-- Remaining: {remaining}")
    return "\n".join(lines)
