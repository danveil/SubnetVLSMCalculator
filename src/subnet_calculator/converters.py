"""IPv4 CIDR, subnet-mask, and wildcard-mask conversion functions."""

from ipaddress import IPv4Address, IPv4Network, NetmaskValueError


class ConversionError(ValueError):
    """Raised for invalid mask or prefix conversions."""


def _validated_prefix(prefix: int) -> int:
    if isinstance(prefix, bool) or not isinstance(prefix, int) or not 0 <= prefix <= 32:
        raise ConversionError("IPv4 prefix must be an integer from 0 through 32")
    return prefix


def prefix_to_mask(prefix: int) -> str:
    """Convert an IPv4 prefix length to a contiguous dotted-decimal mask."""
    prefix = _validated_prefix(prefix)
    return str(IPv4Network(f"0.0.0.0/{prefix}").netmask)


def prefix_to_wildcard(prefix: int) -> str:
    """Convert an IPv4 prefix length to a dotted-decimal wildcard mask."""
    prefix = _validated_prefix(prefix)
    return str(IPv4Network(f"0.0.0.0/{prefix}").hostmask)


def mask_to_prefix(mask: str) -> int:
    """Convert a contiguous dotted-decimal subnet mask to its prefix length."""
    try:
        network = IPv4Network(f"0.0.0.0/{mask.strip()}" if mask else "invalid")
    except (ValueError, NetmaskValueError) as exc:
        raise ConversionError(
            f"invalid subnet mask '{mask}': masks must contain contiguous one-bits"
        ) from exc
    return network.prefixlen


def wildcard_to_mask(wildcard: str) -> str:
    """Convert a valid wildcard mask into a contiguous subnet mask."""
    try:
        wildcard_address = IPv4Address(wildcard.strip())
    except ValueError as exc:
        raise ConversionError(f"invalid wildcard mask '{wildcard}'") from exc
    mask = IPv4Address(int(wildcard_address) ^ 0xFFFFFFFF)
    mask_to_prefix(str(mask))
    return str(mask)
