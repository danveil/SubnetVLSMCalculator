"""Pure IPv6 network-analysis functions."""

from __future__ import annotations

from ipaddress import IPv6Address, IPv6Interface

from subnet_calculator.constants import IPV6_DOCUMENTATION_NETWORK
from subnet_calculator.models import IPv6Analysis


class IPv6CalculationError(ValueError):
    """Raised when an IPv6 interface cannot be analyzed."""


def _classifications(address: IPv6Address) -> tuple[str, ...]:
    labels: list[str] = []
    if address in IPV6_DOCUMENTATION_NETWORK:
        labels.append("documentation")
    if address.is_unspecified:
        labels.append("unspecified")
    if address.is_loopback:
        labels.append("loopback")
    if address.is_multicast:
        labels.append("multicast")
    if address.is_link_local:
        labels.append("link-local")
    if address.is_private:
        labels.append("private/unique-local")
    if address.is_reserved:
        labels.append("reserved")
    if address.is_global:
        labels.append("global-unicast")
    return tuple(dict.fromkeys(labels)) or ("special-purpose",)


def analyze_ipv6(address: str) -> IPv6Analysis:
    """Analyze an IPv6 interface and its containing network."""
    if not address or not address.strip():
        raise IPv6CalculationError("IPv6 input must not be empty")
    raw = address.strip()
    if "/" not in raw:
        raw = f"{raw}/128"
    try:
        interface = IPv6Interface(raw)
    except ValueError as exc:
        raise IPv6CalculationError(f"invalid IPv6 interface '{address}': {exc}") from exc

    ip = interface.ip
    network = interface.network
    prefix = network.prefixlen
    if prefix < 64:
        suggested_subnets: int | None = 1 << (64 - prefix)
        note = f"This network can be divided into {suggested_subnets:,} standard /64 subnets."
    elif prefix == 64:
        suggested_subnets = 1
        note = "This is already the standard /64 size used by most IPv6 LANs."
    else:
        suggested_subnets = None
        note = "This prefix is longer than /64 and cannot contain a complete /64 subnet."

    return IPv6Analysis(
        input_address=str(ip),
        normalized_network=str(network),
        prefix_length=prefix,
        total_addresses=network.num_addresses,
        first_address=str(network.network_address),
        last_address=str(network.broadcast_address),
        classifications=_classifications(ip),
        exploded_address=ip.exploded,
        compressed_address=ip.compressed,
        network_bits=prefix,
        host_bits=128 - prefix,
        suggested_64_subnets=suggested_subnets,
        suggested_64_note=note,
    )
