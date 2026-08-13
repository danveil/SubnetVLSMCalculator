"""Tests for report exporters."""

import csv
import json
from pathlib import Path

import pytest

from subnet_calculator.exporters import ExportError, export_csv, export_json, export_text
from subnet_calculator.models import SegmentRequest, VLSMInput
from subnet_calculator.vlsm import allocate_vlsm


@pytest.fixture
def result():  # type: ignore[no-untyped-def]
    return allocate_vlsm(
        VLSMInput(
            parent_network="192.168.50.0/24",
            segments=(SegmentRequest(name="Users", required_hosts=60, vlan_id=10),),
        )
    )


def test_json_export_contains_metadata(tmp_path: Path, result) -> None:  # type: ignore[no-untyped-def]
    path = export_json(result, tmp_path / "report.json")
    payload = json.loads(path.read_text(encoding="utf-8"))
    assert payload["version"] == "0.1.0"
    assert payload["generated_at"].endswith("+00:00")
    assert payload["input_configuration"]["segments"][0]["name"] == "Users"
    assert payload["statistics"]["total_requested_hosts"] == 60


def test_csv_export_contains_allocation(tmp_path: Path, result) -> None:  # type: ignore[no-untyped-def]
    path = export_csv(result, tmp_path / "report.csv")
    with path.open(encoding="utf-8", newline="") as stream:
        rows = list(csv.DictReader(stream))
    assert rows[0]["segment"] == "Users"
    assert rows[0]["cidr"] == "192.168.50.0/26"
    assert rows[0]["version"] == "0.1.0"


def test_text_export(tmp_path: Path, result) -> None:  # type: ignore[no-untyped-def]
    content = export_text(result, tmp_path / "report.txt").read_text(encoding="utf-8")
    assert "Users: 192.168.50.0/26" in content
    assert "Warnings:" in content


@pytest.mark.parametrize(
    "exporter,suffix", [(export_json, "json"), (export_csv, "csv"), (export_text, "txt")]
)
def test_refuses_overwrite(tmp_path: Path, result, exporter, suffix: str) -> None:  # type: ignore[no-untyped-def]
    path = tmp_path / f"report.{suffix}"
    exporter(result, path)
    with pytest.raises(ExportError, match="--force"):
        exporter(result, path)


def test_force_overwrites(tmp_path: Path, result) -> None:  # type: ignore[no-untyped-def]
    path = tmp_path / "report.json"
    path.write_text("old", encoding="utf-8")
    export_json(result, path, force=True)
    assert json.loads(path.read_text(encoding="utf-8"))["application"] == "SubnetVLSMCalculator"


def test_missing_output_directory(result, tmp_path: Path) -> None:  # type: ignore[no-untyped-def]
    with pytest.raises(ExportError, match="directory does not exist"):
        export_json(result, tmp_path / "missing" / "report.json")
