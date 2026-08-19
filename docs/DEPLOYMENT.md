# Development and deployment

## Local web development

Requirements are Node.js 24, pnpm 11.19, Git, and a modern browser.

```powershell
cd web
pnpm install --frozen-lockfile
Copy-Item ..\.env.example .env.local
pnpm dev
```

Open `http://localhost:3000`. Empty future service variables are expected during
the standalone phase. Run the production gate before pushing:

```powershell
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm build
```

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

The Python CLI remains independently installable from the repository root with
`python -m pip install -e ".[dev]"`.

## Vercel preparation

1. Push the repository to GitHub.
2. Import it into Vercel and set **Root Directory** to `web`.
3. Keep the detected framework as Next.js and package manager as pnpm.
4. Set `NEXT_PUBLIC_APP_URL` to the deployment origin.
5. Add Supabase or Stripe variables only after those integrations exist. Mark
   secrets as sensitive and scope preview/production values deliberately.
6. Deploy a preview, run the manual acceptance checklist, then promote it.

No paid Supabase, Stripe, or Vercel plan is required for the current local product.
Stripe must remain in test mode throughout its later development phase.

## Supabase later

Create separate local/preview/production projects or schemas, apply reviewed
migrations, configure allowed redirect URLs, generate database types, and run RLS
tests before enabling save buttons. Never place the service-role key in Vercel
variables that are exposed to the browser.

## Rollback

Vercel deployments are immutable, so roll back to the prior known-good deployment
if a release fails. Database changes need backward-compatible migrations and an
explicit recovery plan; do not rely on reverting application code to undo a
destructive migration.
