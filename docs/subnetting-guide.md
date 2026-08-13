# IPv4 Subnetting Guide

## Address structure and binary notation

An IPv4 address contains 32 bits displayed as four decimal octets. For example,
`192.168.1.10` is `11000000.10101000.00000001.00001010` in binary. Each bit has
a place value from 128 down to 1.

## Network bits, host bits, and CIDR

CIDR notation writes the number of leading network bits after a slash. `/24`
means 24 network bits and 8 host bits. Devices in the same subnet share the
network-bit values. Modern routing is classless; historical A, B, and C classes
are useful only as background vocabulary.

## Subnet and wildcard masks

A subnet mask has contiguous one-bits followed by zero-bits. `/26` is
`11111111.11111111.11111111.11000000`, or `255.255.255.192`. A wildcard mask is
its bitwise inverse, so the `/26` wildcard is `0.0.0.63`. A pattern such as
`255.0.255.0` is not a valid subnet mask because its one-bits are not contiguous.

## Network, broadcast, and usable hosts

The network address sets every host bit to zero. The traditional IPv4 broadcast
sets every host bit to one. For prefixes `/0` through `/30`, ordinary LAN host
ranges exclude those two addresses, so the traditional usable count is
`2^host_bits - 2`.

### /31 and /32 behavior

RFC 3021 permits both addresses in a `/31` on a point-to-point link; subtracting
two would incorrectly produce zero capacity. A `/32` is a single-host route. It
identifies one address and has no ordinary multi-host range.

## Worked `/26` example

For `192.168.1.10/26`:

1. `/26` leaves six host bits, giving `2^6 = 64` addresses per block.
2. The last mask octet is 192, and `256 - 192 = 64` confirms the block size.
3. Last-octet blocks begin at 0, 64, 128, and 192.
4. Address 10 lies in the 0-63 block.
5. The network is `192.168.1.0`, broadcast is `192.168.1.63`, and the traditional
   usable range is `192.168.1.1-192.168.1.62` (62 hosts).

For `10.20.0.0/16`, 16 host bits yield 65,536 addresses and 65,534 traditional
usable hosts, from `10.20.0.1` through `10.20.255.254`.

