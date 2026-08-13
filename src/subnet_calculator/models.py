"""Validated, serializable data models used by calculation and presentation layers."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, field_validator

from subnet_calculator.constants import MAX_VLAN_ID, MIN_VLAN_ID


class ImmutableModel(BaseModel):
    """Base for immutable calculation results."""

    model_config = ConfigDict(frozen=True)


class IPv4Analysis(ImmutableModel):
    """Complete analysis of one IPv4 interface and its containing network."""

    input_address: str
    normalized_network: str
    ip_version: int = 4
    network_address: str
    broadcast_address: str
    subnet_mask: str
    wildcard_mask: str
    prefix_length: int
    total_addresses: int
    usable_host_count: int
    first_usable_host: str | None
    last_usable_host: str | None
    is_network_address: bool
    is_broadcast_address: bool
    address_class: str
    classifications: tuple[str, ...]
    binary_ip: str
    binary_subnet_mask: str
    network_bits: int
    host_bits: int
    previous_subnet: str | None
    next_subnet: str | None
    special_use_explanation: str | None = None


class IPv6Analysis(ImmutableModel):
    """Complete analysis of one IPv6 interface and its containing network."""

    input_address: str
    normalized_network: str
    ip_version: int = 6
    prefix_length: int
    total_addresses: int
    first_address: str
    last_address: str
    classifications: tuple[str, ...]
    exploded_address: str
    compressed_address: str
    network_bits: int
    host_bits: int
    suggested_64_subnets: int | None
    suggested_64_note: str


class SegmentRequest(BaseModel):
    """One requested VLSM segment."""

    model_config = ConfigDict(frozen=True, str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=100)
    required_hosts: int = Field(gt=0)
    description: str = ""
    vlan_id: int | None = Field(default=None, ge=MIN_VLAN_ID, le=MAX_VLAN_ID)
    security_zone: str = ""
    point_to_point: bool = False

    @field_validator("name")
    @classmethod
    def name_must_not_be_blank(cls, value: str) -> str:
        """Reject names containing only whitespace."""
        if not value:
            raise ValueError("segment name must not be blank")
        return value


class VLSMInput(BaseModel):
    """Validated VLSM input configuration."""

    model_config = ConfigDict(frozen=True)

    parent_network: str
    allow_point_to_point_31: bool = False
    segments: tuple[SegmentRequest, ...] = Field(min_length=1)


class VLSMAllocation(ImmutableModel):
    """Calculated allocation for one segment."""

    segment: str
    description: str
    vlan_id: int | None
    security_zone: str
    required_hosts: int
    allocated_capacity: int
    cidr: str
    subnet_mask: str
    network_address: str
    first_usable: str
    last_usable: str
    broadcast_address: str
    wildcard_mask: str
    wasted_addresses: int


class VLSMStatistics(ImmutableModel):
    """Aggregate VLSM allocation statistics."""

    total_parent_addresses: int
    total_allocated_addresses: int
    total_requested_hosts: int
    total_reserved_addresses: int
    total_unused_addresses: int
    utilization_percent: float


class VLSMResult(ImmutableModel):
    """A complete VLSM allocation result."""

    parent_network: str
    input_configuration: VLSMInput
    allocations: tuple[VLSMAllocation, ...]
    remaining_networks: tuple[str, ...]
    remaining_ranges: tuple[str, ...]
    statistics: VLSMStatistics
    warnings: tuple[str, ...] = ()
