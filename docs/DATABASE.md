# Future database design

Database-backed projects are a deferred phase. No UI currently claims that data
is saved, and no Supabase dependency or credential is required for local use.

## Proposed tables

```text
profiles
  id uuid primary key references auth.users(id)
  display_name text
  created_at timestamptz not null

billing_accounts (server-owned schema)
  user_id uuid primary key references auth.users(id)
  plan text check (plan in ('free', 'pro'))
  subscription_status text
  stripe_customer_id text unique
  stripe_subscription_id text unique
  current_period_end timestamptz

projects
  id uuid primary key
  owner_id uuid not null references auth.users(id)
  name text not null
  description text
  base_network text not null
  created_at timestamptz not null
  updated_at timestamptz not null

requirements
  id uuid primary key
  project_id uuid not null references projects(id) on delete cascade
  position integer not null
  name text not null
  required_hosts integer not null
  point_to_point boolean not null default false

allocations
  id uuid primary key
  requirement_id uuid not null unique references requirements(id) on delete cascade
  calculated_payload jsonb not null
```

Allocations may be stored for reproducible reports, but trusted server code must
recalculate and validate them from requirements before every save. Client results
are never authoritative. An allocation derives its project through its requirement;
not storing a second `project_id` prevents a requirement and allocation from being
linked to different projects. If a denormalized project ID is added later, enforce
it with a composite foreign key rather than application checks alone.

## Row Level Security

Enable RLS on every user-owned table. Project policies should compare
`owner_id = auth.uid()` for select, insert, update, and delete. Child-table policies
must require an owning project whose `owner_id = auth.uid()`. The insert path must
derive `owner_id` from the authenticated session; it must never trust an arbitrary
owner supplied by a browser.

Tests must create User A and User B, then prove that all direct and nested reads,
updates, and deletes from A against B's project fail. Service-role credentials are
server-only and must not be used in ordinary user request paths because they bypass
RLS.

Billing entitlements and Stripe identifiers are server-owned. Browser roles may
read only the minimum entitlement needed for their own account and must have no
insert, update, or delete policy on `billing_accounts`. Subscription changes come
only from trusted server code after authenticated checkout or verified Stripe
webhook signatures; users must never be able to promote their own plan by updating
a profile row.

## Sharing later

A separate share record should contain a cryptographically random token hash,
project ID, creation/revocation timestamps, and explicit read-only scope. Public
responses must expose only the selected project, never owner email or sibling
projects.

## Setup checkpoint

Create the Supabase project, migration SQL, generated TypeScript database types,
local seed users, and RLS integration tests together in Phase 10–13. Do not paste
production keys into source files. The browser may receive only the public URL and
publishable/anonymous key; service-role and webhook secrets stay server-side.
