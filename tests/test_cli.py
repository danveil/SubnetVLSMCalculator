"""CLI integration tests."""

import json
from pathlib import Path

from typer.testing import CliRunner

from subnet_calculator.cli import app

runner = CliRunner()


def test_help() -> None:
    result = runner.invoke(app, ["--help"])
    assert result.exit_code == 0
    assert "analyze" in result.stdout
    assert "vlsm" in result.stdout


def test_version() -> None:
    result = runner.invoke(app, ["--version"])
    assert result.exit_code == 0
    assert "0.1.0" in result.stdout


def test_analyze_ipv4() -> None:
    result = runner.invoke(app, ["analyze", "192.168.1.10/24"])
    assert result.exit_code == 0
    assert "192.168.1.0/24" in result.stdout
    assert "Network bits: 24" in result.stdout


def test_analyze_with_mask() -> None:
    result = runner.invoke(app, ["analyze", "172.16.5.10", "--mask", "255.255.255.0"])
    assert result.exit_code == 0
    assert "172.16.5.0/24" in result.stdout


def test_analyze_ipv6() -> None:
    result = runner.invoke(app, ["analyze", "2001:db8::1/64"])
    assert result.exit_code == 0
    assert "2001:db8::/64" in result.stdout


def test_analyze_invalid() -> None:
    result = runner.invoke(app, ["analyze", "999.1.1.1/24"])
    assert result.exit_code == 2
    assert "Error:" in result.stderr
    assert "Traceback" not in result.stderr


def test_convert_prefix() -> None:
    result = runner.invoke(app, ["convert", "--prefix", "26"])
    assert result.exit_code == 0
    assert "255.255.255.192" in result.stdout
    assert "0.0.0.63" in result.stdout


def test_convert_mask() -> None:
    result = runner.invoke(app, ["convert", "--mask", "255.255.255.192"])
    assert result.exit_code == 0
    assert "/26" in result.stdout


def test_convert_requires_one_input() -> None:
    result = runner.invoke(app, ["convert"])
    assert result.exit_code == 2
    assert "exactly one" in result.stderr


def test_vlsm_inline() -> None:
    result = runner.invoke(
        app,
        ["vlsm", "--network", "192.168.10.0/24", "--host", "Users:60", "--host", "Servers:30"],
    )
    assert result.exit_code == 0
    assert "192.168.10.0/26" in result.stdout
    assert "192.168.10.64/27" in result.stdout
    assert "Security note" in result.stdout


def test_vlsm_file_and_exports(tmp_path: Path) -> None:
    input_path = tmp_path / "input.json"
    input_path.write_text(
        json.dumps(
            {
                "parent_network": "10.0.0.0/24",
                "segments": [{"name": "Users", "required_hosts": 30}],
            }
        ),
        encoding="utf-8",
    )
    json_path = tmp_path / "out.json"
    csv_path = tmp_path / "out.csv"
    result = runner.invoke(
        app,
        [
            "vlsm",
            "--file",
            str(input_path),
            "--export-json",
            str(json_path),
            "--export-csv",
            str(csv_path),
        ],
    )
    assert result.exit_code == 0
    assert json_path.exists()
    assert csv_path.exists()


def test_vlsm_invalid_json(tmp_path: Path) -> None:
    path = tmp_path / "bad.json"
    path.write_text("{broken", encoding="utf-8")
    result = runner.invoke(app, ["vlsm", "--file", str(path)])
    assert result.exit_code == 2
    assert "invalid JSON" in result.stderr


def test_explain() -> None:
    result = runner.invoke(app, ["explain", "192.168.1.10/26"])
    assert result.exit_code == 0
    assert "block size of 64" in result.stdout
    assert "192.168.1.63" in result.stdout


def test_examples() -> None:
    result = runner.invoke(app, ["examples"])
    assert result.exit_code == 0
    assert "IoT isolation" in result.stdout
    assert "firewalls enforce policy" in result.stdout


def test_packet_tracer_template_command() -> None:
    result = runner.invoke(app, ["packet-tracer", "--file", "examples/small_office.json"])
    assert result.exit_code == 0
    assert "CONFIGURATION TEMPLATE - REVIEW REQUIRED" in result.stdout
    assert "interface vlan 10" in result.stdout
    assert " ip address 192.168.10.1 255.255.255.192" in result.stdout


def test_packet_tracer_template_export(tmp_path: Path) -> None:
    output = tmp_path / "packet-tracer.txt"
    result = runner.invoke(
        app,
        [
            "packet-tracer",
            "--file",
            "examples/small_office.json",
            "--output",
            str(output),
        ],
    )
    assert result.exit_code == 0
    assert "Review required" in result.stdout
    assert "END TEMPLATE" in output.read_text(encoding="utf-8")
