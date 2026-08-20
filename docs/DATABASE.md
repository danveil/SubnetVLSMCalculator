# Supabase database and saved workspace

The repository includes a Supabase migration, local configuration, an empty seed,
and pgTAP authorization tests under `web/supabase/`. The anonymous calculators do
not require this database. Supabase is used only for users who choose to create an
account and save private projects.

Repository support is not the same as a configured hosted service. A developer
must still create or link a Supabase project, apply the migration, configure Auth
URLs/email delivery, and set deployment environment variables.

## Implemented schema

The migration `web/supabase/migrations/20260819130221_initial_workspace.sql`
creates:

```text
profiles
  id uuid primary key references auth.users(id) on delete cascade
  display_name text
  created_at timestamptz
  updated_at timestamptz

projects
  id uuid primary key
  owner_id uuid not null references auth.users(id) on delete cascade
  name text not null
  description text
  base_network text not null (canonical IPv4 CIDR only)
  created_at timestamptz
  updated_at timestamptz

requirements
  id uuid primary key
  project_id uuid not null references projects(id) on delete cascade
  position integer not null
  name text not null
  required_hosts bigint not null
  point_to_point boolean not null
  created_at timestamptz
  updated_at timestamptz

allocations
  id uuid primary key
  requirement_id uuid not null unique references requirements(id) on delete cascade
  calculated_payload jsonb not null
  created_at timestamptz
  updated_at timestamptz
```

An Auth trigger creates a matching profile. Database constraints limit names,
descriptions, IPv4 host counts, requirement ordering, and allocation payload size.
The database serializes and enforces the current free limit of three projects per
user and at most 100 requirements per project.

`allocations` is reserved for trusted, reproducible results. Authenticated browser
roles may read their own rows but have no insert, update, or delete grant. The
current dashboard stores only the project and requirement inputs, then recalculates
the VLSM plan with the TypeScript engine whenever data crosses the server data
layer.

## Authenticated write RPC

The dashboard calls this committed database function:

```sql
public.save_project_workspace(
  p_project_id uuid,
  p_name text,
  p_description text,
  p_base_network text,
  p_requirements jsonb
) returns uuid
```

Passing `NULL` as `p_project_id` creates a project; passing an owned ID replaces
that workspace's fields and ordered requirements in one transaction. The function:

- requires an authenticated `auth.uid()`;
- rejects unknown requirement fields, fractional/out-of-range host counts, invalid
  ordering, IPv6 parents, and more than 100 requirements;
- derives ownership from the session rather than accepting `owner_id`;
- does not accept or store client-authored allocation payloads; and
- is executable by `authenticated`, not `anon`.

The application validates and recalculates before calling the RPC. The RPC,
constraints, grants, and RLS remain independent defensive boundaries.

## Row Level Security and grants

RLS is enabled on `profiles`, `projects`, `requirements`, and `allocations`.
Separate select/insert/update/delete policies constrain each row to the current
user; child policies join through the owning project. Explicit grants additionally
prevent a browser role from choosing or transferring `projects.owner_id` and from
writing allocation payloads. The service-role credential bypasses RLS and is not
used by normal application requests.

`web/supabase/tests/workspace_rls.test.sql` supplies transaction-scoped User A and
User B fixtures. Its pgTAP assertions cover table/RLS existence, privileges, RPC
validation, free limits, own-row CRUD, cross-user denial, and anonymous denial.
No persistent test users are placed in `seed.sql`.

## Local database workflow

Docker Desktop (or a compatible Docker engine) must be running. From `web`:

```powershell
pnpm db:start
pnpm db:reset
pnpm db:lint
pnpm db:types
pnpm db:test
pnpm db:stop
```

`db:start` prints the local API URL and publishable key. Put those public values in
`web/.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Local email messages are captured by the
Supabase mail UI at `http://127.0.0.1:54324`; they are not delivered externally.

`db:reset` is destructive only to the local Supabase database. Never point a reset
command at a hosted or production database.

`db:types` regenerates `web/src/lib/supabase/database.types.ts`; the adjacent
`database.ts` preserves the generated file while narrowing the two RPC arguments
that intentionally accept `null`. CI starts and resets Supabase, lints the schema,
regenerates the types and rejects drift, then runs the database suite. The final
local pgTAP verification passes 62/62 assertions.

## Linking and applying a hosted project

Test the migration locally before linking a remote project:

```powershell
Set-Location web
pnpm exec supabase login
pnpm exec supabase link --project-ref YOUR_PROJECT_REF
pnpm exec supabase db push --dry-run
pnpm exec supabase db push
```

Review the dry run before applying it. Use forward-only, reviewed migrations for
remote changes; do not edit an already-applied migration or use a production reset
as a rollback mechanism. After applying, perform a manual two-account check in
addition to the local pgTAP suite.

## External Supabase dashboard checklist

These steps cannot be completed by repository code:

1. Create the hosted project and choose its production region.
2. Copy the **Project URL** and **publishable key** from the project's API settings.
3. Under **Authentication → URL Configuration**, set the production Site URL and
   allow `http://localhost:3000/auth/confirm*` plus
   `https://YOUR_DOMAIN/auth/confirm*`. This wildcard is path-scoped and permits
   the validated `next` query carried by the callback. Add preview patterns only
   when they are intentionally supported.
4. Keep email confirmation enabled. Configure a production SMTP provider before a
   public launch; the default hosted email service is not a production mail plan.
5. Apply the committed migration through the CLI and inspect RLS/policies in the
   dashboard before enabling real users.
6. Add only the public URL and publishable key to the web deployment, then run the
   signup, confirmation, recovery, save, read, duplicate, and delete checks with
   two different users.

The auth callback supports Supabase SSR PKCE `code` exchanges and configured custom
`token_hash`/`type` email templates. Any custom template must still point to the
configured `/auth/confirm` route and remain covered by the redirect allow-list.

## Secrets and future billing

The publishable key is safe to expose only because grants and RLS enforce access.
Never put a service-role key in `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, source code,
logs, screenshots, or client-side environment. `SUPABASE_SERVICE_ROLE_KEY` is not
required by the current application and should remain unset until a narrowly scoped
server-only administrative job genuinely needs it.

There is no billing table or Stripe integration in this migration. Billing
entitlements, signed idempotent webhooks, and server-owned Stripe identifiers
remain future work after hosted persistence and cross-user authorization are proven.
