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
  ├─ app/page.tsx                    server-rendered anonymous product shell
  ├─ features/*                      interactive client components and state
  ├─ lib/networking/*                pure deterministic domain functions
  └─ utils/download.ts               browser delivery of generated CSV text

Optional trusted workspace boundary
  ├─ app/(auth routes)               signup/login/recovery server actions
  ├─ proxy.ts + lib/supabase/*       SSR session refresh and verified claims
  ├─ app/dashboard/*                 authenticated project operations
  ├─ data/projects.ts                server-only reads and revalidation
  └─ Supabase Auth/PostgreSQL/RLS    identity and private persistence

Future billing boundary
  └─ Stripe checkout/webhooks        not implemented
```

`web/src/app/page.tsx` is a Server Component by default. The calculators are Client
Components because they respond to form state and calculate instantly in the
browser. The networking engine contains no React, DOM, storage, network, or
database access, so it can be tested in isolation and is reused when authenticated
project input crosses the server boundary.

## Anonymous calculation flow

1. A form component owns an input draft with React state.
2. The component calls a pure function from `lib/networking`.
3. The engine parses and validates the input, calculates a typed result, or
   throws a safe domain error.
4. The component renders that result; maps and tables are views, never sources
   of truth.
5. CSV export serializes the same `VlsmPlan` object.

No calculation input leaves the browser through these anonymous workflows.
Opening an account page contacts the configured Supabase Auth service; saving a
project is a separate, explicit authenticated action.

When **Save online** is selected, the planner validates and serializes a versioned
draft to browser `localStorage` before navigating through authentication to
`/dashboard/new`. The draft has a 30-minute TTL and is removed before it is parsed
for restoration, so it can be consumed only once; malformed and expired drafts are
also removed. This temporary handoff is not a database write.

## Authenticated saved-project flow

1. Next.js Server Actions validate account forms and Supabase manages the session.
2. The request proxy refreshes sessions only on auth and dashboard routes; it does
   not place a login wall around `/` or the calculators.
3. The new-project editor consumes and revalidates any temporary calculator draft.
4. Protected pages and actions verify signed claims with `getClaims()` rather than
   trusting browser state.
5. Project form data is parsed and the VLSM plan is recalculated on the server.
6. The `save_project_workspace` security-invoker RPC atomically writes a project
   and its ordered requirements while deriving ownership from `auth.uid()`.
7. Explicit grants, database constraints, and RLS independently restrict direct
   table and RPC access. Reads recalculate stored inputs before rendering them.

The browser cannot write `allocations.calculated_payload`; the current save RPC
does not persist client-authored allocation output.

## Configuration

The temporary name and product copy are isolated in `web/src/config/brand.ts`.
Plan definitions and future limits live in `web/src/config/plans.ts`. Environment
variables are declared in `.env.example`. The browser-facing Supabase contract is
`NEXT_PUBLIC_SUPABASE_URL` plus `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. These
values are public identifiers, not authorization controls. No service-role key is
used by the current application, and one must never enter a client bundle.

The root metadata resolves `/og.png` through `NEXT_PUBLIC_APP_URL`, producing an
absolute social-preview URL for local, preview, and production environments.

## Service boundary status

Authentication and private project persistence are implemented but remain
optional. Configuring a hosted Supabase project, applying the committed migration,
and setting Auth redirect URLs are external deployment steps. PostgreSQL RLS is a
second authorization boundary, not a substitute for server checks. Sharing and
billing are intentionally absent; Stripe remains gated on production-like auth
and ownership validation. See `DATABASE.md`, `SECURITY.md`, and `ROADMAP.md`.
