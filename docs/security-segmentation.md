# Security Segmentation

## Subnets, zones, and VLANs

Subnets provide logical Layer 3 address separation. Security-zone labels document
intended trust relationships. VLANs provide Layer 2 broadcast-domain separation,
but a VLAN ID is not itself an access-control policy. Map each zone deliberately
to addressing, switching, routing, and enforcement controls.

## Inter-VLAN routing and firewall enforcement

Traffic between VLANs requires a router or Layer 3 switch. Place ACL or firewall
policy at that boundary and default to only the flows that business services
need. Log meaningful denies and regularly review stale rules. Subnetting alone
does not stop traffic when routing permits it.

## Defensive templates

- **Small office:** separate employee, server, voice, guest, and management networks.
- **University laboratory:** separate student experiments from staff, research data,
  instrumentation, and campus administrative systems.
- **DMZ:** expose only necessary public-service ports; tightly restrict DMZ-to-internal flows.
- **Guest wireless:** allow internet access while denying private and management ranges.
- **Management:** restrict device administration to approved identities and hardened endpoints.
- **Server:** group workloads by sensitivity and required east-west communication.
- **Development/production:** prevent development identities and pipelines from receiving
  implicit production access.
- **IoT isolation:** contain devices with limited patchability and permit only required brokers,
  DNS, time, and update destinations.

## DMZs, management, and guest isolation

A DMZ reduces direct reachability between internet-facing services and internal
assets. A management network should not be general-purpose user space. Guest
isolation needs wireless client isolation, routing/firewall rules, DNS protections,
and monitoring—not merely a differently named subnet.

## Zero-trust context

Network location is one signal, not proof of trust. Identity-aware authorization,
device posture, least privilege, encryption, and continuous monitoring complement
network segmentation. Patch management, secure configuration, backups, and
endpoint detection remain necessary.

## Limitations

This calculator creates an address plan; it does not configure switches, routers,
ACLs, or firewalls and does not verify live enforcement. Validate the plan against
availability, redundancy, routing, logging, identity, and incident-response needs.

