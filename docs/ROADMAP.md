# Product roadmap

## Complete: standalone product foundation (Phases 1–9)

- repository audit and incremental sibling-web architecture;
- strict TypeScript IPv4/CIDR engine and high-coverage tests;
- `/0`, `/31`, `/32`, VLSM, overlap, membership, analytics, and explanations;
- editable requirements, proportional allocation map, assignment validation;
- CSV export and responsive, anonymous-first product experience;
- isolated brand and centralized free/pro plan definitions.

## Implemented in repository: authenticated workspace (Phases 10–13)

- Supabase email/password signup, login, logout, confirmation, and password reset;
- optional private projects and ordered requirement persistence with server
  recalculation;
- dashboard create, view, edit, duplicate, and delete workflows;
- a transactionally safe authenticated save RPC, explicit grants, RLS policies,
  and a committed User A versus User B pgTAP suite; and
- no login wall around the anonymous calculators.

The code and migration are present, but a hosted Supabase project, SMTP delivery,
remote migration application, and production-like two-user acceptance checks are
external deployment work. Limited project history has not been implemented.

## Next: deployment and product learning (Phase 14)

- configure hosted Supabase Auth URLs/SMTP and apply the committed migration;
- run local database lint/pgTAP plus manual cross-user checks against preview;
- deploy previews and production to Vercel with the public Supabase variables;
- add privacy-conscious, content-free event analytics only after a measurement
  plan and privacy review;
- accessibility audit, dependency review, and performance budgets;
- gather real feedback before changing free-plan usefulness.

## Monetization only after persistence is proven (Phase 15)

- Stripe test-mode checkout, billing portal, signed idempotent webhooks;
- server-derived subscription entitlements and centralized plan checks;
- real pricing page with honest availability labels;
- no real charges until lifecycle and failed-payment tests pass.

## Later capabilities

- PDF reporting through a structured exporter interface;
- read-only, revocable project sharing with strong tokens;
- fixed/reserved blocks and advanced allocation constraints;
- user-supplied Cisco-style configuration helpers marked review-required;
- a separately stabilized IPv6 validation, prefix, subnet, and membership suite;
- OAuth, collaboration, and internationalized education content when justified.

Correctness remains the first release criterion, security the second, usability
the third, and monetization deliberately follows them.
