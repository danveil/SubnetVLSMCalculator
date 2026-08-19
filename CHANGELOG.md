# Changelog

All notable changes follow a simplified Keep a Changelog format. This project uses
semantic versioning.

## [Unreleased]

### Added

- Anonymous-first Next.js subnet calculator, VLSM planner, allocation map,
  addressing validator, overlap detector, membership checker, and CSV export
- Web accessibility announcements, responsive mobile navigation, and production
  security headers
- Python 3.14 CI coverage and wheel/sdist packaging smoke tests
- A Python sdist boundary that excludes the independently shipped web workspace

### Fixed

- Mixed `/30` and RFC 3021 `/31` allocations now sort by actual block size
- The maximum valid traditional `/0` host requirement is accepted
- Addressing-table edits survive ordinary VLSM plan changes, and stale validation
  tool output is cleared when inputs change
- Runtime/type metadata now consistently targets Node.js 24 and Python 3.12–3.14

### Security

- CSV cells controlled by users are neutralized against spreadsheet-formula
  execution in both Python and TypeScript exporters
- Imported Python VLSM documents reject unknown fields instead of silently
  ignoring them

## [0.1.0] - 2026-08-13

### Added

- IPv4 and IPv6 analysis with special-prefix handling
- CIDR, subnet-mask, and wildcard-mask conversion
- Validated largest-first IPv4 VLSM allocation and safety checks
- Rich CLI, explanations, ASCII maps, and JSON/CSV/text exports
- Defensive segmentation examples and student documentation
- Automated tests, Ruff, mypy, coverage, and GitHub Actions configuration
- Review-required Packet Tracer VLAN and SVI configuration template generation
