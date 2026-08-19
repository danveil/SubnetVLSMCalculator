# SubnetVLSMCalculator

[![CI](https://img.shields.io/badge/CI-configured-blue)](#testing)
[![Python](https://img.shields.io/badge/Python-3.12%E2%80%933.14-3776AB)](https://www.python.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![Coverage](https://img.shields.io/badge/coverage-90%25%2B-brightgreen)](#testing)

This repository now contains two working products. **SubnetForge** is the new
anonymous-first Next.js network-address-planning workspace, while the original
**SubnetVLSMCalculator** remains a professional offline Python CLI for IPv4/IPv6,
mask conversion, reports, and Packet Tracer templates. The migration is
incremental: proven CLI functionality stays available while the browser product
gains a separately tested TypeScript engine.

The temporary SubnetForge name is isolated in `web/src/config/brand.ts`, so it can
be changed without searching through calculation code.

## SubnetForge web application

The current standalone release includes:

- strict IPv4 subnet analysis with correct `/0`, RFC 3021 `/31`, and `/32` behavior;
- a largest-first, boundary-aligned VLSM editor with add, edit, delete, duplicate,
  reorder, clear, and example actions;
- address-space and allocation-efficiency metrics with precise definitions;
- a proportional subnet map, responsive result table, copy helpers, and CSV export;
- overlap detection, subnet-membership checks, and optional educational working;
- a user-entered device/interface addressing table that checks range, reserved
  addresses, gateways, and duplicate assignments;
- no login wall, telemetry, cloud calculation API, fake persistence, or fake billing.

Authentication, project storage, sharing, and Stripe are deliberately labeled as
future phases. See [the roadmap](docs/ROADMAP.md).

### Web stack and setup

- Next.js 16, React 19, and TypeScript 6
- Tailwind CSS 4 with a small custom technical design system
- Vitest, Testing Library, ESLint, Prettier, and pnpm
- Supabase PostgreSQL/Auth and Vercel planned for later phases

Install Node.js 24 and pnpm 11, then run:

```powershell
cd web
pnpm install --frozen-lockfile
Copy-Item ..\.env.example .env.local
pnpm dev
```

Visit `http://localhost:3000`. The subnet calculator, VLSM planner, overlap tool,
membership checker, explanations, map, addressing validation, and CSV export all
work without an account or configured service.

### Environment variables

`.env.example` is the safe contract. `NEXT_PUBLIC_APP_URL` is the only currently
useful value. Supabase and Stripe variables are empty and deferred; do not create
real credentials until those phases begin. Never commit `.env`, `.env.local`, a
Supabase service-role key, Stripe secret, password, token, or webhook secret.

### Web development commands

```powershell
cd web
pnpm dev             # local development server
pnpm lint            # ESLint
pnpm typecheck       # TypeScript without emission
pnpm test            # unit and rendered workflow tests
pnpm test:coverage   # networking coverage thresholds
pnpm format:check    # Prettier verification
pnpm build           # optimized production build
```

Detailed design references:

- [Architecture](docs/ARCHITECTURE.md) — preserved CLI and new web boundaries
- [Networking engine](docs/NETWORKING_ENGINE.md)
- [Future database and RLS](docs/DATABASE.md)
- [Security and privacy](docs/SECURITY.md)
- [Local development and Vercel](docs/DEPLOYMENT.md)
- [Roadmap](docs/ROADMAP.md)

## Portfolio relevance

This project demonstrates practical network engineering, security-zone design,
Python `src`-layout architecture, immutable validated models, defensive file I/O,
cross-platform packaging, CLI usability, static analysis, CI, and technical writing.
It performs calculations only: it does not scan networks or contact remote systems.

## Features

- Browser-based SubnetForge IPv4/VLSM workspace with local deterministic calculations
- Overlap analysis, membership checking, visual allocation map, and CSV export
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

Python 3.12 through 3.14 is supported. See [PREPARATION.md](PREPARATION.md) for
Windows installation and verification details.

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

The Python calculation modules return immutable Pydantic models and know nothing
about Rich terminal formatting. The web application follows the same separation:
pure functions in `web/src/lib/networking` know nothing about React. Interactive
features own browser state and render typed engine results. See the combined
[cross-product architecture](docs/ARCHITECTURE.md).

## Testing

Web quality gate:

```bash
cd web
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm build
```

Python CLI quality gate:

```bash
ruff format --check .
ruff check .
mypy src/subnet_calculator
pytest --cov=subnet_calculator --cov-report=term-missing
```

The suites cover standard prefixes, special addresses, invalid masks and inputs,
IPv6 CLI behavior, TypeScript IPv4 edge cases, VLSM ordering/alignment/safety,
overlap, membership, assignments, exports, and rendered anonymous workflows.

## Supabase and deployment status

Supabase is not required or connected yet. Its proposed private-project schema,
ownership rules, and RLS tests are documented in [DATABASE.md](docs/DATABASE.md).
When persistence is implemented, Vercel deployment uses `web` as the project root;
see [DEPLOYMENT.md](docs/DEPLOYMENT.md). Stripe comes only after authenticated
persistence and cross-user authorization tests pass.

## Security notes

The current web calculation path is local-only: it does not send CIDRs or plans to
a server. React encodes rendered output, parsers reject malformed inputs, and CSV
is generated from structured data. Future server features must revalidate all
client input and rely on both ownership checks and PostgreSQL RLS. Full controls
are listed in [SECURITY.md](docs/SECURITY.md).

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

- Supabase authentication, private project CRUD, and dashboard
- RLS authorization tests and Vercel production preparation
- Stripe test-mode billing only after persistence is proven
- Fixed/reserved blocks, structured PDF reports, and revocable sharing
- A separately stabilized browser IPv6 suite

The sequenced plan and completed phases are in [ROADMAP.md](docs/ROADMAP.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Bug reports, calculation edge cases,
documentation improvements, and tests are welcome.

## License

Released under the [MIT License](LICENSE).
