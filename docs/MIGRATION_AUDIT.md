# SubnetForge Migration Audit

This assessment was completed before web files were introduced. It records the
baseline and the decisions that governed the migration.

## Existing application

The source product is a Python 3.12 command-line application. It uses a `src`
package layout, immutable Pydantic results, Python's standard `ipaddress` module,
Typer, and Rich. Networking mathematics is already separated from terminal
formatting and is covered by 108 passing tests with 91% statement coverage.

## Keep

- IPv4 and IPv6 behavior, especially `/31` and `/32` semantics.
- Stable largest-first VLSM allocation, alignment, and containment checks.
- Domain errors, immutable results, explanations, examples, and the working CLI.

## Refactor or expand

- Port IPv4 and VLSM behavior to deterministic TypeScript for local browser use.
- Add explicit utilization and allocation-efficiency definitions.
- Add overlap, membership, addressing-assignment, and browser CSV tools.
- Isolate temporary branding and plan limits in configuration modules.
- Reject unknown imported fields when cloud/project import is introduced.

## Do not add yet

Supabase authentication, persistence, RLS, Stripe, and billing UI remain gated
until the standalone web calculator is stable. Placeholders must not imply that
cloud persistence or payments work.

## Migration shape

```text
src/subnet_calculator/   # preserved Python reference CLI
tests/                   # preserved Python tests
web/                     # Next.js web product
  src/app/
  src/config/
  src/features/
  src/lib/networking/
```

This avoids a destructive rewrite and lets TypeScript parity tests use the
existing documented examples as known-answer fixtures.

## A–E. Baseline assessment

The repository was clean on `main` and used Python 3.12, a `pyproject.toml`
package, a `src` layout, Typer/Rich presentation, Pydantic validation, examples,
documentation, and GitHub Actions. It had no browser UI, database, authentication,
or SaaS surface. The earlier import failures were caused by an unprepared virtual
environment, not broken source; installing `.[dev]` restored the package and its
tools.

The IPv4, IPv6, converters, VLSM, exports, explanation, and Packet Tracer template
features were working. Baseline validation produced 108 passing Python tests,
91% statement coverage, and clean Ruff and mypy results.

Weaknesses relative to the product vision were the absent overlap/membership
tools, no web workflow, no addressing assignment validation, no persistent
workspace, permissive future import boundaries, and ambiguous room for more
precise web utilization definitions. None justified deleting the proven CLI.

## F–H. Target architecture and dependencies

The target is a sibling `web/` Next.js application, not JavaScript code embedded
inside Python or an immediate replacement. Its pure TypeScript engine feeds React
features; later server-only services handle Supabase and Stripe. Required initial
dependencies are Next.js, React, TypeScript, Tailwind CSS, Vitest, Testing Library,
ESLint, and Prettier. No IP calculation, chart, form, state-management, database,
authentication, or billing library is necessary in the standalone phase.

Phases 1–9 cover the audit, engine, tests, tools, exports, visualization, and
product UI. Phases 10–15 deliberately gate authentication, persistence, RLS,
dashboard, deployment, and payments.

## I. Development setup checklist

- Git: installed; repository and origin configured.
- Node.js: version 24 available and appropriate for Next.js 16.
- pnpm: version 11.19 used with a committed lockfile.
- npm: system npm was unreliable, so it is not part of the documented workflow.
- Editor: Visual Studio Code available.
- Browser: a modern Chromium-based browser available for local QA.
- Python dependencies: existing `.venv` validated with CLI quality checks.
- Web dependencies: isolated under `web/`.

Later the developer needs a GitHub repository plus free/local-capable Supabase and
Vercel accounts. A Stripe account is needed only for the test-mode billing phase.
No paid account is required for the current release.

## J. Migration risks

- Python and TypeScript behavior can drift; known-answer tests reduce that risk.
- JavaScript signed bitwise coercion can corrupt high addresses; the web engine
  uses safe unsigned arithmetic.
- Cloud features expand the privacy and authorization surface; they remain gated
  behind server validation and RLS tests.
- A large visual map can become unreadable; tables remain the accessible source
  presentation and the map is derived-only.
- Premature billing or login walls can damage usability; calculators remain fully
  anonymous and pricing is explicitly marked future.
