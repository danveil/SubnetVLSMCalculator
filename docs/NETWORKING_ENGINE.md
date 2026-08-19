# TypeScript networking engine

The web engine lives in `web/src/lib/networking`. It uses unsigned numeric
arithmetic instead of JavaScript bitwise operators, which coerce values to signed
32-bit integers and can produce surprising negative results for high IPv4
addresses. Every IPv4 integer remains within JavaScript's exact integer range.

## CIDR mathematics

An IPv4 address has 32 bits. A prefix `/p` leaves `32 - p` host bits, so its
block contains `2^(32-p)` addresses. The network boundary is:

```text
floor(ipInteger / blockSize) * blockSize
```

The broadcast is `network + blockSize - 1`. A mask contains `p` one-bits followed
by zero-bits. Its wildcard is the per-octet complement of that mask.

Traditional subnets from `/0` through `/30` reserve network and broadcast, so
usable capacity is `total - 2`. RFC 3021 `/31` point-to-point links use both
addresses. A `/32` represents one host route. The returned explanations state
these semantics rather than silently applying the traditional subtraction.

## Strict parsing

`validation.ts` and `cidr.ts` reject missing octets, non-decimal syntax, leading
zero ambiguity, octets outside 0–255, prefixes outside 0–32, empty names,
duplicates, and non-positive host requirements. A CIDR containing host bits is
normalized for an individual calculation, but a VLSM parent must already be a
network boundary so accidental parent changes are never silent.

## VLSM algorithm

1. Validate the parent and every requirement.
2. Convert each host need to the smallest valid power-of-two block.
3. Sort largest block first, using original position as a stable tie-breaker.
4. Align the cursor to the block boundary.
5. Reject any allocation whose end exceeds the parent broadcast.
6. Create complete subnet fields and advance to the next address.
7. Derive utilization metrics from the completed allocations.

For 500 traditional hosts, 502 addresses are needed. The next power of two is
512 (`2^9`), leaving `32 - 9 = /23`. A point-to-point requirement may explicitly
select `/31`; otherwise a two-host requirement receives `/30`.

## Metrics

- **Parent addresses:** every address in the parent block.
- **Allocated addresses:** full sizes of all allocated blocks.
- **Unallocated addresses:** parent addresses minus allocated addresses.
- **Requested hosts:** sum of the user's requirements.
- **Usable allocated capacity:** sum of each subnet's usable host capacity.
- **Wasted usable capacity:** usable capacity minus requested hosts.
- **Address-space utilization:** allocated addresses divided by parent addresses.
- **Allocation efficiency:** requested hosts divided by usable allocated capacity.

## Additional tools

`overlap.ts` compares inclusive integer ranges and reports the exact intersection.
`membership.ts` calculates the network once and checks whether an IP lies between
its network and broadcast. `assignments.ts` rejects network/broadcast assignments,
out-of-subnet gateways or hosts, and duplicate assigned IPs. `csv.ts` performs
RFC-style quoting for commas, quotes, and newlines.

The allocation map is deliberately a visualization only. It consumes a
`VlsmPlan` and cannot alter calculations.

## Verification

Run `pnpm test:coverage` in `web/`. The threshold requires at least 90% statements
and lines, 85% branches, and 90% functions across the networking engine. Known
examples include `/0`, `/8`, `/16`, `/24`–`/32`, exact-fit and insufficient VLSM,
duplicate requirements, overlap, membership, assignments, and CSV quoting.
