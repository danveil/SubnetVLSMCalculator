# Contributing

Thank you for improving SubnetVLSMCalculator and SubnetForge. Open an issue before
a large change, keep calculations defensive and offline, and include regression
tests and documentation for observable behavior.

Set up and check the Python CLI from the repository root:

```bash
python -m venv .venv
python -m pip install -e ".[dev]"
ruff format .
ruff check .
mypy src/subnet_calculator
pytest --cov=subnet_calculator
```

Set up and check the web application independently:

```bash
cd web
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm build
```

Changes to `web/supabase/migrations`, database access, authentication, or project
persistence also require Docker and the local database gate:

```bash
cd web
pnpm db:start
pnpm db:reset
pnpm db:lint
pnpm db:types
pnpm db:test
pnpm db:stop
```

Add schema changes as a new forward migration; do not rewrite a migration that may
already be applied remotely. Every user-owned table needs RLS plus explicit grants,
and authorization tests must prove User A cannot read, update, delete, or attach
child rows to User B's project. Test anonymous denial and RPC privileges as well as
ordinary own-row success. Browser-submitted allocation output is never authoritative:
recalculate networking results in trusted server code.

Commit the regenerated `web/src/lib/supabase/database.types.ts` with each schema
change. CI regenerates it and rejects drift before running the pgTAP suite.

Use Python 3.12–3.14, Node.js 24, and pnpm 11.19.0 so local behavior matches CI.
Pure networking rules belong in `src/subnet_calculator` or
`web/src/lib/networking`; presentation code must not duplicate address arithmetic.

Use descriptive commits, Python type hints, public docstrings, `pathlib`, strict
TypeScript, and the standard `ipaddress` module for Python address mathematics.
Never add scanning, exploitation, credential attacks, telemetry, secrets, or
unrequested network access. Supabase's URL and publishable key may be public, but a
service-role key must never appear in source, `NEXT_PUBLIC_` variables, fixtures,
logs, or screenshots because it bypasses RLS. Stripe is still future work; do not
add billing claims or live-charge paths without an approved lifecycle design. By
contributing, you agree that your work is licensed under the MIT License.
