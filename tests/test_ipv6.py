"""Tests for IPv6 network analysis."""

import pytest

from subnet_calculator.ipv6 import IPv6CalculationError, analyze_ipv6


def test_ipv6_normalization() -> None:
    result = analyze_ipv6("2001:db8:0:1::1234/64")
    assert result.normalized_network == "2001:db8:0:1::/64"
    assert result.compressed_address == "2001:db8:0:1::1234"
    assert result.exploded_address == "2001:0db8:0000:0001:0000:0000:0000:1234"
    assert result.total_addresses == 2**64


def test_ipv6_48_suggests_64s() -> None:
    result = analyze_ipv6("2001:db8::/48")
    assert result.suggested_64_subnets == 65536
    assert result.network_bits == 48
    assert result.host_bits == 80


def test_ipv6_64_note() -> None:
    result = analyze_ipv6("2001:db8::/64")
    assert result.suggested_64_subnets == 1
    assert "standard /64" in result.suggested_64_note


def test_longer_than_64() -> None:
    result = analyze_ipv6("2001:db8::1/96")
    assert result.suggested_64_subnets is None
    assert result.first_address == "2001:db8::"
    assert result.last_address == "2001:db8::ffff:ffff"


def test_ipv6_documentation_classification() -> None:
    assert "documentation" in analyze_ipv6("2001:db8::1/64").classifications


def test_ipv6_loopback() -> None:
    result = analyze_ipv6("::1")
    assert result.prefix_length == 128
    assert "loopback" in result.classifications


@pytest.mark.parametrize("value", ["", "192.168.1.1/24", "2001:db8::/129", "xyz::1"])
def test_invalid_ipv6(value: str) -> None:
    with pytest.raises(IPv6CalculationError, match="IPv6"):
        analyze_ipv6(value)
