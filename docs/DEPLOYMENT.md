# Development and deployment

## Local web development

Requirements are Node.js 24, pnpm 11.19, Git, and a modern browser.

```powershell
cd web
pnpm install --frozen-lockfile
Copy-Item ..\.env.example .env.local
pnpm dev
```

Open `http://localhost:3000`. Supabase values may stay empty for anonymous
calculator work: the `/` workspace does not require Supabase. Auth and `/dashboard`
do require both public Supabase values in `web/.env.local`:

```dotenv
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Do not add a service-role key to any `NEXT_PUBLIC_` variable. Run the production
gate before pushing:

```powershell
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm build
```

## Full local Supabase workspace

Docker Desktop or a compatible Docker engine is required for the repository's
local Supabase stack. From `web`:

```powershell
pnpm db:start
pnpm db:reset
pnpm db:lint
pnpm db:types
pnpm db:test
```

Copy the API URL and publishable key printed by `db:start` into `.env.local`, then
run `pnpm dev`. Confirmation and password-reset messages are captured locally at
`http://127.0.0.1:54324`. Stop the stack with `pnpm db:stop`.

`db:reset` recreates the local database from committed migrations and the empty
seed. Do not use a reset command against a linked hosted project.

## Manual acceptance checklist

1. Confirm the hero's **Open the planner** link reaches the workspace.
2. Calculate `192.168.50.77/27`; expect network `192.168.50.64`, hosts
   `192.168.50.65`–`192.168.50.94`, and broadcast `192.168.50.95`.
3. Enable educational working and confirm the 32-address block explanation.
4. In VLSM, keep `10.10.0.0/16` and load the example; expect Students
   `10.10.0.0/23` and Staff `10.10.2.0/25` with no plan error.
5. Change a requirement, add/duplicate/reorder/delete a row, and confirm every
   allocation and metric reacts immediately.
6. Export CSV and inspect its header and quoted values.
7. Check overlap for `192.168.1.0/24` and `192.168.1.128/25`; expect the shared
   range `192.168.1.128`–`192.168.1.255`.
8. Check membership of `192.168.1.50` in `192.168.1.0/24`; expect a positive
   explanation and the network/host/broadcast fields.
9. Enter a network address, broadcast, out-of-range address, then a valid host in
   the addressing table and confirm the warnings change.
10. Repeat the primary flows at narrow mobile width and by keyboard only.
11. With Supabase configured, sign up, confirm the local email, sign out, sign in,
    request a reset, and choose a new password.
12. Save, reopen, edit, duplicate, and delete a project; confirm a fourth free
    project is rejected.
13. Repeat project access with a second user and confirm neither account can read,
    change, or delete the other's rows or guessable project URLs.

The Python CLI remains independently installable from the repository root with
`python -m pip install -e ".[dev]"`.

## Vercel preparation

1. Push the repository to GitHub.
2. Import it into Vercel and set **Root Directory** to `web`.
3. Keep the detected framework as Next.js and package manager as pnpm.
4. Set `NEXT_PUBLIC_APP_URL` to the complete HTTPS deployment origin.
5. Set `NEXT_PUBLIC_SUPABASE_URL` to the hosted Supabase project URL and
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to its publishable key. Scope preview
   and production values deliberately.
6. Do not add `SUPABASE_SERVICE_ROLE_KEY`; the current application does not need it.
7. Deploy a preview, run the manual acceptance checklist, then promote it.

No paid Supabase, Stripe, or Vercel plan is required for local development. Review
provider plan limits and commercial-use terms before a public commercial launch.
Stripe is not integrated and must remain in test mode throughout its future phase.

## Hosted Supabase preparation

Repository code cannot create or configure the hosted account for you:

1. Create the Supabase project and copy its Project URL and publishable key.
2. In **Authentication → URL Configuration**, set the production Site URL and
   allow only the callback paths you use: `http://localhost:3000/auth/confirm*`
   locally and `https://YOUR_DOMAIN/auth/confirm*` in production. The path-scoped
   suffix wildcard is needed because the validated `next` query is part of the
   redirect URL. Add preview callback patterns only when previews intentionally
   use the hosted Auth project.
3. Keep email confirmation enabled and configure production SMTP before launch.
4. Test migrations locally, then link and inspect the remote change:

   ```powershell
   Set-Location web
   pnpm exec supabase login
   pnpm exec supabase link --project-ref YOUR_PROJECT_REF
   pnpm exec supabase db push --dry-run
   pnpm exec supabase db push
   ```

5. Inspect the applied RLS policies/grants, deploy the public variables, and run
   the two-user acceptance checks above.

The public key is not a secret; it is safe only with the committed grants and RLS.
Never expose the RLS-bypassing service-role key to a browser or ordinary request
path.

## Rollback

Vercel deployments are immutable, so roll back to the prior known-good deployment
if a release fails. Database changes need backward-compatible migrations and an
explicit recovery plan; do not rely on reverting application code to undo a
destructive migration. A remote `db push` is not rolled back by reverting Git.
