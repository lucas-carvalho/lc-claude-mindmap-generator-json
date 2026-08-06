# Security Policy

## Project status

This is an open-source, single-maintainer project. It's currently maintained
by one individual contributor in their spare time — there is no team, no
formal support contract, and (for now) no external pull requests are being
reviewed or merged. Forking the repository is welcome and expected (that's
what "open source" means here), but contributions land back in this repo only
at the maintainer's own discretion, if and when that changes.

There are no versioned releases yet — `main` is the only supported branch,
and fixes are not backported anywhere.

## What this project actually is

Mindmap Generator JSON by LC is a **local, single-user prototype**. Read
[`docs/PRODUCTIONIZING.md`](docs/PRODUCTIONIZING.md) before treating it as
anything else. In particular, today it has:

- No authentication, no accounts, no authorization model — anyone who can
  reach the running process can read and overwrite all local save slots.
- No network hardening (TLS, CORS policy, rate limiting) of its own — it
  assumes it's run locally (`npm run dev` / `npm run start` on your own
  machine), not exposed directly to the internet.
- Persistence as plain JSON files on the local filesystem, with no
  encryption at rest.

None of that is a bug to report — it's the documented, current scope. Please
don't put real production data, credentials, or anything sensitive into it,
and don't expose a running instance directly to an untrusted network.

## Reporting a vulnerability

If you find an actual security issue in the code itself (e.g. a way to
escape the intended file-system sandboxing in `lib/fsTrees.ts`, a validation
bypass in the zod schemas, a client-side vulnerability like XSS) — please
**do not open a public GitHub issue** for it.

Instead, use GitHub's private vulnerability reporting for this repository:
**Security tab → Report a vulnerability**. That opens a private draft
security advisory visible only to the maintainer, rather than disclosing the
issue publicly before there's a fix.

If that option isn't visible/enabled on this repo, open a regular issue
asking that private reporting be enabled, without describing the
vulnerability itself.

## Response expectations

This is a best-effort, spare-time project — there's no SLA. Reports will be
acknowledged and looked at as time allows; there's no guarantee of a fix
timeline for any specific report.

## Supported dependencies

Dependencies are kept intentionally few (see the README's "Key dependencies"
section). Once the repository is public, GitHub's automated security
scanning (Dependabot alerts / secret scanning) is the primary mechanism for
staying on top of known vulnerabilities in them — see the repo's Security
tab for current status.
