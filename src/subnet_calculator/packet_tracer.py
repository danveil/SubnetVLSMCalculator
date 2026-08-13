"""Generate review-required Cisco Packet Tracer configuration templates."""

from __future__ import annotations

import re

from subnet_calculator.models import VLSMAllocation, VLSMResult

REVIEW_WARNING = "PACKET TRACER CONFIGURATION TEMPLATE - REVIEW REQUIRED BEFORE USE"


class PacketTracerTemplateError(ValueError):
    """Raised when a Packet Tracer template cannot be generated."""


def _single_line(value: str) -> str:
    """Collapse untrusted free text so it cannot create configuration lines."""
    return " ".join(value.split())


def _vlan_name(allocation: VLSMAllocation) -> str:
    """Create a conservative IOS-compatible VLAN name."""
    normalized = re.sub(r"[^A-Z0-9_-]+", "_", allocation.segment.upper()).strip("_")
    return (normalized or f"VLAN_{allocation.vlan_id}")[:32]


def _description(allocation: VLSMAllocation) -> str:
    source = allocation.description or allocation.segment
    cleaned = _single_line(source)
    cleaned = re.sub(r"[^A-Za-z0-9 _.,:/()_-]+", "", cleaned).strip()
    return f"TEMPLATE - {(cleaned or 'Review description')[:68]}"


def generate_packet_tracer_template(result: VLSMResult) -> str:
    """Generate non-deploying VLAN and SVI commands from a VLSM result.

    The returned text is a configuration template only. It never connects to a
    device or applies commands, and it carries explicit review warnings.
    """
    configured = [item for item in result.allocations if item.vlan_id is not None]
    if not configured:
        raise PacketTracerTemplateError(
            "no Packet Tracer template can be generated because no segment has a VLAN ID"
        )

    lines = [
        "! ======================================================================",
        f"! {REVIEW_WARNING}",
        "! This file is not a deployable configuration.",
        "! Verify device roles, addresses, VLANs, routing, ACLs, and security policy.",
        f"! Source VLSM parent network: {result.parent_network}",
        "! ======================================================================",
        "!",
    ]
    skipped = [item for item in result.allocations if item.vlan_id is None]
    for allocation in skipped:
        lines.append(
            f"! SKIPPED: {_single_line(allocation.segment)} has no VLAN ID; review manually."
        )
    if skipped:
        lines.append("!")

    for allocation in configured:
        vlan_id = allocation.vlan_id
        assert vlan_id is not None
        lines.extend(
            [
                f"! Segment: {_single_line(allocation.segment)} | Network: {allocation.cidr}",
                f"vlan {vlan_id}",
                f" name {_vlan_name(allocation)}",
                "exit",
                f"interface vlan {vlan_id}",
                f" description {_description(allocation)}",
                f" ip address {allocation.first_usable} {allocation.subnet_mask}",
                " no shutdown",
                "exit",
                "!",
            ]
        )

    lines.extend(
        [
            "! ======================================================================",
            f"! END TEMPLATE - {REVIEW_WARNING}",
            "! ======================================================================",
        ]
    )
    return "\n".join(lines) + "\n"
