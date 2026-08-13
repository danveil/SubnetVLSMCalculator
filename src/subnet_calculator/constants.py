"""Application-wide constants."""

from ipaddress import IPv4Network, IPv6Network

APPLICATION_NAME = "SubnetVLSMCalculator"
APPLICATION_VERSION = "0.1.0"
IPV4_DOCUMENTATION_NETWORKS = (
    IPv4Network("192.0.2.0/24"),
    IPv4Network("198.51.100.0/24"),
    IPv4Network("203.0.113.0/24"),
)
IPV6_DOCUMENTATION_NETWORK = IPv6Network("2001:db8::/32")
MIN_VLAN_ID = 1
MAX_VLAN_ID = 4094
