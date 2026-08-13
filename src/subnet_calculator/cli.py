"""Typer and Rich command-line interface."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Annotated, Any

import typer
from pydantic import ValidationError
from rich.console import Console
from rich.table import Table

from subnet_calculator import __version__
from subnet_calculator.converters import (
    ConversionError,
    mask_to_prefix,
    prefix_to_mask,
    prefix_to_wildcard,
    wildcard_to_mask,
)
from subnet_calculator.explanations import explain_ipv4
from subnet_calculator.exporters import (
    ExportError,
    export_csv,
    export_json,
    export_packet_tracer,
    export_text,
)
from subnet_calculator.ipv6 import IPv6CalculationError, analyze_ipv6
from subnet_calculator.models import (
    IPv4Analysis,
    IPv6Analysis,
    SegmentRequest,
    VLSMInput,
    VLSMResult,
)
from subnet_calculator.packet_tracer import (
    PacketTracerTemplateError,
    generate_packet_tracer_template,
)
from subnet_calculator.subnet import SubnetCalculationError, analyze_ipv4
from subnet_calculator.validators import CalculatorValidationError
from subnet_calculator.visualizer import allocation_map, binary_boundary_map
from subnet_calculator.vlsm import VLSMAllocationError, allocate_vlsm

app = typer.Typer(
    name="subnetcalc",
    help="Professional defensive IPv4, IPv6, subnetting, and VLSM calculator.",
    no_args_is_help=True,
    rich_markup_mode="rich",
    context_settings={"help_option_names": ["-h", "--help"]},
)
console = Console()
error_console = Console(stderr=True)


def _version_callback(value: bool) -> None:
    if value:
        typer.echo(f"subnetcalc {__version__}")
        raise typer.Exit()


@app.callback()
def main(
    ctx: typer.Context,
    debug: Annotated[
        bool, typer.Option("--debug", help="Show detailed exceptions for diagnostics.")
    ] = False,
    version: Annotated[
        bool | None,
        typer.Option("--version", callback=_version_callback, is_eager=True, help="Show version."),
    ] = None,
) -> None:
    """Configure global command behavior."""
    del version
    ctx.ensure_object(dict)
    ctx.obj["debug"] = debug


def _fail(ctx: typer.Context, exc: Exception) -> None:
    if ctx.obj and ctx.obj.get("debug"):
        raise exc
    error_console.print(f"[bold red]Error:[/bold red] {exc}")
    raise typer.Exit(code=2)


def _analysis_table(result: IPv4Analysis | IPv6Analysis) -> Table:
    table = Table(title=f"IPv{result.ip_version} Analysis", show_header=False)
    table.add_column("Field", style="cyan")
    table.add_column("Value")
    for key, value in result.model_dump().items():
        if value is not None:
            table.add_row(
                key.replace("_", " ").title(),
                ", ".join(value) if isinstance(value, tuple) else str(value),
            )
    return table


@app.command(help="Analyze an IPv4 or IPv6 interface. Example: subnetcalc analyze 192.168.1.10/24")
def analyze(
    ctx: typer.Context,
    address: Annotated[str, typer.Argument(help="IP interface, such as 192.168.1.10/24.")],
    mask: Annotated[
        str | None, typer.Option("--mask", help="Separate dotted IPv4 subnet mask.")
    ] = None,
) -> None:
    """Analyze an individual IP interface."""
    try:
        if ":" in address:
            if mask is not None:
                raise IPv6CalculationError("--mask is only valid for IPv4; use an IPv6 prefix")
            result: IPv4Analysis | IPv6Analysis = analyze_ipv6(address)
        else:
            result = analyze_ipv4(address, mask)
        console.print(_analysis_table(result))
        if isinstance(result, IPv4Analysis):
            console.print(binary_boundary_map(result))
            if result.special_use_explanation:
                console.print(f"[yellow]{result.special_use_explanation}[/yellow]")
    except (SubnetCalculationError, IPv6CalculationError) as exc:
        _fail(ctx, exc)


@app.command(help="Convert IPv4 prefixes, subnet masks, and wildcard masks.")
def convert(
    ctx: typer.Context,
    prefix: Annotated[
        int | None, typer.Option("--prefix", help="CIDR prefix from 0 to 32.")
    ] = None,
    mask: Annotated[str | None, typer.Option("--mask", help="Dotted-decimal subnet mask.")] = None,
    wildcard: Annotated[
        str | None, typer.Option("--wildcard", help="Dotted-decimal wildcard mask.")
    ] = None,
) -> None:
    """Convert exactly one IPv4 mask representation."""
    try:
        if sum(value is not None for value in (prefix, mask, wildcard)) != 1:
            raise ConversionError("provide exactly one of --prefix, --mask, or --wildcard")
        if prefix is not None:
            output = {
                "Prefix": f"/{prefix}",
                "Subnet mask": prefix_to_mask(prefix),
                "Wildcard mask": prefix_to_wildcard(prefix),
            }
        elif mask is not None:
            converted_prefix = mask_to_prefix(mask)
            output = {
                "Subnet mask": mask,
                "Prefix": f"/{converted_prefix}",
                "Wildcard mask": prefix_to_wildcard(converted_prefix),
            }
        else:
            assert wildcard is not None
            subnet_mask = wildcard_to_mask(wildcard)
            output = {
                "Wildcard mask": wildcard,
                "Subnet mask": subnet_mask,
                "Prefix": f"/{mask_to_prefix(subnet_mask)}",
            }
        table = Table(title="IPv4 Conversion", show_header=False)
        for key, value in output.items():
            table.add_row(key, value)
        console.print(table)
    except ConversionError as exc:
        _fail(ctx, exc)


def _parse_host(value: str) -> SegmentRequest:
    try:
        name, count = value.rsplit(":", maxsplit=1)
        return SegmentRequest(name=name, required_hosts=int(count))
    except (ValueError, ValidationError) as exc:
        raise CalculatorValidationError(
            f"invalid --host '{value}'; expected NAME:POSITIVE_HOST_COUNT"
        ) from exc


def _load_configuration(path: Path) -> VLSMInput:
    try:
        payload: Any = json.loads(path.read_text(encoding="utf-8"))
    except OSError as exc:
        raise CalculatorValidationError(f"cannot read input file '{path}': {exc}") from exc
    except json.JSONDecodeError as exc:
        raise CalculatorValidationError(
            f"invalid JSON in '{path}' at line {exc.lineno}, column {exc.colno}: {exc.msg}"
        ) from exc
    try:
        return VLSMInput.model_validate(payload)
    except ValidationError as exc:
        raise CalculatorValidationError(f"invalid VLSM input in '{path}': {exc}") from exc


def _vlsm_table(result: VLSMResult) -> Table:
    table = Table(title=f"VLSM Allocation — {result.parent_network}")
    headings = [
        "Segment",
        "Description",
        "VLAN",
        "Zone",
        "Required",
        "Capacity",
        "CIDR",
        "Mask",
        "Network",
        "First",
        "Last",
        "Broadcast",
        "Wildcard",
        "Wasted",
    ]
    for heading in headings:
        table.add_column(heading, overflow="fold")
    for item in result.allocations:
        table.add_row(
            item.segment,
            item.description or "—",
            str(item.vlan_id) if item.vlan_id is not None else "—",
            item.security_zone or "—",
            str(item.required_hosts),
            str(item.allocated_capacity),
            item.cidr,
            item.subnet_mask,
            item.network_address,
            item.first_usable,
            item.last_usable,
            item.broadcast_address,
            item.wildcard_mask,
            str(item.wasted_addresses),
        )
    return table


@app.command(help="Allocate non-overlapping IPv4 VLSM networks from hosts or a JSON file.")
def vlsm(
    ctx: typer.Context,
    network: Annotated[
        str | None, typer.Option("--network", help="Strict IPv4 parent CIDR.")
    ] = None,
    host: Annotated[
        list[str] | None, typer.Option("--host", help="Repeatable NAME:HOSTS requirement.")
    ] = None,
    file: Annotated[
        Path | None, typer.Option("--file", exists=False, help="VLSM JSON input file.")
    ] = None,
    allow_point_to_point_31: Annotated[
        bool,
        typer.Option(
            "--allow-point-to-point-31", help="Allow explicit point-to-point /31s in JSON."
        ),
    ] = False,
    export_json_path: Annotated[
        Path | None, typer.Option("--export-json", help="Write a JSON report.")
    ] = None,
    export_csv_path: Annotated[
        Path | None, typer.Option("--export-csv", help="Write a CSV report.")
    ] = None,
    export_text_path: Annotated[
        Path | None, typer.Option("--export-text", help="Write a plain-text report.")
    ] = None,
    export_packet_tracer_path: Annotated[
        Path | None,
        typer.Option(
            "--export-packet-tracer",
            help="Write a review-required Packet Tracer configuration template.",
        ),
    ] = None,
    force: Annotated[
        bool, typer.Option("--force", help="Overwrite existing report files.")
    ] = False,
) -> None:
    """Calculate and optionally export a VLSM plan."""
    try:
        if file is not None and (network is not None or host):
            raise CalculatorValidationError("use either --file or --network with --host, not both")
        if file is not None:
            configuration = _load_configuration(file)
        else:
            if network is None or not host:
                raise CalculatorValidationError(
                    "provide --file, or provide --network and at least one --host"
                )
            configuration = VLSMInput(
                parent_network=network,
                allow_point_to_point_31=allow_point_to_point_31,
                segments=tuple(_parse_host(value) for value in host),
            )
        result = allocate_vlsm(configuration)
        console.print(_vlsm_table(result))
        console.print(allocation_map(result))
        stats = result.statistics
        console.print(
            f"Allocated {stats.total_allocated_addresses}/{stats.total_parent_addresses} addresses "
            f"({stats.utilization_percent:.2f}%); {stats.total_unused_addresses} unallocated."
        )
        for warning in result.warnings:
            console.print(f"[yellow]Security note:[/yellow] {warning}")
        exports = (
            (export_json_path, export_json),
            (export_csv_path, export_csv),
            (export_text_path, export_text),
            (export_packet_tracer_path, export_packet_tracer),
        )
        for path, exporter in exports:
            if path is not None:
                written = exporter(result, path, force=force)
                console.print(f"Exported: {written}")
    except (
        CalculatorValidationError,
        VLSMAllocationError,
        ExportError,
        PacketTracerTemplateError,
        ValidationError,
    ) as exc:
        _fail(ctx, exc)


@app.command(
    "packet-tracer",
    help="Generate a review-required Packet Tracer VLAN/SVI template from VLSM JSON.",
)
def packet_tracer(
    ctx: typer.Context,
    file: Annotated[Path, typer.Option("--file", help="VLSM JSON input file containing VLAN IDs.")],
    output: Annotated[
        Path | None,
        typer.Option("--output", help="Write the template to a UTF-8 text file."),
    ] = None,
    force: Annotated[
        bool, typer.Option("--force", help="Overwrite an existing template file.")
    ] = False,
) -> None:
    """Generate commands without connecting to or configuring any device."""
    try:
        result = allocate_vlsm(_load_configuration(file))
        if output is None:
            console.print(generate_packet_tracer_template(result), markup=False, highlight=False)
        else:
            written = export_packet_tracer(result, output, force=force)
            console.print(
                "[bold yellow]Review required:[/bold yellow] "
                f"Packet Tracer configuration template written to {written}"
            )
    except (
        CalculatorValidationError,
        VLSMAllocationError,
        ExportError,
        PacketTracerTemplateError,
        ValidationError,
    ) as exc:
        _fail(ctx, exc)


@app.command(help="Explain an IPv4 calculation in student-friendly language.")
def explain(
    ctx: typer.Context,
    address: Annotated[str, typer.Argument(help="IPv4 interface, such as 192.168.10.1/27.")],
) -> None:
    """Explain an IPv4 subnet result step by step."""
    try:
        console.print(explain_ipv4(analyze_ipv4(address)))
    except SubnetCalculationError as exc:
        _fail(ctx, exc)


@app.command("examples", help="Show ready-to-run command and segmentation examples.")
def show_examples() -> None:
    """Display example commands and defensive segmentation templates."""
    console.print(
        "[bold]Commands[/bold]\n"
        "  subnetcalc analyze 192.168.1.10/24\n"
        "  subnetcalc analyze 2001:db8::1/64\n"
        "  subnetcalc convert --prefix 26\n"
        '  subnetcalc vlsm --network 192.168.10.0/24 --host "Users:60" --host "Servers:30"\n'
        "  subnetcalc vlsm --file examples/security_zones.json\n\n"
        "  subnetcalc packet-tracer --file examples/small_office.json\n\n"
        "[bold]Educational segmentation templates[/bold]\n"
        "  Small office; university laboratory; DMZ; guest wireless; management; server; "
        "development/production; IoT isolation.\n\n"
        "Subnetting separates addresses logically. VLANs provide Layer 2 separation; routers, "
        "ACLs, and firewalls enforce policy. Identity, monitoring, patching, and endpoint "
        "security remain essential."
    )
