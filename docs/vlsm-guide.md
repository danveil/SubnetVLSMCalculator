# VLSM Guide

## Why VLSM exists

Equal-sized subnets waste addresses when departments have different needs.
Variable Length Subnet Masking selects the smallest suitable power-of-two block
for each segment, allowing a `/26`, `/27`, and `/28` to coexist in one parent.

## Largest-to-smallest allocation

Requirements are sorted from largest to smallest. Large blocks have stricter
boundaries; placing them first prevents small early allocations from fragmenting
the space. Equal-sized requirements retain their input order and names.

## Prefix selection and boundary alignment

For a traditional IPv4 LAN, add network and broadcast reservations to the host
requirement, round up to a power of two, and convert the result to a prefix.
Sixty hosts need 62 addresses, so the next power of two is 64: a `/26`.
Every `/26` must begin at a multiple-of-64 boundary. Explicit RFC 3021 links may
use a `/31` when both the input and calculator option request that behavior.

## Worked office example

Parent: `192.168.10.0/24`

| Segment | Hosts | Chosen block | Allocation |
|---|---:|---:|---|
| Users | 60 | 64 addresses | `192.168.10.0/26` |
| Servers | 30 | 32 addresses | `192.168.10.64/27` |
| Management | 12 | 16 addresses | `192.168.10.96/28` |
| Guest | 10 | 16 addresses | `192.168.10.112/28` |
| Point-to-point | 2 | 4 normally, or 2 explicitly | `/30` or enabled `/31` |

The calculator verifies containment and pairwise non-overlap, then summarizes all
unused intervals into valid CIDRs.

## Common mistakes

- Allocating in input order rather than largest-first
- Starting a block on an invalid boundary
- Forgetting network/broadcast reservations on ordinary `/30` and shorter prefixes
- Treating every two-host LAN as an RFC 3021 point-to-point link
- Supplying a parent with host bits set, such as `192.168.10.1/24`
- Confusing allocated-address utilization with requested-host efficiency
- Assuming a subnet or VLAN alone enforces a security policy

