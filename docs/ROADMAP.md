# Product roadmap

## Complete: standalone product foundation (Phases 1–9)

- repository audit and incremental sibling-web architecture;
- strict TypeScript IPv4/CIDR engine and high-coverage tests;
- `/0`, `/31`, `/32`, VLSM, overlap, membership, analytics, and explanations;
- editable requirements, proportional allocation map, assignment validation;
- CSV export and responsive, anonymous-first product experience;
- isolated brand and centralized free/pro plan definitions.

## Next: authenticated workspace (Phases 10–13)

1. Add Supabase email/password signup, login, logout, and password reset.
2. Add private projects and requirement persistence with server revalidation.
3. Add dashboard CRUD: create, view, rename, edit, duplicate, and delete.
4. Implement RLS and automated User A versus User B authorization tests.
5. Add limited project history without placing a login wall around calculators.

## Deployment and product learning (Phase 14)

- deploy previews and production to Vercel;
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
