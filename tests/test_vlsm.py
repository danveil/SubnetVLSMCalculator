"""Tests for the VLSM allocation engine."""

from ipaddress import IPv4Network

import pytest
from pydantic import ValidationError

from subnet_calculator.models import SegmentRequest, VLSMInput
from subnet_calculator.validators import CalculatorValidationError
from subnet_calculator.visualizer import allocation_map
from subnet_calculator.vlsm import VLSMAllocationError, allocate_vlsm, allocations_are_safe


def _configuration(
    *segments: SegmentRequest, parent: str = "192.168.10.0/24", p2p: bool = False
) -> VLSMInput:
    return VLSMInput(parent_network=parent, allow_point_to_point_31=p2p, segments=segments)


def test_largest_to_smallest_ordering() -> None:
    result = allocate_vlsm(
        _configuration(
            SegmentRequest(name="Small", required_hosts=10),
            SegmentRequest(name="Large", required_hosts=60),
            SegmentRequest(name="Medium", required_hosts=30),
        )
    )
    assert [item.segment for item in result.allocations] == ["Large", "Medium", "Small"]
    assert [item.cidr for item in result.allocations] == [
        "192.168.10.0/26",
        "192.168.10.64/27",
        "192.168.10.96/28",
    ]


def test_required_output_fields() -> None:
    allocation = allocate_vlsm(
        _configuration(
            SegmentRequest(name="Users", required_hosts=60, vlan_id=10, security_zone="trusted")
        )
    ).allocations[0]
    assert allocation.subnet_mask == "255.255.255.192"
    assert allocation.wildcard_mask == "0.0.0.63"
    assert allocation.first_usable == "192.168.10.1"
    assert allocation.last_usable == "192.168.10.62"
    assert allocation.broadcast_address == "192.168.10.63"
    assert allocation.allocated_capacity == 62
    assert allocation.wasted_addresses == 2


def test_allocations_do_not_overlap() -> None:
    result = allocate_vlsm(
        _configuration(
            *(SegmentRequest(name=f"S{i}", required_hosts=i + 1) for i in range(20)),
            parent="192.168.8.0/22",
        )
    )
    assert allocations_are_safe(result)
    networks = [IPv4Network(item.cidr) for item in result.allocations]
    assert all(
        not left.overlaps(right) for i, left in enumerate(networks) for right in networks[i + 1 :]
    )


def test_all_allocations_inside_parent() -> None:
    result = allocate_vlsm(_configuration(SegmentRequest(name="A", required_hosts=100)))
    parent = IPv4Network(result.parent_network)
    assert all(IPv4Network(item.cidr).subnet_of(parent) for item in result.allocations)


def test_insufficient_parent_space() -> None:
    with pytest.raises(VLSMAllocationError, match=r"too small.*Large"):
        allocate_vlsm(
            _configuration(SegmentRequest(name="Large", required_hosts=200), parent="10.0.0.0/25")
        )


def test_exact_fit() -> None:
    result = allocate_vlsm(
        _configuration(SegmentRequest(name="Exact", required_hosts=254), parent="10.0.0.0/24")
    )
    assert result.statistics.total_unused_addresses == 0
    assert result.remaining_networks == ()
    assert result.statistics.utilization_percent == 100.0


def test_remaining_address_space() -> None:
    result = allocate_vlsm(_configuration(SegmentRequest(name="Users", required_hosts=60)))
    assert result.remaining_ranges == ("192.168.10.64-192.168.10.255",)
    assert result.remaining_networks == ("192.168.10.64/26", "192.168.10.128/25")
    assert result.statistics.total_unused_addresses == 192


def test_statistics() -> None:
    result = allocate_vlsm(
        _configuration(
            SegmentRequest(name="Users", required_hosts=60),
            SegmentRequest(name="Servers", required_hosts=30),
        )
    )
    assert result.statistics.total_parent_addresses == 256
    assert result.statistics.total_allocated_addresses == 96
    assert result.statistics.total_requested_hosts == 90
    assert result.statistics.total_reserved_addresses == 4
    assert result.statistics.utilization_percent == 37.5


def test_point_to_point_31_when_enabled_and_explicit() -> None:
    result = allocate_vlsm(
        _configuration(SegmentRequest(name="WAN", required_hosts=2, point_to_point=True), p2p=True)
    )
    allocation = result.allocations[0]
    assert allocation.cidr == "192.168.10.0/31"
    assert allocation.allocated_capacity == 2
    assert result.statistics.total_reserved_addresses == 0


def test_point_to_point_uses_30_when_not_enabled() -> None:
    result = allocate_vlsm(
        _configuration(SegmentRequest(name="WAN", required_hosts=2, point_to_point=True))
    )
    assert result.allocations[0].cidr.endswith("/30")


def test_two_hosts_not_automatically_point_to_point() -> None:
    result = allocate_vlsm(
        _configuration(SegmentRequest(name="Tiny LAN", required_hosts=2), p2p=True)
    )
    assert result.allocations[0].cidr.endswith("/30")


def test_duplicate_segment_names_rejected() -> None:
    with pytest.raises(CalculatorValidationError, match="duplicate segment"):
        allocate_vlsm(
            _configuration(
                SegmentRequest(name="Users", required_hosts=2),
                SegmentRequest(name="users", required_hosts=3),
            )
        )


def test_duplicate_vlan_ids_rejected() -> None:
    with pytest.raises(CalculatorValidationError, match="duplicate VLAN"):
        allocate_vlsm(
            _configuration(
                SegmentRequest(name="A", required_hosts=2, vlan_id=10),
                SegmentRequest(name="B", required_hosts=3, vlan_id=10),
            )
        )


@pytest.mark.parametrize("hosts", [0, -1])
def test_nonpositive_hosts_rejected(hosts: int) -> None:
    with pytest.raises(ValidationError):
        SegmentRequest(name="Invalid", required_hosts=hosts)


@pytest.mark.parametrize("vlan", [0, 4095])
def test_vlan_out_of_range(vlan: int) -> None:
    with pytest.raises(ValidationError):
        SegmentRequest(name="Invalid", required_hosts=2, vlan_id=vlan)


def test_stable_order_for_equal_sizes() -> None:
    result = allocate_vlsm(
        _configuration(
            SegmentRequest(name="First", required_hosts=10),
            SegmentRequest(name="Second", required_hosts=10),
        )
    )
    assert [item.segment for item in result.allocations] == ["First", "Second"]


def test_supports_at_least_100_segments() -> None:
    result = allocate_vlsm(
        _configuration(
            *(SegmentRequest(name=f"Segment-{index}", required_hosts=1) for index in range(100)),
            parent="10.0.0.0/23",
        )
    )
    assert len(result.allocations) == 100
    assert allocations_are_safe(result)


def test_parent_with_host_bits_rejected() -> None:
    with pytest.raises(CalculatorValidationError, match="host bits"):
        allocate_vlsm(
            _configuration(SegmentRequest(name="A", required_hosts=2), parent="10.0.0.1/24")
        )


def test_warning_explains_security_limit() -> None:
    result = allocate_vlsm(_configuration(SegmentRequest(name="A", required_hosts=2)))
    assert "firewalls" in result.warnings[0]


def test_allocation_map_is_ascii_safe() -> None:
    result = allocate_vlsm(_configuration(SegmentRequest(name="A", required_hosts=2)))
    rendered = allocation_map(result)
    rendered.encode("ascii")
    assert "+--" in rendered
    assert "`-- Remaining:" in rendered
