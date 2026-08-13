"""Cross-field and domain validation helpers."""

from __future__ import annotations

from ipaddress import IPv4Network
from pathlib import Path

from subnet_calculator.models import SegmentRequest


class CalculatorValidationError(ValueError):
    """Raised when a calculator input violates a domain rule."""


def validate_parent_network(value: str) -> IPv4Network:
    """Return a strict IPv4 parent network, rejecting host bits and IPv6."""
    try:
        network = IPv4Network(value, strict=True)
    except ValueError as exc:
        hint = (
            " Use the network address (with all host bits set to zero)."
            if "host bits" in str(exc)
            else ""
        )
        raise CalculatorValidationError(
            f"invalid IPv4 parent network '{value}': {exc}.{hint}"
        ) from exc
    return network


def validate_segments(segments: tuple[SegmentRequest, ...]) -> None:
    """Reject empty lists, duplicate names, and duplicate VLAN identifiers."""
    if not segments:
        raise CalculatorValidationError("at least one segment is required")
    normalized_names: set[str] = set()
    vlan_ids: set[int] = set()
    for segment in segments:
        normalized = segment.name.casefold()
        if normalized in normalized_names:
            raise CalculatorValidationError(f"duplicate segment name: '{segment.name}'")
        normalized_names.add(normalized)
        if segment.vlan_id is not None:
            if segment.vlan_id in vlan_ids:
                raise CalculatorValidationError(f"duplicate VLAN ID: {segment.vlan_id}")
            vlan_ids.add(segment.vlan_id)


def validate_output_path(path: Path) -> Path:
    """Validate a relative or absolute local file path for report creation."""
    if path.name in {"", ".", ".."} or path.name != path.name.strip():
        raise CalculatorValidationError("output path must include a safe filename")
    if any(char in path.name for char in '<>:"|?*'):
        raise CalculatorValidationError(
            f"output filename contains unsafe characters: '{path.name}'"
        )
    return path
