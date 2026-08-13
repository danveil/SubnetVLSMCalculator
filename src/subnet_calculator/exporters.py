"""Safe JSON, CSV, and plain-text report exporters."""

from __future__ import annotations

import csv
import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from subnet_calculator.constants import APPLICATION_NAME, APPLICATION_VERSION
from subnet_calculator.models import VLSMAllocation, VLSMResult
from subnet_calculator.packet_tracer import generate_packet_tracer_template
from subnet_calculator.validators import validate_output_path


class ExportError(OSError):
    """Raised when a report cannot be exported safely."""


def _prepare(path: Path, force: bool) -> Path:
    validated = validate_output_path(path)
    if validated.exists() and not force:
        raise ExportError(f"output file already exists: {validated}; use --force to overwrite it")
    if not validated.parent.exists():
        raise ExportError(f"output directory does not exist: {validated.parent}")
    if validated.is_dir():
        raise ExportError(f"output path is a directory: {validated}")
    return validated


def _metadata(result: VLSMResult) -> dict[str, Any]:
    return {
        "application": APPLICATION_NAME,
        "version": APPLICATION_VERSION,
        "generated_at": datetime.now(UTC).isoformat(),
        "input_configuration": result.input_configuration.model_dump(mode="json"),
        "parent_network": result.parent_network,
        "allocations": [item.model_dump(mode="json") for item in result.allocations],
        "remaining_networks": list(result.remaining_networks),
        "remaining_ranges": list(result.remaining_ranges),
        "warnings": list(result.warnings),
        "statistics": result.statistics.model_dump(mode="json"),
    }


def export_json(result: VLSMResult, path: Path, *, force: bool = False) -> Path:
    """Write a complete UTF-8 JSON report."""
    destination = _prepare(path, force)
    try:
        destination.write_text(
            json.dumps(_metadata(result), indent=2, sort_keys=True) + "\n", encoding="utf-8"
        )
    except OSError as exc:
        raise ExportError(f"could not write JSON report '{destination}': {exc}") from exc
    return destination


def export_csv(result: VLSMResult, path: Path, *, force: bool = False) -> Path:
    """Write a UTF-8 CSV report with metadata repeated on each allocation row."""
    destination = _prepare(path, force)
    metadata = _metadata(result)
    allocation_fields = list(VLSMAllocation.model_fields)
    fixed_fields = [
        "application",
        "version",
        "generated_at",
        "parent_network",
        "input_configuration",
        "warnings",
        "statistics",
        "remaining_networks",
        "remaining_ranges",
    ]
    try:
        with destination.open("w", encoding="utf-8", newline="") as stream:
            writer = csv.DictWriter(stream, fieldnames=fixed_fields + allocation_fields)
            writer.writeheader()
            for allocation in result.allocations:
                row: dict[str, Any] = {
                    key: json.dumps(metadata[key], sort_keys=True)
                    if isinstance(metadata[key], (dict, list))
                    else metadata[key]
                    for key in fixed_fields
                }
                row.update(allocation.model_dump(mode="json"))
                writer.writerow(row)
    except OSError as exc:
        raise ExportError(f"could not write CSV report '{destination}': {exc}") from exc
    return destination


def export_text(result: VLSMResult, path: Path, *, force: bool = False) -> Path:
    """Write a deterministic, human-readable UTF-8 allocation report."""
    destination = _prepare(path, force)
    metadata = _metadata(result)
    lines = [
        f"{APPLICATION_NAME} v{APPLICATION_VERSION}",
        f"Generated: {metadata['generated_at']}",
        f"Parent: {result.parent_network}",
        "",
        "Allocations:",
    ]
    lines.extend(
        f"- {item.segment}: {item.cidr}, {item.allocated_capacity} usable, "
        f"{item.required_hosts} requested"
        for item in result.allocations
    )
    lines.extend(
        [
            "",
            f"Remaining CIDRs: {', '.join(result.remaining_networks) or 'none'}",
            f"Statistics: {json.dumps(result.statistics.model_dump(), sort_keys=True)}",
            f"Input: {json.dumps(metadata['input_configuration'], sort_keys=True)}",
            "Warnings:",
            *(f"- {warning}" for warning in result.warnings),
        ]
    )
    try:
        destination.write_text("\n".join(lines) + "\n", encoding="utf-8")
    except OSError as exc:
        raise ExportError(f"could not write text report '{destination}': {exc}") from exc
    return destination


def export_packet_tracer(result: VLSMResult, path: Path, *, force: bool = False) -> Path:
    """Write a review-required Packet Tracer configuration template."""
    destination = _prepare(path, force)
    try:
        destination.write_text(generate_packet_tracer_template(result), encoding="utf-8")
    except OSError as exc:
        raise ExportError(f"could not write Packet Tracer template '{destination}': {exc}") from exc
    return destination
