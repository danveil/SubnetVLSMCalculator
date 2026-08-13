"""Tests for review-required Packet Tracer configuration templates."""

from pathlib import Path

import pytest

from subnet_calculator.exporters import ExportError, export_packet_tracer
from subnet_calculator.models import SegmentRequest, VLSMInput, VLSMResult
from subnet_calculator.packet_tracer import (
    REVIEW_WARNING,
    PacketTracerTemplateError,
    generate_packet_tracer_template,
)
from subnet_calculator.vlsm import allocate_vlsm


def _result(*segments: SegmentRequest) -> VLSMResult:
    return allocate_vlsm(VLSMInput(parent_network="192.168.10.0/24", segments=segments))


def test_generates_vlan_and_svi_template() -> None:
    result = _result(
        SegmentRequest(
            name="Employee Users",
            required_hosts=60,
            description="Corporate workstations",
            vlan_id=10,
        )
    )
    template = generate_packet_tracer_template(result)
    assert template.count(REVIEW_WARNING) == 2
    assert "vlan 10\n name EMPLOYEE_USERS" in template
    assert "interface vlan 10" in template
    assert " ip address 192.168.10.1 255.255.255.192" in template
    assert " no shutdown" in template


def test_skips_segment_without_vlan_and_explains_why() -> None:
    result = _result(
        SegmentRequest(name="Users", required_hosts=30, vlan_id=10),
        SegmentRequest(name="Transit", required_hosts=2),
    )
    template = generate_packet_tracer_template(result)
    assert "SKIPPED: Transit has no VLAN ID" in template
    assert template.count("interface vlan") == 1


def test_untrusted_description_cannot_inject_config_lines() -> None:
    result = _result(
        SegmentRequest(
            name="Users\ninterface loopback 99",
            required_hosts=10,
            description="Office\nexit\nreload",
            vlan_id=20,
        )
    )
    template = generate_packet_tracer_template(result)
    assert "\ninterface loopback 99\n" not in template
    assert "\nreload\n" not in template
    assert "description TEMPLATE - Office exit reload" in template


def test_requires_at_least_one_vlan() -> None:
    result = _result(SegmentRequest(name="Transit", required_hosts=2))
    with pytest.raises(PacketTracerTemplateError, match="no segment has a VLAN ID"):
        generate_packet_tracer_template(result)


def test_export_refuses_overwrite(tmp_path: Path) -> None:
    result = _result(SegmentRequest(name="Users", required_hosts=30, vlan_id=10))
    output = export_packet_tracer(result, tmp_path / "packet-tracer.txt")
    assert REVIEW_WARNING in output.read_text(encoding="utf-8")
    with pytest.raises(ExportError, match="--force"):
        export_packet_tracer(result, output)
