"""Tests for mask and prefix conversions."""

import pytest

from subnet_calculator.converters import (
    ConversionError,
    mask_to_prefix,
    prefix_to_mask,
    prefix_to_wildcard,
    wildcard_to_mask,
)


@pytest.mark.parametrize(
    ("prefix", "mask"),
    [
        (0, "0.0.0.0"),
        (8, "255.0.0.0"),
        (24, "255.255.255.0"),
        (26, "255.255.255.192"),
        (32, "255.255.255.255"),
    ],
)
def test_prefix_mask_round_trip(prefix: int, mask: str) -> None:
    assert prefix_to_mask(prefix) == mask
    assert mask_to_prefix(mask) == prefix


def test_prefix_to_wildcard() -> None:
    assert prefix_to_wildcard(26) == "0.0.0.63"


def test_wildcard_to_mask() -> None:
    assert wildcard_to_mask("0.0.0.63") == "255.255.255.192"


@pytest.mark.parametrize("prefix", [-1, 33, True])
def test_invalid_prefix(prefix: int) -> None:
    with pytest.raises(ConversionError, match="0 through 32"):
        prefix_to_mask(prefix)


@pytest.mark.parametrize("mask", ["255.0.255.0", "255.255.255.1", "garbage", ""])
def test_invalid_noncontiguous_mask(mask: str) -> None:
    with pytest.raises(ConversionError, match="contiguous"):
        mask_to_prefix(mask)


def test_invalid_wildcard() -> None:
    with pytest.raises(ConversionError, match="invalid wildcard"):
        wildcard_to_mask("not-a-mask")


def test_noncontiguous_wildcard() -> None:
    with pytest.raises(ConversionError, match="contiguous"):
        wildcard_to_mask("0.255.0.255")
