# SubnetVLSMCalculator

[![CI](https://img.shields.io/badge/CI-configured-blue)](#testing)
[![Python](https://img.shields.io/badge/Python-3.12%2B-3776AB)](https://www.python.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![Coverage](https://img.shields.io/badge/coverage-90%25%2B-brightgreen)](#testing)

SubnetVLSMCalculator is a professional, offline command-line application for
IPv4 and IPv6 analysis, mask conversion, and safe Variable Length Subnet Mask
(VLSM) planning. It uses Python's `ipaddress` module as its calculation source of
truth and combines typed domain logic with Typer, Rich, Pydantic, and an extensive
automated test suite.

## Portfolio relevance

This project demonstrates practical network engineering, security-zone design,
Python `src`-layout architecture, immutable validated models, defensive file I/O,
cross-platform packaging, CLI usability, static analysis, CI, and technical writing.
It performs calculations only: it does not scan networks or contact remote systems.

## Features

- Full IPv4 interface analysis including /31 and /32 behavior
- IPv6 normalization, classification, address range, and /64 guidance
- CIDR, dotted subnet mask, and wildcard conversions with contiguous-bit validation
- Stable largest-first VLSM allocation with overlap and containment assertions
- VLAN, security-zone, description, and explicit point-to-point metadata
- Remaining ranges, allocation efficiency, waste, and reserved-address statistics
- Rich tables, ASCII allocation trees, and binary boundary visualizations
- Beginner-friendly explanation mode
- JSON, CSV, and text reports with timestamps, inputs, warnings, and version metadata
- Review-required Cisco Packet Tracer VLAN and SVI configuration templates
- No telemetry, external requests, scanning, exploitation, or credential functionality

## Screenshots

Screenshot placeholders are kept in `screenshots/`. Suggested captures:

1. `subnetcalc analyze 192.168.1.10/26`
2. `subnetcalc analyze 2001:db8::1/64`
3. `subnetcalc vlsm --file examples/security_zones.json`
4. `subnetcalc explain 192.168.1.10/26`

## Installation

Python 3.12 or newer is required. See [PREPARATION.md](PREPARATION.md) for Windows
installation and verification details.

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# Linux/macOS: source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -e ".[dev]"
subnetcalc --help
```

## Quick start

```bash
subnetcalc analyze 192.168.1.10/24
subnetcalc analyze 172.16.5.10 --mask 255.255.255.0
subnetcalc analyze 2001:db8::1/64
subnetcalc convert --prefix 26
subnetcalc convert --mask 255.255.255.192
subnetcalc explain 192.168.10.1/27
subnetcalc packet-tracer --file examples/small_office.json
subnetcalc examples
```

### Individual subnet calculation

`subnetcalc analyze 192.168.1.10/26` normalizes the network to
`192.168.1.0/26`, displays the `.0` network address, `.63` broadcast, `.1-.62`
traditional host range, binary address/mask, classification, and adjacent `/26`s.

### VLSM calculation

```bash
subnetcalc vlsm --network 192.168.10.0/24 \
  --host "Users:60" --host "Servers:30" --host "Management:12"
```

On PowerShell, put the command on one line or use the PowerShell backtick instead
of the Unix backslash.

### JSON input

```json
{
  "parent_network": "192.168.10.0/24",
  "allow_point_to_point_31": false,
  "segments": [
    {
      "name": "Employee Users",
      "required_hosts": 60,
      "description": "Corporate user workstations",
      "vlan_id": 10,
      "security_zone": "trusted"
    }
  ]
}
```

Run it with `subnetcalc vlsm --file examples/small_office.json`.

### Exports

```bash
subnetcalc vlsm --file examples/security_zones.json --export-json report.json
subnetcalc vlsm --file examples/campus_departments.json --export-csv report.csv
subnetcalc vlsm --file examples/small_office.json --export-text report.txt
```

Existing files are refused unless `--force` is supplied. Reports use UTF-8 and
include the version, UTC generation time, complete inputs and results, warnings,
and statistics.

### Packet Tracer configuration templates

Generate Cisco-style VLAN and switched virtual interface (SVI) commands from a
VLSM JSON plan containing VLAN IDs:

```bash
subnetcalc packet-tracer --file examples/small_office.json
subnetcalc packet-tracer --file examples/small_office.json \
  --output packet-tracer-template.txt
subnetcalc vlsm --file examples/small_office.json \
  --export-packet-tracer packet-tracer-template.txt
```

Generated content is prominently labelled **configuration template - review
required**. It is never sent to a device. Review interface roles, gateway
addresses, VLAN identifiers, routing, ACLs, firewall policy, and platform syntax
before manually adapting any commands. Segments without VLAN IDs are skipped and
identified in comments.

## Subnetting and VLSM

Subnetting divides an IP network by borrowing host bits for a longer prefix. A
`/26`, for example, leaves six host bits and therefore creates blocks of 64
addresses. VLSM assigns different prefix sizes to different requirements, which
reduces waste. Allocating largest blocks first preserves alignment and leaves
smaller gaps usable. See [the subnetting guide](docs/subnetting-guide.md) and
[the VLSM guide](docs/vlsm-guide.md).

## Security segmentation relevance

Subnets give systems logical address separation, while VLANs provide Layer 2
segmentation. Routers, ACLs, and firewalls must enforce traffic restrictions.
Subnetting alone is not complete security: identity, monitoring, patching, secure
configuration, and endpoint controls are still required. See
[security segmentation](docs/security-segmentation.md).

## Architecture

Calculation modules return immutable Pydantic result models and know nothing about
Rich or terminal formatting. The CLI orchestrates validators, engines,
visualizations, and exporters. See [architecture.md](docs/architecture.md).

## Testing

```bash
ruff format --check .
ruff check .
mypy src/subnet_calculator
pytest --cov=subnet_calculator --cov-report=term-missing
```

The suite covers standard prefixes, special addresses, invalid masks and inputs,
IPv6, VLSM ordering/alignment/safety, exports, and CLI success/error behavior.

## Limitations

- IPv4 VLSM is sequential and largest-first; fixed/pre-reserved blocks are not yet supported.
- CLI `--host` accepts `NAME:COUNT`; richer metadata uses JSON input.
- IPv6 analysis is supported, but automatic IPv6 prefix delegation is not yet implemented.
- Packet Tracer output covers VLAN and SVI basics only; it is not a complete deployable config.
- Classful A/B/C labels are educational only and have no role in modern routing.

## Ethical and educational use

This project is for legitimate network design, learning, and defensive planning.
It does not discover hosts, send packets, bypass controls, exploit systems, or
perform unauthorized network activity.

## Roadmap

- IPv6 prefix-delegation planner
- Reserved-block and fixed-address support
- YAML input as an optional extra
- HTML reports and accessibility-tested terminal themes
- Internationalized explanation content

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Bug reports, calculation edge cases,
documentation improvements, and tests are welcome.

## License

Released under the [MIT License](LICENSE).
