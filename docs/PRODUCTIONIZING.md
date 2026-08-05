# Productionizing this prototype

## 1. Purpose & scope

This document describes what would still need to be built to run Mindmap
Generator JSON by LC as a real, hosted, multi-user service. It is written
generically — it does not assume or describe any particular hosting
platform, internal tool, or company infrastructure. It exists so that a
"yes, but what's missing" conversation has a concrete starting point before
this prototype is pointed at real users or real data.

## 2. Current state summary

Today the app is a single-user local prototype:

- Runs with `npm run dev` on one machine, with no deployment target.
- Persists data as flat JSON files on the local filesystem (`data/trees/`),
  read and written by a handful of Next.js Route Handlers.
- Has a fixed number of save slots (5) with no concept of "whose" slot it is.
- Has no login, no accounts, and no network-level access control beyond
  whatever is already true of the machine it runs on.
- Trusts its own filesystem completely — there is no separate audit trail,
  backup, or recovery story beyond what the host OS provides.

Every section below describes a gap between that state and something safe
to expose to real users over the network.

## 3. Authentication & authorization

There is currently no login of any kind — anyone who can reach the running
process can read and overwrite any of the 5 slots. A hosted version needs:

- An identity provider integration (OAuth/OIDC/SAML, depending on the
  audience) so requests are tied to a real, verified identity.
- A session or token mechanism (e.g. signed, short-lived session cookies)
  so authentication doesn't need to be re-proven on every request.
- An authorization model — at minimum "is this the owner of this data",
  and likely a role system (viewer/editor/admin) once more than one person
  can touch the same tree.

## 4. Routing & access control

Route Handlers here are reachable by anyone who can open a TCP connection
to the process; there is no reverse proxy, TLS termination, or per-route
policy layer in front of them. Productionizing this means:

- Putting a reverse proxy or API gateway in front of the app to terminate
  TLS, enforce HTTPS-only access, and centralize routing rules.
- Per-route access rules (some routes public, some authenticated, some
  admin-only) instead of every route being equally reachable.
- CORS configuration scoped to the actual set of origins allowed to call
  the API, instead of implicitly trusting same-origin requests only because
  nothing else can reach it today.
- Rate limiting / abuse protection on write endpoints (`PUT`/`DELETE`),
  since nothing currently stops a client from hammering them.

## 5. Persistence layer

Flat JSON files on disk work for a single process on a single machine, but
break down as soon as there's more than one server instance, more than one
concurrent writer, or a need for real durability guarantees:

- Move from `data/trees/*.json` to a real database — a document store
  (e.g. one that stores the `TreeFile` shape close to as-is) or a relational
  schema (trees, snapshots, and nodes as normalized tables), depending on
  how much querying/filtering across trees is eventually needed.
- Add real indexing (by owner, by name, by update time) instead of the
  current "read all 5 files and see which are occupied" approach.
- Add concurrent-write safety at the database level (transactions / optimistic
  locking) — the current temp-file-then-rename trick only protects a single
  file from a single writer, not concurrent writers to the same tree.
- Add backups and point-in-time recovery, which a bare filesystem doesn't
  give you for free.

## 6. Multi-user data isolation

The "5 slots" model is deliberately simple for a single local user; it does
not generalize to multiple users:

- Every stored tree needs an owner (and, if teams are involved, a
  tenant/workspace scope), not just a slot number.
- Storage needs to move from "5 fixed slots" to "unlimited trees per
  owner," with pagination and search once the count grows.
- Access checks need to enforce that a user can only read/write/delete
  their own trees (or trees explicitly shared with them).

## 7. Security hardening

Beyond authentication and routing, a handful of practices become necessary
once this is reachable over the network:

- Centralized secrets management (database credentials, signing keys, any
  third-party API keys) instead of local `.env` files.
- Automated dependency scanning (the app already leans on a small,
  well-known dependency set, but that needs to stay monitored over time).
- Audit logging of who changed what and when — today there is no history
  of *who* saved over a slot, only *that* it was saved (via snapshots).
- Continued input validation at every trust boundary — the zod schemas
  here are a good start and should carry forward, but need to also cover
  whatever new fields a real backend introduces (owner IDs, sharing state).

## 8. Scalability & performance

A single Node process reading/writing local files does not scale
horizontally:

- The app would need to run as multiple stateless instances behind a load
  balancer, which requires the persistence layer (see §5) to no longer be
  "a file on this instance's disk" — a single JSON-file store on local disk
  cannot be shared consistently across instances.
- Caching for read-heavy paths (e.g. the slot list) once there are many
  more than 5 trees per user.
- Pagination for any listing endpoint once "list all trees" can no longer
  reasonably return everything at once.

## 9. Observability

There is currently no structured logging, metrics, or error tracking —
failures are only visible in a local terminal. A hosted version needs:

- Structured application logs shipped somewhere queryable.
- Basic metrics (request rates, error rates, latency) per route.
- Error tracking/alerting so failures surface to whoever's on call, rather
  than silently failing for a user with no one noticing.

## 10. Deployment & CI/CD

Today "deployment" is `npm run dev` on a laptop. A real rollout needs:

- Separate environments (at least staging and production) with their own
  configuration and data.
- An automated build/test/deploy pipeline, so changes go out consistently
  and are gated on the checks already used in this repo (`npm run build`,
  `npx tsc --noEmit`, `npm run lint`) plus whatever tests get added.
- A rollback strategy for when a deploy introduces a regression.

## 11. Data migration path

None of the above should mean today's local data is thrown away. When a
real backend exists, the migration is straightforward because the JSON
shape doesn't need to change: each `data/trees/slot-N.json` file already
matches the `TreeFile` schema this app validates against everywhere else,
so importing them is a matter of writing each one (owner attached) into
whatever the new persistence layer is, snapshots included.

## 12. Testing & compliance considerations

- A real test suite (unit tests for `lib/treeDiff.ts`, `lib/schema.ts`,
  `lib/fsTrees.ts`; integration tests for the API routes) should exist
  before this is anything more than a prototype — today's verification
  was manual (`curl` smoke tests, type-checking, and a production build).
- A data retention policy — how long snapshots are kept, whether deleted
  trees are truly gone or soft-deleted — needs to be decided explicitly
  once real user data is involved, rather than left as "whatever the code
  happens to do."
- Depending on who the eventual users are and what the tree data
  represents, there may be additional compliance considerations (data
  residency, export requirements, etc.) that are out of scope to guess at
  here but worth flagging early with whoever owns that decision.
