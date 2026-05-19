# ADR 0001 — Portal Auth Strategy

Status: Accepted (2026-05-18)

## Context

Phase 4 stands up `app.jakartabc.com` as a separate Next.js app for clients. Both `apps/web` and `apps/portal` need authenticated user records. The portal must share operational infrastructure with the existing monorepo while keeping its client-facing auth boundary separate from the staff/admin experience in `apps/web`.

Two strategies were considered.

## Options

### Option A — Shared Payload users via portal-mounted Payload (CHOSEN)

Portal mounts its own Payload v3 instance pointing to the same postgres database as `apps/web`. Both apps read/write the same `users` collection. Portal admin UI is disabled; only staff log in to the web admin. Portal exposes its own login UI via `payload.login` Local API.

**Pros:**

- Single user record per person — same email means the same user across apps.
- Client invites issued from `apps/web` admin land directly in the portal.
- Local API is in-process, avoiding an extra HTTP hop for auth.
- Independent scaling: separate container, separate port, separate cookie.
- Keeps Phase 4 aligned with the approved single-postgres VPS topology.

**Cons:**

- Schema changes to `users` must coordinate across both apps' Payload configs.
- Two Payload runtimes hold open connections to postgres.
- Portal auth behavior must be tested against the shared collection contract, not only against portal-local code.

### Option B — Separate auth, separate user table (REJECTED)

Portal has its own `portal_users` table and auth backend.

**Pros:**

- Total isolation; portal can scale independently of the web Payload schema.
- Portal-specific fields can evolve without touching staff/admin user records.

**Cons:**

- Duplicate user identity creates invite and account-linking friction.
- Doubles the security surface with two auth implementations to keep secure.
- Sales/admin cannot see portal users without joining or syncing tables manually.
- Adds migration and support burden before the full portal product is in scope.

## Decision

Choose Option A. The portal mounts Payload v3 against the shared postgres database and shared `users` collection, while disabling the portal admin UI and providing a portal-specific login surface backed by `payload.login`.

Migration coordination is handled at schema-change PR time: any `users` field change must update both Payload configs and relevant tests in the same PR. Engineering-facing onboarding and runbook documentation should call out this shared contract before Phase 4 is considered complete.

## Consequences

- `packages/content` owns the shared `users` collection schema; both apps import the same `users` config.
- Cookies are scoped to `app.jakartabc.com` and use a distinct name, `jbc_portal_session`, to avoid collision with the web admin's `payload-token` cookie.
- `PORTAL_PAYLOAD_SECRET` signs portal sessions separately from `PAYLOAD_SECRET`, allowing independent rotation.
- The portal app runs as its own Next.js app on internal port `3001`; Caddy routes `app.jakartabc.com` to that container.
- Staff/admin access remains in `apps/web`; the portal must not expose a Payload admin UI.
- Phase 4 only establishes the auth boundary and placeholder dashboard. Role/permission depth, document upload, and setup tracking remain deferred to the full portal spec.

## Out of scope

- Role/permission system beyond authenticated versus anonymous.
- Document upload and setup tracking UI.
- 2FA or SSO.
- Email verification on signup; v1 assumes accounts are created by staff/admin invite, not public self-service signup.
