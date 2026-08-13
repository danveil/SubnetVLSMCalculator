"""Variable Length Subnet Mask allocation engine."""

from __future__ import annotations

from ipaddress import IPv4Address, IPv4Network, summarize_address_range
from math import ceil, log2

from subnet_calculator.models import (
    SegmentRequest,
    VLSMAllocation,
    VLSMInput,
    VLSMResult,
    VLSMStatistics,
)
from subnet_calculator.validators import validate_parent_network, validate_segments


class VLSMAllocationError(ValueError):
    """Raised when valid segment requirements cannot be allocated."""


def _prefix_for(segment: SegmentRequest, allow_point_to_point_31: bool) -> int:
    if allow_point_to_point_31 and segment.point_to_point and segment.required_hosts <= 2:
        return 31
    required_addresses = segment.required_hosts + 2
    if required_addresses > 2**32:
        raise VLSMAllocationError(
            f"segment '{segment.name}' requests too many hosts for IPv4: {segment.required_hosts}"
        )
    block_bits = ceil(log2(required_addresses))
    return 32 - block_bits


def _align_up(address: int, block_size: int) -> int:
    return ((address + block_size - 1) // block_size) * block_size


def _capacity(network: IPv4Network) -> int:
    if network.prefixlen == 31:
        return 2
    if network.prefixlen == 32:
        return 1
    return network.num_addresses - 2


def _make_allocation(segment: SegmentRequest, network: IPv4Network) -> VLSMAllocation:
    capacity = _capacity(network)
    if network.prefixlen >= 31:
        first = network.network_address
        last = network.broadcast_address
    else:
        first = network.network_address + 1
        last = network.broadcast_address - 1
    return VLSMAllocation(
        segment=segment.name,
        description=segment.description,
        vlan_id=segment.vlan_id,
        security_zone=segment.security_zone,
        required_hosts=segment.required_hosts,
        allocated_capacity=capacity,
        cidr=str(network),
        subnet_mask=str(network.netmask),
        network_address=str(network.network_address),
        first_usable=str(first),
        last_usable=str(last),
        broadcast_address=str(network.broadcast_address),
        wildcard_mask=str(network.hostmask),
        wasted_addresses=capacity - segment.required_hosts,
    )


def _remaining_space(
    parent: IPv4Network, allocations: list[VLSMAllocation]
) -> tuple[tuple[str, ...], tuple[str, ...]]:
    intervals: list[tuple[IPv4Address, IPv4Address]] = []
    cursor = int(parent.network_address)
    for allocation in sorted(
        allocations, key=lambda item: int(IPv4Network(item.cidr).network_address)
    ):
        network = IPv4Network(allocation.cidr)
        start = int(network.network_address)
        if cursor < start:
            intervals.append((IPv4Address(cursor), IPv4Address(start - 1)))
        cursor = int(network.broadcast_address) + 1
    parent_end = int(parent.broadcast_address)
    if cursor <= parent_end:
        intervals.append((IPv4Address(cursor), IPv4Address(parent_end)))

    cidrs = tuple(
        str(network)
        for first, last in intervals
        for network in summarize_address_range(first, last)
    )
    ranges = tuple(str(first) if first == last else f"{first}-{last}" for first, last in intervals)
    return cidrs, ranges


def _assert_safe_allocations(parent: IPv4Network, allocations: list[VLSMAllocation]) -> None:
    networks = [IPv4Network(allocation.cidr) for allocation in allocations]
    for network in networks:
        if not network.subnet_of(parent):
            raise VLSMAllocationError(f"internal allocation escaped parent network: {network}")
    for index, network in enumerate(networks):
        for other in networks[index + 1 :]:
            if network.overlaps(other):
                raise VLSMAllocationError(f"internal allocation overlap: {network} and {other}")


def allocate_vlsm(configuration: VLSMInput) -> VLSMResult:
    """Allocate IPv4 subnets largest-first within a strict parent network."""
    parent = validate_parent_network(configuration.parent_network)
    validate_segments(configuration.segments)
    ranked = sorted(
        enumerate(configuration.segments),
        key=lambda item: (-item[1].required_hosts, item[0]),
    )

    cursor = int(parent.network_address)
    parent_end = int(parent.broadcast_address)
    allocations: list[VLSMAllocation] = []
    for _, segment in ranked:
        prefix = _prefix_for(segment, configuration.allow_point_to_point_31)
        block_size = 1 << (32 - prefix)
        aligned_start = _align_up(cursor, block_size)
        allocation_end = aligned_start + block_size - 1
        if aligned_start < int(parent.network_address) or allocation_end > parent_end:
            available = max(0, parent_end - cursor + 1)
            raise VLSMAllocationError(
                f"parent network {parent} is too small for segment '{segment.name}' "
                f"({segment.required_hosts} hosts need a /{prefix}, {block_size} addresses; "
                f"only {available} addresses remain)"
            )
        network = IPv4Network((aligned_start, prefix))
        allocations.append(_make_allocation(segment, network))
        cursor = allocation_end + 1

    _assert_safe_allocations(parent, allocations)
    remaining_networks, remaining_ranges = _remaining_space(parent, allocations)
    total_allocated = sum(IPv4Network(item.cidr).num_addresses for item in allocations)
    total_requested = sum(item.required_hosts for item in allocations)
    total_capacity = sum(item.allocated_capacity for item in allocations)
    statistics = VLSMStatistics(
        total_parent_addresses=parent.num_addresses,
        total_allocated_addresses=total_allocated,
        total_requested_hosts=total_requested,
        total_reserved_addresses=total_allocated - total_capacity,
        total_unused_addresses=parent.num_addresses - total_allocated,
        utilization_percent=round((total_allocated / parent.num_addresses) * 100, 2),
    )
    warnings = (
        "Subnetting provides logical address separation; VLANs, routers, ACLs, and firewalls "
        "must enforce traffic restrictions.",
    )
    return VLSMResult(
        parent_network=str(parent),
        input_configuration=configuration,
        allocations=tuple(allocations),
        remaining_networks=remaining_networks,
        remaining_ranges=remaining_ranges,
        statistics=statistics,
        warnings=warnings,
    )


def allocations_are_safe(result: VLSMResult) -> bool:
    """Return whether every allocation is contained and pairwise non-overlapping."""
    try:
        _assert_safe_allocations(IPv4Network(result.parent_network), list(result.allocations))
    except VLSMAllocationError:
        return False
    return True
