# Security and privacy model

The current web application performs deterministic calculations locally and has
no authentication, persistence, analytics, or billing endpoint. This minimizes
the initial attack surface and means private addressing plans are not transmitted
by the application.

## Current controls

- strict IPv4, CIDR, requirement, assignment, and import-boundary validation;
- React output encoding rather than raw HTML injection;
- no secrets or credentials in client code;
- `.env*` ignored except the documented `.env.example` contract;
- production headers omit the framework-powered header;
- pinned dependencies, lockfile, lint, type checks, coverage gates, and builds;
- no external calculation API, scanning, device access, or config execution.

CSV downloads are generated from structured values and properly quoted. The
Packet Tracer generator remains in the Python CLI and clearly marks output as a
review-required template; it never connects to devices.

## Required controls for authenticated phases

- validate every mutation on the server even when the browser already validated;
- use supported Supabase SSR session handling with secure, HTTP-only cookies;
- check both authentication and resource ownership before reads and writes;
- enable and test RLS as defense in depth;
- add request-size limits and rate limiting to auth, sharing, export, and billing
  endpoints;
- return stable public errors and log redacted diagnostic identifiers, not tokens,
  passwords, project payloads, or stack traces;
- use same-site/CSRF-aware patterns for cookie-authenticated state changes;
- keep Supabase service-role, Stripe secret, and webhook signing secret out of all
  `NEXT_PUBLIC_` variables;
- verify Stripe webhook signatures against the raw request body and make event
  processing idempotent;
- derive plan access from verified server/database state, never client flags.

## Privacy

Network plans may reveal organizational structure. Saved projects must be private
by default. Product analytics, if later introduced, should record coarse events
such as `calculator_used` or `csv_exported` without CIDRs, names, assigned IPs, or
full plans. Telemetry and user-created data must remain separate.

## Operational checklist

Before each release, run dependency audits, quality gates, secret scanning, RLS
cross-user tests, and a production preview. Rotate any credential suspected of
exposure; deleting it from Git history alone is insufficient.
