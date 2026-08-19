# SubnetForge architecture

SubnetForge is being migrated incrementally beside the proven Python CLI. The
repository therefore contains two delivery surfaces that share domain concepts,
but not runtime code:

- `src/subnet_calculator/`: the preserved Python CLI, including IPv6 and Packet
  Tracer template capabilities.
- `web/`: the new Next.js application and its independently tested TypeScript
  IPv4 engine.

This avoids a risky big-bang replacement and keeps the existing CLI installable.

## Preserved Python CLI boundary

```text
CLI (cli.py)
  |-- validators/converters
  |-- IPv4 + IPv6 engines --> immutable models
  |-- VLSM engine ---------> immutable models
  |-- visualizer/explanations
  `-- exporters
```

- `models.py` defines validated inputs and immutable results.
- `subnet.py`, `ipv6.py`, and `vlsm.py` perform address mathematics through
  Python's standard `ipaddress` module.
- `validators.py` owns cross-field rules and `converters.py` owns masks.
- `visualizer.py` and `explanations.py` format results without recalculating.
- `exporters.py` owns protected UTF-8 output and report metadata.
- `cli.py` translates domain errors into actionable Typer/Rich output.

The CLI performs no network I/O, device execution, or telemetry. Its tests call
domain functions directly and exercise commands through Typer's test runner.

## Web boundaries

```text
Browser
  ├─ app/page.tsx                 server-rendered product shell
  ├─ features/*                   interactive client components and state
  ├─ lib/networking/*             pure deterministic domain functions
  └─ utils/download.ts            browser delivery of generated CSV text

Future trusted server boundary
  ├─ Supabase Auth                identity and session lifecycle
  ├─ PostgreSQL + RLS             private project persistence
  ├─ Next.js server actions/API   validated mutations and integrations
  └─ Stripe webhooks              verified subscription state
```

`web/src/app/page.tsx` is a Server Component by default. The calculators are Client
Components because they respond to form state and calculate instantly in the
browser. The networking engine contains no React, DOM, storage, network, or
database access, so it can be tested in isolation and reused by future server
validation.

## Data flow today

1. A form component owns an input draft with React state.
2. The component calls a pure function from `lib/networking`.
3. The engine parses and validates the input, calculates a typed result, or
   throws a safe domain error.
4. The component renders that result; maps and tables are views, never sources
   of truth.
5. CSV export serializes the same `VlsmPlan` object.

No calculation input leaves the browser in the current standalone phase.

## Configuration

The temporary name and product copy are isolated in `web/src/config/brand.ts`.
Plan definitions and future limits live in `web/src/config/plans.ts`. Environment
variables are declared in `.env.example`; only variables prefixed with
`NEXT_PUBLIC_` may be exposed to client bundles.

The root metadata resolves `/og.png` through `NEXT_PUBLIC_APP_URL`, producing an
absolute social-preview URL for local, preview, and production environments.

## Future service boundary

Authentication, persistence, sharing, and billing are intentionally not mocked.
When implemented, client calculations remain local, while every persisted write
is revalidated on the server. PostgreSQL RLS is a second authorization boundary,
not a substitute for server checks. See `DATABASE.md`, `SECURITY.md`, and
`ROADMAP.md`.
