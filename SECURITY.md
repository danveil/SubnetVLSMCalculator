# Security Policy

## Supported versions

Security fixes are currently applied to the latest `0.1.x` release line.

## Reporting a vulnerability

Do not publish exploitable details in a public issue. Use the repository owner's
private security-reporting channel and include the affected version, reproduction
steps, impact, and a suggested remediation if known. Never include real credentials,
private addressing plans, or other sensitive production data.

The anonymous calculators perform mathematical planning locally and do not scan or
configure networks. Users may optionally create a Supabase-backed account and save
private projects; those explicit saves transmit project names, parent CIDRs, and
requirements to the configured Supabase region. Exported reports and saved projects
may reveal internal addressing and zone names, so store, deploy, and share them
according to organizational policy.

Never include passwords, session tokens, private projects, database credentials,
or a Supabase service-role key in a report. The public Supabase publishable key is
not a secret, but the service-role key bypasses RLS and requires immediate rotation
if exposed.
