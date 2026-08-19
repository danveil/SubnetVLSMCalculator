"""Tests for domain validation helpers."""

from pathlib import Path

import pytest
from pydantic import ValidationError

from subnet_calculator.models import SegmentRequest, VLSMInput
from subnet_calculator.validators import (
    CalculatorValidationError,
    validate_output_path,
    validate_parent_network,
    validate_segments,
)


def test_valid_parent() -> None:
    assert str(validate_parent_network("10.0.0.0/8")) == "10.0.0.0/8"


def test_parent_rejects_host_bits() -> None:
    with pytest.raises(CalculatorValidationError, match="host bits"):
        validate_parent_network("10.0.0.1/24")


def test_parent_rejects_ipv6() -> None:
    with pytest.raises(CalculatorValidationError, match="IPv4"):
        validate_parent_network("2001:db8::/64")


def test_duplicate_names_case_insensitive() -> None:
    segments = (
        SegmentRequest(name="Users", required_hosts=2),
        SegmentRequest(name="users", required_hosts=3),
    )
    with pytest.raises(CalculatorValidationError, match="duplicate segment"):
        validate_segments(segments)


def test_duplicate_vlan() -> None:
    segments = (
        SegmentRequest(name="Users", required_hosts=2, vlan_id=10),
        SegmentRequest(name="Servers", required_hosts=3, vlan_id=10),
    )
    with pytest.raises(CalculatorValidationError, match="duplicate VLAN"):
        validate_segments(segments)


def test_empty_segments() -> None:
    with pytest.raises(CalculatorValidationError, match="at least one"):
        validate_segments(())


def test_import_models_reject_unknown_fields() -> None:
    with pytest.raises(ValidationError, match="Extra inputs are not permitted"):
        SegmentRequest.model_validate(
            {"name": "Users", "required_hosts": 20, "unexpected": "value"}
        )
    with pytest.raises(ValidationError, match="Extra inputs are not permitted"):
        VLSMInput.model_validate(
            {
                "parent_network": "192.168.1.0/24",
                "segments": [{"name": "Users", "required_hosts": 20}],
                "unexpected": "value",
            }
        )


def test_safe_output_path() -> None:
    assert validate_output_path(Path("report.json")) == Path("report.json")


def test_unsafe_output_path() -> None:
    with pytest.raises(CalculatorValidationError, match="unsafe"):
        validate_output_path(Path("bad?.json"))
