"""Tests for individual IPv4 subnet analysis."""

import pytest

from subnet_calculator.subnet import SubnetCalculationError, analyze_ipv4


def test_standard_24() -> None:
    result = analyze_ipv4("192.168.1.10/24")
    assert result.normalized_network == "192.168.1.0/24"
    assert result.broadcast_address == "192.168.1.255"
    assert result.first_usable_host == "192.168.1.1"
    assert result.last_usable_host == "192.168.1.254"
    assert result.usable_host_count == 254


@pytest.mark.parametrize(
    ("prefix", "total", "usable"),
    [(25, 128, 126), (26, 64, 62), (27, 32, 30), (28, 16, 14), (29, 8, 6), (30, 4, 2)],
)
def test_prefix_sizes(prefix: int, total: int, usable: int) -> None:
    result = analyze_ipv4(f"10.0.0.1/{prefix}")
    assert result.total_addresses == total
    assert result.usable_host_count == usable


def test_31_uses_both_addresses() -> None:
    result = analyze_ipv4("10.0.0.0/31")
    assert result.usable_host_count == 2
    assert result.first_usable_host == "10.0.0.0"
    assert result.last_usable_host == "10.0.0.1"
    assert "point-to-point" in (result.special_use_explanation or "")


def test_32_is_host_route() -> None:
    result = analyze_ipv4("10.0.0.9/32")
    assert result.total_addresses == result.usable_host_count == 1
    assert result.first_usable_host == result.last_usable_host == "10.0.0.9"
    assert "single-host" in (result.special_use_explanation or "")


def test_separate_mask() -> None:
    result = analyze_ipv4("172.16.5.10", "255.255.255.0")
    assert result.normalized_network == "172.16.5.0/24"


def test_private_classification() -> None:
    assert "private" in analyze_ipv4("10.2.3.4/8").classifications


def test_public_classification() -> None:
    assert "public" in analyze_ipv4("8.8.8.8/24").classifications


def test_loopback_classification() -> None:
    assert "loopback" in analyze_ipv4("127.0.0.1/8").classifications


def test_multicast_classification() -> None:
    assert "multicast" in analyze_ipv4("224.0.0.1/24").classifications


def test_link_local_classification() -> None:
    assert "link-local" in analyze_ipv4("169.254.2.1/16").classifications


def test_documentation_classification() -> None:
    assert "documentation" in analyze_ipv4("192.0.2.1/24").classifications


def test_binary_fields() -> None:
    result = analyze_ipv4("192.168.1.10/26")
    assert result.binary_ip == "11000000.10101000.00000001.00001010"
    assert result.binary_subnet_mask.endswith("11000000")
    assert result.network_bits == 26
    assert result.host_bits == 6


def test_adjacent_subnets() -> None:
    result = analyze_ipv4("192.168.1.70/26")
    assert result.previous_subnet == "192.168.1.0/26"
    assert result.next_subnet == "192.168.1.128/26"


@pytest.mark.parametrize("value", ["", "999.1.1.1/24", "192.168.1.1/33", "not-an-ip"])
def test_invalid_input(value: str) -> None:
    with pytest.raises(SubnetCalculationError, match=r"IPv4|empty"):
        analyze_ipv4(value)


def test_rejects_mask_and_prefix_together() -> None:
    with pytest.raises(SubnetCalculationError, match="either"):
        analyze_ipv4("192.168.1.1/24", "255.255.255.0")
