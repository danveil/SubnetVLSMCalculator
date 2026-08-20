# Security and privacy model

The anonymous web calculators perform deterministic calculations locally and do
not transmit CIDRs, requirements, assignments, or generated CSV data. The
repository also contains an optional Supabase-authenticated saved workspace. A
network plan reaches the configured Supabase project only when a signed-in user
explicitly saves it. There is no analytics or billing endpoint.

## Current controls

- strict IPv4, CIDR, requirement, assignment, and import-boundary validation;
- React output encoding rather than raw HTML injection;
- no secrets or credentials in client code;
- `.env*` ignored except the documented `.env.example` contract;
- production headers omit the framework-powered header;
- pinned dependencies, lockfile, lint, type checks, coverage gates, and builds;
- no external calculation API, scanning, device access, or config execution;
- server-side account-form validation and verified Supabase claims for protected
  pages and actions;
- server revalidation/recalculation before project persistence;
- explicit PostgreSQL grants, constraints, RLS, and an authenticated save RPC;
- a transaction-scoped User A versus User B pgTAP authorization suite.

CSV downloads are generated from structured values and properly quoted. The
Packet Tracer generator remains in the Python CLI and clearly marks output as a
review-required template; it never connects to devices.

## Supabase session and cookie model

The browser, Server Components, Server Actions, and request proxy use the supported
Supabase SSR clients. Session cookies use `Path=/`, `SameSite=Lax`, and `Secure` in
production. `Secure` is intentionally disabled for local HTTP development.

These Supabase SSR cookies are intentionally **not HttpOnly**. The application has
a browser Supabase client that must read and refresh its tokens; marking the same
cookies HttpOnly would break that supported flow. Browser readability increases
the consequence of XSS, so the project relies on a restrictive CSP, React output
encoding, no raw user HTML, narrow dependencies, input validation, and prompt
security updates. Documentation or deployment configuration must not claim these
cookies are HttpOnly unless the browser client/session design is replaced.

The publishable key is also browser-visible by design. It is an identifier, not a
secret or authorization boundary. RLS, explicit grants, verified identity, and
server checks protect data.

Selecting **Save online** stores a fully validated, versioned calculator draft in
same-origin `localStorage` so signup confirmation can finish in another tab. The
draft may contain CIDRs and network names, expires after 30 minutes, and is removed
when restoration is attempted. It is not uploaded until the user submits the
authenticated project form. Users on shared browsers should avoid this handoff or
clear site data.

## Authenticated workspace controls and release requirements

- validate every mutation on the server even when the browser already validated;
- check both authentication and resource ownership before reads and writes;
- use `getClaims()` for trusted server identity and refresh sessions through the
  scoped Next.js proxy;
- keep sign-out and other state changes on POST/Server Actions, not mutating GETs;
- enable and test RLS as an independent defense in depth;
- add request-size limits and rate limiting to auth, sharing, export, and billing
  endpoints;
- return stable public errors and log redacted diagnostic identifiers, not tokens,
  passwords, project payloads, or stack traces;
- use same-site/CSRF-aware patterns for cookie-authenticated state changes;
- keep Supabase service-role, Stripe secret, and webhook signing secret out of all
  `NEXT_PUBLIC_` variables.

The current database denies anonymous project access, derives project ownership
from `auth.uid()`, prevents browser writes to calculated allocation payloads, and
limits the authenticated save RPC to known input fields. The application does not
need a service-role key. If a future server-only administrative job introduces
one, it must be narrowly scoped and never used for ordinary user requests because
it bypasses RLS.

## Required controls before Stripe or sharing

- verify Stripe webhook signatures against the raw request body and make event
  processing idempotent;
- derive plan access from verified server/database state, never client flags;
- use cryptographically strong, revocable, scope-limited sharing tokens and never
  expose owner email or sibling projects.

Stripe and sharing are not implemented. These items are release gates, not claims
about current functionality.

## Privacy

Network plans may reveal organizational structure. Saved projects are private by
default under RLS, but they are stored in the configured Supabase region and are
no longer local-only. Product analytics, if later introduced, should record coarse
events such as `calculator_used` or `csv_exported` without CIDRs, names, assigned
IPs, or full plans. Telemetry and user-created data must remain separate.

## Operational checklist

Before each release, run dependency audits, web quality gates, secret scanning,
`pnpm db:lint`, `pnpm db:test`, manual cross-user checks, and a production preview.
Rotate any credential suspected of exposure; deleting it from Git history alone is
insufficient. A leaked publishable key still warrants investigation, but a leaked
service-role key requires immediate rotation because it bypasses RLS.

The production CSP currently retains Next.js-compatible inline script/style
allowances. Removing the script allowance requires a nonce/`strict-dynamic`
design that makes affected routes dynamic; treat that as a deliberate future
hardening change, not a claim provided by the current headers.
