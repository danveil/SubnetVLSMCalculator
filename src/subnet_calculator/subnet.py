"""Pure IPv4 subnet-analysis functions."""

from __future__ import annotations

from ipaddress import AddressValueError, IPv4Address, IPv4Interface, IPv4Network, NetmaskValueError

from subnet_calculator.constants import IPV4_DOCUMENTATION_NETWORKS
from subnet_calculator.models import IPv4Analysis


class SubnetCalculationError(ValueError):
    """Raised when an address cannot be analyzed."""


def _binary(address: IPv4Address) -> str:
    return ".".join(f"{octet:08b}" for octet in address.packed)


def _address_class(address: IPv4Address) -> str:
    first_octet = int(str(address).split(".", maxsplit=1)[0])
    if first_octet <= 127:
        return "A"
    if first_octet <= 191:
        return "B"
    if first_octet <= 223:
        return "C"
    if first_octet <= 239:
        return "D (multicast)"
    return "E (reserved/experimental)"


def _classifications(address: IPv4Address) -> tuple[str, ...]:
    labels: list[str] = []
    if any(address in network for network in IPV4_DOCUMENTATION_NETWORKS):
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
        labels.append("private")
    if address.is_reserved:
        labels.append("reserved")
    if address.is_global:
        labels.append("public")
    return tuple(dict.fromkeys(labels)) or ("special-purpose",)


def _adjacent(network: IPv4Network, direction: int) -> str | None:
    candidate = int(network.network_address) + (direction * network.num_addresses)
    if candidate < 0 or candidate > (2**32 - network.num_addresses):
        return None
    return str(IPv4Network((candidate, network.prefixlen)))


def _usable_range(network: IPv4Network) -> tuple[int, str | None, str | None]:
    if network.prefixlen == 32:
        address = str(network.network_address)
        return 1, address, address
    if network.prefixlen == 31:
        return 2, str(network.network_address), str(network.broadcast_address)
    return (
        network.num_addresses - 2,
        str(network.network_address + 1),
        str(network.broadcast_address - 1),
    )


def analyze_ipv4(address: str, mask: str | None = None) -> IPv4Analysis:
    """Analyze an IPv4 interface, optionally applying a separate dotted mask."""
    if not address or not address.strip():
        raise SubnetCalculationError("IPv4 input must not be empty")
    raw = address.strip()
    if mask is not None:
        if "/" in raw:
            raise SubnetCalculationError("provide either a CIDR prefix or --mask, not both")
        raw = f"{raw}/{mask.strip()}"
    elif "/" not in raw:
        raw = f"{raw}/32"

    try:
        interface = IPv4Interface(raw)
    except (AddressValueError, NetmaskValueError, ValueError) as exc:
        raise SubnetCalculationError(f"invalid IPv4 interface '{address}': {exc}") from exc

    ip = interface.ip
    network = interface.network
    usable_count, first_usable, last_usable = _usable_range(network)
    explanation: str | None = None
    if network.prefixlen == 31:
        explanation = (
            "A /31 uses both addresses on a point-to-point link under modern RFC 3021 "
            "behavior; there is no reserved network or broadcast endpoint."
        )
    elif network.prefixlen == 32:
        explanation = (
            "A /32 is a single-host route. It identifies one address and has no ordinary "
            "multi-host range."
        )

    return IPv4Analysis(
        input_address=str(ip),
        normalized_network=str(network),
        network_address=str(network.network_address),
        broadcast_address=str(network.broadcast_address),
        subnet_mask=str(network.netmask),
        wildcard_mask=str(network.hostmask),
        prefix_length=network.prefixlen,
        total_addresses=network.num_addresses,
        usable_host_count=usable_count,
        first_usable_host=first_usable,
        last_usable_host=last_usable,
        is_network_address=ip == network.network_address,
        is_broadcast_address=ip == network.broadcast_address,
        address_class=_address_class(ip),
        classifications=_classifications(ip),
        binary_ip=_binary(ip),
        binary_subnet_mask=_binary(network.netmask),
        network_bits=network.prefixlen,
        host_bits=32 - network.prefixlen,
        previous_subnet=_adjacent(network, -1),
        next_subnet=_adjacent(network, 1),
        special_use_explanation=explanation,
    )
