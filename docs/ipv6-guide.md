# IPv6 Guide

IPv6 addresses contain 128 bits written as eight hexadecimal groups. Leading
zeros in a group may be omitted, and one longest run of zero groups may be
compressed as `::`. Thus `2001:0db8:0000:0000:0000:0000:0000:0001` compresses
to `2001:db8::1`.

A prefix such as `/64` identifies the first 64 network bits and leaves 64
interface-identifier bits. A `/64` contains `2^64` addresses; IPv6 LAN design
normally uses `/64` even when far fewer addresses are expected. A `/48` can be
split into 65,536 `/64` networks.

IPv6 does not use an IPv4-style broadcast address. The calculator reports the
mathematical first and last address of the prefix, plus compressed and exploded
notation and classifications such as global, link-local, multicast, loopback,
unique-local/private, unspecified, reserved, or documentation.

`2001:db8::/32` is reserved for documentation. Do not use documentation examples
as globally routed production addressing. Automatic IPv6 prefix allocation is a
future feature; the current VLSM engine is intentionally IPv4-only.

