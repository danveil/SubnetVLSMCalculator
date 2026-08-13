"""Beginner-friendly explanations of subnet calculations."""

from subnet_calculator.models import IPv4Analysis


def explain_ipv4(result: IPv4Analysis) -> str:
    """Explain how an IPv4 network result was derived."""
    block_size = 1 << result.host_bits
    octet = min(result.prefix_length // 8, 3)
    input_octets = [int(part) for part in result.input_address.split(".")]
    network_octets = [int(part) for part in result.network_address.split(".")]
    lines = [
        f"{result.input_address}/{result.prefix_length} has {result.prefix_length} network bits "
        f"and {result.host_bits} host bits.",
        f"A /{result.prefix_length} prefix equals subnet mask {result.subnet_mask}: the first "
        f"{result.prefix_length} mask bits are 1 and the rest are 0.",
        f"With {result.host_bits} host bits, each subnet contains 2^{result.host_bits} = "
        f"{result.total_addresses} addresses (a block size of {block_size}).",
        f"The relevant address value {input_octets[octet]} falls in the block beginning at "
        f"{network_octets[octet]}, so the subnet starts at {result.network_address}.",
        f"The last address in that block is {result.broadcast_address}.",
    ]
    if result.prefix_length <= 30:
        lines.append(
            f"Traditionally, the network and broadcast addresses are reserved, leaving "
            f"{result.usable_host_count} usable hosts from {result.first_usable_host} through "
            f"{result.last_usable_host}."
        )
    elif result.special_use_explanation:
        lines.append(result.special_use_explanation)
    lines.extend(
        [
            f"Binary address: {result.binary_ip}",
            f"Binary mask:    {result.binary_subnet_mask}",
        ]
    )
    return "\n".join(lines)


def block_size_for_prefix(prefix: int) -> int:
    """Return the address count in an IPv4 prefix, useful in teaching output."""
    if not 0 <= prefix <= 32:
        raise ValueError("IPv4 prefix must be from 0 through 32")
    return 1 << (32 - prefix)
