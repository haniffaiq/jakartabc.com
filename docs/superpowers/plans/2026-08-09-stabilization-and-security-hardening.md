# JakartaBC Stabilization and Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the audited security and reliability defects while keeping the public web application light and moving durable/ephemeral storage to the existing shared PostgreSQL, MinIO, and Redis infrastructure.

**Architecture:** PostgreSQL remains authoritative, MinIO stores public media under `media/`, and Redis coordinates atomic rate limits and submission idempotency. The public web and portal stay separate, share one Payload Users definition, enforce deny-by-default access, and are deployed through additive migrations. Work is executed through conflict-free parallel waves separated by serialized integration barriers.

**Tech Stack:** pnpm workspaces, Turborepo, Next.js 16.2.11, React 19.2.8, Payload 3.86.0, PostgreSQL, `@payloadcms/storage-s3` 3.86.0, Redis client 6.2.0, Vitest, Playwright, Lighthouse, Docker Compose.

## Execution status

This table is the authoritative handoff status. The detailed checkboxes below are retained as the
implementation and verification recipe; they are not a reliable progress ledger for another
agentic runner.

| Scope                                | Status                                                                 |
| ------------------------------------ | ---------------------------------------------------------------------- |
| Tasks 0–4                            | Completed, reviewed, and integrated                                    |
| Wave 1 / Tasks 5–7                   | Completed, reviewed, and integrated                                    |
| Wave 2 / Tasks 8–10                  | Completed, reviewed, and integrated                                    |
| Wave 3 shared delivery prerequisites | Completed, reviewed, and integrated                                    |
| Wave 3 / Tasks 11–13                 | Completed, reviewed, integrated, and combined gate passed              |
| Task 14                              | Not started; mandatory migration/generated-artifact deployment barrier |
| Tasks 15–18                          | Not started                                                            |

Do not deploy or start a runtime containing the lead-delivery CAS call sites until Task 14 has
migrated both lead tables and its restored-database rehearsal has passed.

---

## Execution contract

- Design source: `docs/superpowers/specs/2026-08-09-stabilization-and-security-hardening-design.md`.
- User selected subagent-driven development with parallel workers.
- Every behavior change follows red-green-refactor.
- Every implementation task gets two reviews: specification compliance first, code quality second.
- Parallel implementers use separate Git worktrees and branches. They never edit the same file in one wave.
- The integration controller cherry-picks reviewed commits in graph order and runs the wave gate.
- Only the integration controller edits `pnpm-lock.yaml`, `apps/web/src/migrations/index.ts`, generated Payload types, root manifests, or shared Payload configs.
- A worker that discovers a required out-of-ownership edit stops and reports it; it does not expand scope.
- Existing untracked `AGENTS.md` is user-owned and must not be staged or changed.

## Task graph

```mermaid
flowchart TD
  T0[0. Isolated worktrees and baseline]
  T1[1. Platform and dependency barrier]
  T2[2. Shared env and infrastructure contracts]
  T3[3. Shared Users and RBAC]
  T4[4. MinIO media adapter]

  T0 --> T1 --> T2 --> T3 --> T4

  T4 --> T5[5. Portal role and redirect hardening]
  T4 --> T6[6. Redis, trusted IP, and Turnstile]
  T4 --> T7[7. Content lifecycle and cache hooks]

  T5 --> W1[Wave 1 merge gate]
  T6 --> W1
  T7 --> W1

  W1 --> T8[8. Browser submission IDs]
  W1 --> T9[9. Supported rich-text renderer]
  W1 --> T10[10. Mobile menu accessibility and navy tests]

  T8 --> W2[Wave 2 merge gate]
  T9 --> W2
  T10 --> W2

  W2 --> S3[Wave 3 shared delivery prerequisites]
  S3 --> T11[11. Durable contact flow]
  S3 --> T12[12. Durable booking flow]
  W2 --> T13[13. Insight queries and error semantics]

  T11 --> W3[Wave 3 merge gate]
  T12 --> W3
  T13 --> W3

  W3 --> T14[14. Retry delivery and combined migration]
  T14 --> T15[15. CMS chrome, localization, and legal links]
  T14 --> T16[16. Docker, fonts, and lightweight workflow]

  T15 --> W4[Wave 4 merge gate]
  T16 --> W4

  W4 --> T17[17. Integration, E2E, performance, and security gates]
  T17 --> T18[18. Deployment rehearsal, rollback, and final verification]
```

### Parallel waves and ownership

| Wave | Worker A                               | Worker B                                | Worker C                                             | Why disjoint                                              |
| ---- | -------------------------------------- | --------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------- |
| 1    | Task 5: `apps/portal/**`               | Task 6: web Redis/request/Turnstile/env | Task 7: `packages/content` cache/collections/globals | Separate app/package trees; shared configs already frozen |
| 2    | Task 8: web form components/validation | Task 9: web rich-text library/tests     | Task 10: `packages/ui` navigation/tests              | No common files or generated artifacts                    |
| 3    | Task 11: contact action/collection     | Task 12: booking action/collection      | Task 13: Insight pages/query/seed                    | Collection and route ownership split by slug              |
| 4    | Task 15: site chrome/messages/pages    | Task 16: Docker/root tooling/fonts      | unused for reviewer capacity                         | App content files versus build/runtime files              |

Tasks 0-4, 14, 17, and 18 are serialized barriers. Reviews may run concurrently only after all implementers in a wave stop editing.

## Shared interfaces locked by the plan

```ts
export type Role = 'admin' | 'editor' | 'client'

export type RateLimitResult =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfter: number }

export type DeliveryStatus = 'pending' | 'sent' | 'failed'

export type DeliveryReconciliation =
  | Readonly<{ state: 'reconciled'; delivery: DeliveryStatus }>
  | Readonly<{ state: 'invalid' }>

export function reconcilePersistedDelivery(record: unknown): DeliveryReconciliation

export type SubmissionResult =
  | { ok: true }
  | { ok: true; submissionId: string; delivery: DeliveryStatus }
  | {
      ok: false
      code:
        | 'validation'
        | 'captcha'
        | 'rate'
        | 'service-unknown'
        | 'persistence'
        | 'temporarily-unavailable'
        | 'unknown'
    }

export type SubmissionLease = Readonly<{ submissionId: string; token: string }>
export type AcquireResult =
  | { state: 'acquired'; lease: SubmissionLease }
  | { state: 'in-progress' }
  | { state: 'completed' }
export type RenewResult = { state: 'renewed' } | { state: 'lease-lost' }
export type CompleteResult = { state: 'completed' } | { state: 'lease-lost' }
export type ReleaseResult = { state: 'released' } | { state: 'lease-lost' }

export interface SubmissionCoordinator {
  rateLimit(scope: 'contact' | 'booking', identity: string): Promise<RateLimitResult>
  acquire(submissionId: string): Promise<AcquireResult>
  renew(lease: SubmissionLease): Promise<RenewResult>
  complete(lease: SubmissionLease): Promise<CompleteResult>
  release(lease: SubmissionLease): Promise<ReleaseResult>
}
```

`reconcilePersistedDelivery` is the only acceptance classifier for a completed Redis marker, an
existing non-resumable row, or an initial-delivery CAS no-match. It accepts Payload's canonical UTC
millisecond ISO strings only. Ambiguous pending and terminal states require a safe-integer attempt
count of at least one plus coherent timestamp/null/error fields; sent delivery cannot precede its
last attempt. The sent transition clamps a backward completion clock to the last-attempt timestamp
so a successful provider call still produces persistable state. Failed delivery accepts only the
exact bounded outputs of `sanitizeDeliveryError`. Untouched pending/attempt-zero and every malformed
state return the frozen `invalid` result without throwing or copying persisted/customer/provider
data. The narrow pre-CAS resumability check is the only place where untouched
pending/attempt-zero may proceed toward the atomic claim.

Do not rename these public types in downstream tasks without updating this plan and all consumers in the same serialized barrier.

## File structure map

### New focused modules

- `packages/content/src/access/roles.ts` — pure role predicates and Payload access functions.
- `packages/content/src/collections/Users.ts` — one Users collection for web and portal.
- `packages/content/src/cache/tags.ts` — deterministic locale/detail/dependency cache tags.
- `apps/web/src/lib/redis/client.ts` — lazy singleton Redis connection and typed availability error.
- `apps/web/src/lib/anti-spam/idempotency.ts` — Redis submission lock/completed marker.
- `apps/web/src/lib/request/client-ip.ts` — trusted-proxy client identity extraction.
- `apps/web/src/lib/url/safe-url.ts` — safe rendered URL and portal redirect canonicalization.
- `apps/web/src/lib/submissions/delivery.ts` — shared delivery transitions, fail-closed persisted-state reconciliation, and retry behavior.
- `apps/web/src/lib/submissions/deliveryClaim.ts` — fixed-statement PostgreSQL CAS for delivery ownership.
- `apps/web/src/lib/siteChrome.ts` — cached localized CMS global reads.
- `apps/web/src/scripts/retry-failed-deliveries.ts` — idempotent operational retry command.
- `apps/web/src/migrations/20260809_000000_stabilization.ts` — additive compatibility migration.
- `scripts/copy-media-to-minio.ts` — verified legacy-media copy command.
- `scripts/verify-runtime-image.sh` — rejects secrets and missing runtime assets.

### Serialized conflict hotspots

- `pnpm-lock.yaml`, root `package.json`, and workspace manifests;
- `apps/web/src/payload.config.ts` and `apps/portal/src/payload.config.ts`;
- `packages/content/src/index.ts`;
- `packages/content/src/generated/payload-types.ts`;
- `apps/web/src/migrations/index.ts` and migration snapshots;
- `.env.example`, `docker-compose.yml`, and both Dockerfiles.

## Task 0: Create isolated integration and lane worktrees

**Files:**

- Modify: `.gitignore`
- Verify only: `AGENTS.md`, `package.json`, current test suites

- [ ] **Step 1: Ignore project-local worktrees**

Add exactly this entry to `.gitignore`:

```gitignore
# agent worktrees
.worktrees/
```

- [ ] **Step 2: Verify the ignore rule before creating anything**

Run: `git check-ignore -q .worktrees`

Expected: exit 0.

- [ ] **Step 3: Commit only the ignore rule**

```bash
git add .gitignore
git commit -m "chore: ignore agent worktrees"
```

- [ ] **Step 4: Create the integration worktree**

Run: `git worktree add .worktrees/stabilization-integration -b codex/stabilization-integration`

Expected: a clean worktree based on the committed plan and spec.

- [ ] **Step 5: Install the frozen workspace**

Run from `.worktrees/stabilization-integration`: `pnpm install --frozen-lockfile`

Expected: exit 0 with no lockfile modification.

- [ ] **Step 6: Record the known baseline**

Run:

```bash
pnpm --filter @jakartabc/web test
pnpm --filter @jakartabc/portal test
pnpm --filter @jakartabc/ui test
pnpm lint
pnpm typecheck
pnpm format:check
```

Expected: web 62/62 and portal 18/18 pass; UI has exactly the five known navy/ochre assertion failures; format check identifies the known drift; lint/typecheck do not introduce failures beyond the recorded baseline. If results differ, stop and report the new baseline before implementation.

## Task 1: Upgrade the platform and own all dependency changes

**Files:**

- Modify: `package.json`
- Modify: `apps/web/package.json`
- Modify: `apps/portal/package.json`
- Modify: `packages/content/package.json`
- Modify: `packages/ui/package.json`
- Modify: `packages/email/package.json`
- Modify: `packages/config/package.json`
- Modify: `packages/config/eslint/index.js`
- Modify: `pnpm-lock.yaml`
- Create: `.nvmrc`
- Modify: `apps/web/next.config.ts`
- Modify: `apps/portal/next.config.ts`
- Rename: `apps/web/src/middleware.ts` to `apps/web/src/proxy.ts`
- Rename: `apps/portal/src/middleware.ts` to `apps/portal/src/proxy.ts`
- Modify: `apps/web/src/i18n/request.ts`
- Modify: `apps/web/src/app/[locale]/layout.tsx`
- Modify: `apps/web/src/app/(payload)/layout.tsx`
- Modify: `apps/web/src/app/(payload)/admin/[[...segments]]/page.tsx`
- Modify: `apps/web/src/app/(payload)/admin/importMap.ts`
- Create: `docs/security/production-audit-exceptions.json`
- Create: `scripts/production-audit-policy.mjs`
- Create: `scripts/production-audit-policy.test.mjs`
- Create: `scripts/check-production-audit.mjs`

- [ ] **Step 1: Write a manifest consistency test**

Create `scripts/check-payload-versions.mjs`:

```js
import { readFile } from 'node:fs/promises'

const manifests = [
  'apps/web/package.json',
  'apps/portal/package.json',
  'packages/content/package.json',
]
const found = []

for (const file of manifests) {
  const manifest = JSON.parse(await readFile(file, 'utf8'))
  for (const group of ['dependencies', 'devDependencies', 'peerDependencies']) {
    for (const [name, version] of Object.entries(manifest[group] ?? {})) {
      if (name === 'payload' || name.startsWith('@payloadcms/')) found.push({ file, name, version })
    }
  }
}

const invalid = found.filter(({ version }) => version !== '3.86.0')
if (invalid.length) {
  console.error(invalid)
  process.exit(1)
}
console.log(`Payload packages aligned: ${found.length}`)
```

Add root script: `"check:payload-versions": "node scripts/check-payload-versions.mjs"`.

- [ ] **Step 2: Run the consistency check and verify red**

Run: `pnpm check:payload-versions`

Expected: FAIL listing existing 3.0.0 and caret peer versions.

- [ ] **Step 3: Upgrade through pnpm, never hand-edit the lockfile**

Run these from the integration worktree:

```bash
pnpm --filter @jakartabc/web add next@16.2.11 next-intl@4.13.5 react@19.2.8 react-dom@19.2.8 payload@3.86.0 @payloadcms/db-postgres@3.86.0 @payloadcms/next@3.86.0 @payloadcms/richtext-lexical@3.86.0 @payloadcms/storage-s3@3.86.0 redis@6.2.0
pnpm --filter @jakartabc/portal add next@16.2.11 react@19.2.8 react-dom@19.2.8 payload@3.86.0 @payloadcms/db-postgres@3.86.0 @payloadcms/next@3.86.0 @payloadcms/richtext-lexical@3.86.0 @jakartabc/content@workspace:*
pnpm --filter @jakartabc/content add -D payload@3.86.0 @payloadcms/richtext-lexical@3.86.0
pnpm add -Dw typescript@5.9.3 vitest@4.1.10 @playwright/test@1.62.1 @lhci/cli@0.15.1 @next/bundle-analyzer@16.2.11
pnpm -r up typescript@5.9.3 vitest@4.1.10 react@19.2.8 react-dom@19.2.8
pnpm --filter @jakartabc/email remove react-email
```

Pin every Payload peer dependency to `3.86.0`. Align workspace TypeScript on 5.9.3, Vitest on 4.1.10, and Playwright on 1.62.1. Do not adopt TypeScript 7 in this stabilization branch. Remove the unused `react-email` CLI package because template rendering uses `@react-email/components` and the CLI brings an obsolete production Next.js tree.

- [ ] **Step 4: Replace removed Next lint command**

Set both app lint scripts to `eslint --config ../../packages/config/eslint/index.js .`. Add `@next/eslint-plugin-next` to `packages/config` and expose it in the shared flat configuration:

```js
const nextPlugin = require('@next/eslint-plugin-next')

// in plugins
'@next/next': nextPlugin,

// in rules
...nextPlugin.configs.recommended.rules,
...nextPlugin.configs['core-web-vitals'].rules,
```

- [ ] **Step 5: Apply Next 16 and next-intl 4 compatibility changes**

Write `20.18.0` to `.nvmrc`. Rename each `middleware.ts` to `proxy.ts`, rename its exported handler to `proxy`, and retain the existing matcher behavior. Replace `unstable_setRequestLocale` with `setRequestLocale`. Update both Next configs and Payload route components to the installed Next 16/Payload 3.86 typed APIs while preserving route URLs and behavior.

- [ ] **Step 6: Generate the Payload import map and types using the upgraded CLI**

Run:

```bash
pnpm --filter @jakartabc/web exec payload generate:importmap
pnpm --filter @jakartabc/content generate:types
```

Expected: both commands exit 0 and generated output imports Payload 3.86 APIs.

- [ ] **Step 7: Verify the upgrade barrier**

Run:

```bash
pnpm check:payload-versions
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm --filter @jakartabc/web exec vitest run --maxWorkers=2
pnpm --filter @jakartabc/portal exec vitest run --maxWorkers=2
pnpm audit:prod
```

Expected: version check, install, lint, typecheck, and existing passing suites exit 0. The enforced audit gate permits only `GHSA-w3rx-r6r6-pgpr` and `GHSA-5p2g-fcmc-qvqq` through 2026-09-09; it rejects every other critical/high advisory and rejects both exceptions after that date.

- [ ] **Step 8: Write the production audit policy tests and verify red**

Create `scripts/production-audit-policy.test.mjs` using `node:test`. Import `validatePolicy` and `evaluateAuditReport` from `scripts/production-audit-policy.mjs`. Cover: both approved advisories pass on 2026-09-09; both fail on 2026-09-10; an unexpected high fails; any critical fails; extra/missing exception IDs fail; missing reason, owner, expiry, or upstream follow-up fails; and changes to the JPEG/PNG/WebP, AVIF/HEIF/JXL/ICNS, admin/editor write, or public-read contract fail.

Run: `node --test scripts/production-audit-policy.test.mjs`

Expected: FAIL because the policy module does not exist.

- [ ] **Step 9: Implement the exact, expiring audit exception**

Create `docs/security/production-audit-exceptions.json` with only the two approved GHSA IDs, `expiresOn: "2026-09-09"`, owner `JakartaBC platform owner`, a reason explaining the Payload 3.86.0 `image-size@2.0.2` dependency and not-yet-enforced Tasks 3/4 controls, and advisory/upstream follow-up links. Encode `allowedMimeTypes` as `image/jpeg`, `image/png`, `image/webp`; `rejectedFormats` as `AVIF`, `HEIF`, `JXL`, `ICNS`; `writeRoles` as `admin`, `editor`; and `publicRead: true`.

`scripts/production-audit-policy.mjs` must hard-code the exact approved ID set independently of metadata, validate all metadata and mitigation values, treat 2026-09-09 as inclusive, and return failures for every unapproved critical/high advisory. `scripts/check-production-audit.mjs` must accept audit JSON only through stdin, fail closed on empty, malformed, error-shaped, or missing-advisory input, print allowed exceptions and all failures, and own the pipeline's final status. Add root script `"audit:prod": "pnpm audit --prod --json | node scripts/check-production-audit.mjs"`; raw `pnpm audit --prod` remains available for diagnosis.

- [ ] **Step 10: Verify the audit policy and live gate**

Run:

```bash
node --test scripts/production-audit-policy.test.mjs
pnpm audit:prod
```

Expected: focused tests exit 0; the live gate reports exactly the two allowed `image-size` highs, retains the two visible moderate advisories, and exits 0.

- [ ] **Step 11: Commit the exclusive dependency barrier**

```bash
git add .nvmrc package.json apps packages docs/security scripts/check-payload-versions.mjs scripts/check-production-audit.mjs scripts/production-audit-policy.mjs scripts/production-audit-policy.test.mjs pnpm-lock.yaml
git commit -m "chore: upgrade Next and Payload security baseline"
```

## Task 2: Add the shared environment and infrastructure contracts

**Files:**

- Modify: `apps/web/src/env.ts`
- Modify: `apps/web/src/env.test.ts`
- Modify: `apps/portal/src/env.ts`
- Create: `apps/portal/src/env.test.ts`
- Create: `apps/web/src/lib/redis/client.ts`
- Create: `apps/web/src/lib/redis/client.test.ts`
- Modify: `apps/portal/src/lib/payload.ts`
- Modify: `turbo.json`

- [ ] **Step 1: Write failing environment tests**

Test the exact shared variables and production Turnstile rejection:

```ts
const shared = {
  DATABASE_URL: 'postgres://user:pass@db:5432/jakartabc',
  REDIS_URL: 'redis://redis:6379',
  REDIS_KEY_PREFIX: 'jakartabc:test',
  MINIO_ENDPOINT: 'http://minio:9000',
  MINIO_REGION: 'us-east-1',
  MINIO_BUCKET: 'jakartabc',
  MINIO_ACCESS_KEY: 'access',
  MINIO_SECRET_KEY: 'secret',
  MINIO_PUBLIC_URL: 'https://media.example.test/jakartabc',
  MINIO_FORCE_PATH_STYLE: 'true',
}

expect(parseServerEnv({ ...shared, NODE_ENV: 'test' }).MINIO_FORCE_PATH_STYLE).toBe(true)
expect(() =>
  parseServerEnv({
    ...shared,
    NODE_ENV: 'production',
    TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA',
  }),
).toThrow(/test credential/i)
```

- [ ] **Step 2: Run environment tests and verify red**

Run: `pnpm --filter @jakartabc/web test src/env.test.ts && pnpm --filter @jakartabc/portal test src/env.test.ts`

Expected: FAIL because parsers do not expose the shared contract and production test-key guard.

- [ ] **Step 3: Export pure parsers and validated values**

Both env modules export `parseServerEnv(input: NodeJS.ProcessEnv)` for tests and `env = parseServerEnv(process.env)` for runtime. Web adds the exact shared variables from the spec plus `TRUSTED_PROXY_SECRET` with minimum 32 characters. Portal consumes `DATABASE_URL`, the shared `PAYLOAD_SECRET`, `PORTAL_COOKIE_DOMAIN`, and `NEXT_PUBLIC_PORTAL_URL`; remove `PORTAL_PAYLOAD_SECRET`.

Use this boolean parser:

```ts
const booleanString = z.enum(['true', 'false']).transform((value) => value === 'true')
```

- [ ] **Step 4: Write the failing lazy Redis-client tests**

```ts
it('creates one client and reconnects through the same promise', async () => {
  const createClient = vi.fn(() => fakeRedisClient())
  const getRedis = makeRedisGetter(createClient, 'redis://redis:6379')
  expect(await getRedis()).toBe(await getRedis())
  expect(createClient).toHaveBeenCalledTimes(1)
})

it('redacts the Redis URL from connection errors', async () => {
  const getRedis = makeRedisGetter(
    () => failingRedisClient('redis://user:secret@redis:6379'),
    'redis://user:secret@redis:6379',
  )
  await expect(getRedis()).rejects.not.toThrow(/secret/)
})
```

- [ ] **Step 5: Implement the lazy client**

`client.ts` exports `RedisUnavailableError`, `makeRedisGetter`, and `getRedis`. Attach an error listener that logs only a stable event name, call `connect()` once, and reset the cached promise after a failed initial connection so recovery is possible.

- [ ] **Step 6: Make Turbo pass shared runtime variables without values in source**

Extend only Turbo's `env` allowlists with the variable names. Never put credential values in `turbo.json`.

- [ ] **Step 7: Verify and commit**

Run: `pnpm --filter @jakartabc/web test src/env.test.ts src/lib/redis/client.test.ts && pnpm --filter @jakartabc/portal test src/env.test.ts && pnpm typecheck`

Expected: all named tests and typecheck pass.

```bash
git add apps/web/src/env.ts apps/web/src/env.test.ts apps/web/src/lib/redis apps/portal/src/env.ts apps/portal/src/env.test.ts apps/portal/src/lib/payload.ts turbo.json
git commit -m "feat: define shared infrastructure environment contract"
```

## Task 3: Define one Users collection and enforce RBAC

**Files:**

- Create: `packages/content/src/access/roles.ts`
- Create: `packages/content/src/access/roles.test.ts`
- Create: `packages/content/src/collections/Users.ts`
- Create: `packages/content/src/collections/Users.test.ts`
- Modify: `packages/content/src/index.ts`
- Modify: `apps/web/src/payload.config.ts`
- Modify: `apps/portal/src/payload.config.ts`
- Modify/test: every editorial collection access test

- [ ] **Step 1: Write the role-matrix tests**

```ts
const req = (role?: Role) => ({ req: { user: role ? { role } : null } })

expect(adminOnly(req('admin'))).toBe(true)
expect(adminOnly(req('editor'))).toBe(false)
expect(editorialOnly(req('admin'))).toBe(true)
expect(editorialOnly(req('editor'))).toBe(true)
expect(editorialOnly(req('client'))).toBe(false)
expect(canAccessAdmin(req('client'))).toBe(false)
expect(canAccessAdmin(req('editor'))).toBe(true)
```

Also table-test anonymous published reads and authenticated draft reads.

- [ ] **Step 2: Run the access tests and verify red**

Run: `pnpm --filter @jakartabc/content test src/access/roles.test.ts src/collections/Users.test.ts`

Expected: FAIL because shared helpers and Users do not exist.

- [ ] **Step 3: Implement pure access helpers**

```ts
export type Role = 'admin' | 'editor' | 'client'

const roleOf = ({ req }: { req: { user?: unknown } }): Role | undefined => {
  const role = (req.user as { role?: unknown } | undefined)?.role
  return role === 'admin' || role === 'editor' || role === 'client' ? role : undefined
}

export const adminOnly = (args: Parameters<typeof roleOf>[0]) => roleOf(args) === 'admin'
export const editorialOnly = (args: Parameters<typeof roleOf>[0]) => {
  const role = roleOf(args)
  return role === 'admin' || role === 'editor'
}
export const clientOnly = (args: Parameters<typeof roleOf>[0]) => roleOf(args) === 'client'
export const canAccessAdmin = editorialOnly
```

`publishedOrEditorial` returns true for admin/editor and `{ _status: { equals: 'published' } }` otherwise.

- [ ] **Step 4: Implement shared Users**

Users keeps the existing auth timing/lock settings, sets `role.saveToJWT = true`, defaults to `client`, uses `adminOnly` for create/delete, and prevents non-admin role mutation. Permit the minimum authenticated self-read required by the portal, expressed as `{ id: { equals: req.user.id } }`; admins can read all users.

- [ ] **Step 5: Replace both copied Users definitions**

Import `Users` in both Payload configs. Web sets `admin.user = Users.slug` and `admin.access = canAccessAdmin`. Portal sets `admin.disable = true`, imports the same Users, uses `env`, and sets `push: false` on its PostgreSQL adapter.

- [ ] **Step 6: Apply role helpers to collection owners**

Editorial collections use `editorialOnly` for create/update/delete and `publishedOrEditorial` for public reads. Lead collections temporarily receive admin-only read/update/delete but schema and direct-create denial are completed by Tasks 11 and 12. Media uses published/public read plus editorial mutation.

- [ ] **Step 7: Verify role behavior**

Run: `pnpm --filter @jakartabc/content test && pnpm --filter @jakartabc/web typecheck && pnpm --filter @jakartabc/portal typecheck`

Expected: all access matrix tests and both typechecks pass.

- [ ] **Step 8: Commit the RBAC barrier**

```bash
git add packages/content/src/access packages/content/src/collections packages/content/src/index.ts apps/web/src/payload.config.ts apps/portal/src/payload.config.ts
git commit -m "feat: enforce shared Payload role access"
```

## Task 4: Move Payload media to public-read MinIO

**Files:**

- Modify: `packages/content/src/collections/Media.ts`
- Modify: `packages/content/src/collections/Media.test.ts`
- Modify: `apps/web/src/payload.config.ts`
- Create: `apps/web/src/payload.config.test.ts`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `scripts/copy-media-to-minio.ts`
- Create: `scripts/copy-media-to-minio.test.ts`

- [ ] **Step 1: Write failing media-policy tests**

Assert the collection allows only `image/jpeg`, `image/png`, and `image/webp`;
rejects AVIF/HEIF, JXL, ICNS, and SVG; rejects declared MIME/signature
mismatches before Payload invokes `image-size`; caps buffered and temporary
files at 5,000,000 bytes; and keeps editorial-only writes with public reads.

```ts
expect(Media.upload?.mimeTypes).toEqual(['image/jpeg', 'image/png', 'image/webp'])
```

- [ ] **Step 2: Run media tests and verify red**

Run: `pnpm --filter @jakartabc/content exec vitest run src/collections/Media.test.ts --maxWorkers=2`

Expected: FAIL because the current collection does not match the approved type policy.

- [ ] **Step 3: Configure the official adapter**

Add to web Payload plugins:

```ts
s3Storage({
  collections: { media: { prefix: 'media' } },
  bucket: env.MINIO_BUCKET,
  generateFileURL: ({ filename, prefix }) => {
    const key = [prefix, filename].filter(Boolean).map(encodeURIComponent).join('/')
    return new URL(key, `${env.MINIO_PUBLIC_URL.replace(/\/$/, '')}/`).toString()
  },
  config: {
    endpoint: env.MINIO_ENDPOINT,
    region: env.MINIO_REGION,
    forcePathStyle: env.MINIO_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: env.MINIO_ACCESS_KEY,
      secretAccessKey: env.MINIO_SECRET_KEY,
    },
  },
})
```

The result for `filename = logo.webp` and `prefix = media` must be `${env.MINIO_PUBLIC_URL}/media/logo.webp`. Typecheck the installed Payload 3.86.0 `generateFileURL` signature before running tests; a signature mismatch is a platform-barrier defect and must be corrected in this task.

- [ ] **Step 4: Write copy-script tests before the script**

Tests use a temporary source directory and fake S3 client. Assert prefix mapping,
content length, SHA-256 comparison, dry-run no-write behavior, skip of matching
objects, and nonzero exit on mismatch. Also assert sequential bounded planning,
source-root symlink rejection, the 5,000,000-byte bound for local snapshots and
remote streams, and conditional creates with `If-None-Match: *`. If a competing
writer wins, re-read the authoritative object once: an exact body is a skip and
a mismatch is a nonzero result without retrying the write.

- [ ] **Step 5: Implement the deterministic copy script**

The root command `pnpm media:copy` accepts `--source`, `--dry-run`, and
`--verify-only`. Its cwd-independent default source is the repository's
`apps/web/uploads` directory. It never deletes source files or overwrites an
existing object. It prints only counts and object keys, never credentials.
Export its pure planner/verifier functions so tests do not require MinIO.

The migration command is an operator/build-time tool, not part of the minimal
production runtime image. Run it from a checkout or builder stage that has the
root development dependencies installed with `pnpm install --frozen-lockfile`;
the root manifest directly owns both `tsx` and `@aws-sdk/client-s3`, so the
command does not depend on another workspace package's `node_modules`.

Smoke the exact default-source command from outside the repository cwd:

```bash
pnpm --dir /absolute/path/to/jakartabc.com media:copy -- --dry-run
```

Task 14 remains responsible for the production copy/verify rehearsal, URL
switch, rollback window, and legacy-source retention.

- [ ] **Step 6: Verify and commit**

Run the three focused commands sequentially:

```bash
pnpm --filter @jakartabc/content exec vitest run src/collections/Media.test.ts --maxWorkers=2
apps/web/node_modules/.bin/vitest run scripts/copy-media-to-minio.test.ts --maxWorkers=2 --root .
pnpm --filter @jakartabc/web typecheck
```

Expected: media, script, and type checks pass.

```bash
git add packages/content/src/collections/Media.ts packages/content/src/collections/Media.test.ts apps/web/src/payload.config.ts apps/web/src/payload.config.test.ts scripts/copy-media-to-minio.ts scripts/copy-media-to-minio.test.ts package.json pnpm-lock.yaml docs/superpowers/specs/2026-08-09-stabilization-and-security-hardening-design.md docs/superpowers/plans/2026-08-09-stabilization-and-security-hardening.md
git commit -m "feat: store public media in shared MinIO"
```

## Task 5: Harden portal role checks and redirect handling

**Parallel ownership:** Wave 1, Worker A. Do not edit web, content, manifests, migrations, or generated files.

**Files:**

- Create: `apps/portal/src/lib/safe-redirect.ts`
- Create: `apps/portal/src/lib/safe-redirect.test.ts`
- Modify: `apps/portal/src/lib/auth.ts`
- Modify: `apps/portal/src/lib/auth.test.ts`
- Modify: `apps/portal/src/components/LoginFormWired.tsx`
- Modify: `apps/portal/src/app/page.tsx`
- Modify: `apps/portal/src/app/page.test.tsx`
- Modify: `apps/portal/src/app/dashboard/page.tsx`
- Modify: `apps/portal/src/app/dashboard/page.test.tsx`
- Modify: `apps/portal/e2e/auth.spec.ts`

- [ ] **Step 1: Write the hostile redirect corpus**

```ts
it.each([
  ['https://evil.test', '/dashboard'],
  ['//evil.test', '/dashboard'],
  ['\\\\evil.test', '/dashboard'],
  ['/%2f%2fevil.test', '/dashboard'],
  ['/%5c%5cevil.test', '/dashboard'],
  ['/dashboard%0d%0aLocation:https://evil.test', '/dashboard'],
  ['', '/dashboard'],
  ['/dashboard/invoices?year=2026', '/dashboard/invoices?year=2026'],
])('canonicalizes %s', (input, expected) => {
  expect(safeNextPath(input)).toBe(expected)
})
```

- [ ] **Step 2: Verify redirect tests fail**

Run: `pnpm --filter @jakartabc/portal test src/lib/safe-redirect.test.ts`

Expected: FAIL because `safeNextPath` does not exist.

- [ ] **Step 3: Implement canonical same-origin path validation**

Decode at most twice, reject decode errors/control characters/backslashes, require one leading slash, reject a second slash, and parse against `https://portal.invalid`. Return the parsed pathname/search/hash only when origin stays `https://portal.invalid`; otherwise return `/dashboard`.

- [ ] **Step 4: Write failing role-boundary tests**

Assert login for admin/editor returns `{ ok: false, error: 'forbidden' }` and writes no cookie; `getCurrentUser` returns null for non-client roles; dashboard redirects any non-client session to login.

- [ ] **Step 5: Implement defense-in-depth client-only access**

Extend `LoginResult` with `forbidden`. After `payload.login`, require `result.user?.role === 'client'` before setting the cookie. `getCurrentUser` returns a user only for the client role. Dashboard and root routing repeat the role check server-side. Middleware remains only a cookie-presence optimization and is never documented as authorization.

- [ ] **Step 6: Consume only `safeNextPath` in the login component**

Remove inline prefix logic. Pass the sanitized target to `router.replace` after successful login.

- [ ] **Step 7: Verify and commit the portal lane**

Run: `pnpm --filter @jakartabc/portal test && pnpm --filter @jakartabc/portal typecheck`

Expected: all portal unit tests pass and typecheck exits 0.

```bash
git add apps/portal
git commit -m "fix: restrict portal sessions to client users"
```

## Task 6: Implement atomic Redis abuse controls, trusted IP, and Turnstile policy

**Parallel ownership:** Wave 1, Worker B. Own only the listed web environment/request/anti-spam files.

**Files:**

- Modify: `apps/web/src/lib/anti-spam/rate-limit.ts`
- Modify: `apps/web/src/lib/anti-spam/rate-limit.test.ts`
- Create: `apps/web/src/lib/anti-spam/idempotency.ts`
- Create: `apps/web/src/lib/anti-spam/idempotency.test.ts`
- Create: `apps/web/src/lib/request/client-ip.ts`
- Create: `apps/web/src/lib/request/client-ip.test.ts`
- Modify: `apps/web/src/lib/anti-spam/turnstile.ts`
- Modify: `apps/web/src/lib/anti-spam/turnstile.test.ts`
- Modify: `apps/web/src/env.ts`
- Modify: `apps/web/src/env.test.ts`

- [ ] **Step 1: Write failing atomic-rate tests**

Use a fake Redis `eval` implementation and assert the sixth request is denied, `retryAfter` is positive, keys start with `jakartabc:test:rate:contact:`, and raw IP/email values never occur in the key.

```ts
const results = await Promise.all(
  Array.from({ length: 6 }, () => limiter.rateLimit('contact', '203.0.113.9:user@example.test')),
)
expect(results.filter((result) => result.allowed)).toHaveLength(5)
expect(redis.keys.join(' ')).not.toContain('user@example.test')
expect(redis.keys.join(' ')).not.toContain('203.0.113.9')
```

- [ ] **Step 2: Verify rate tests fail**

Run: `pnpm --filter @jakartabc/web test src/lib/anti-spam/rate-limit.test.ts`

Expected: FAIL because the limiter is synchronous and process-local.

- [ ] **Step 3: Implement the Redis Lua limiter**

The script increments and sets expiry atomically on the first hit, reads TTL, and returns `{ count, ttl }`. Hash normalized identity with HMAC-SHA-256 using `PAYLOAD_SECRET`. Set window to 3600 seconds and limit to five. Convert Redis failures to `RedisUnavailableError`; do not fall back to memory.

- [ ] **Step 4: Write idempotency state tests**

```ts
expect(await coordinator.acquire(id)).toBe('acquired')
expect(await coordinator.acquire(id)).toBe('in-progress')
await coordinator.complete(id)
expect(await coordinator.acquire(id)).toBe('completed')
expect(redis.ttlForLock).toBe(30)
expect(redis.ttlForCompleted).toBe(86_400)
```

- [ ] **Step 5: Implement lock/complete/release**

Use `SET key value NX EX 30` for the lock, a completed marker with 24-hour expiry, and a compare-token Lua delete so one request cannot release another request's lock. Export `createSubmissionCoordinator(redis, prefix, secret)` and the environment-bound singleton.

- [ ] **Step 6: Write trusted-client tests**

Cases: valid proxy proof uses the first normalized `x-forwarded-for`; invalid/missing proof ignores all forwarding headers and returns `unknown`; malformed/multiline input returns `unknown`.

- [ ] **Step 7: Implement trusted proxy proof**

The reverse proxy overwrites `x-jbc-proxy-secret`. Compare its value to `TRUSTED_PROXY_SECRET` with `timingSafeEqual` over equal-length buffers. Only then read `x-forwarded-for`; never use browser-supplied `cf-connecting-ip` directly.

- [ ] **Step 8: Test and implement Turnstile hostname validation**

Extend response parsing with `hostname`. Require `success === true` and hostname equal to `new URL(NEXT_PUBLIC_SITE_URL).hostname`. Remove the test-token bypass from runtime code. Test credentials are accepted only when `NODE_ENV !== 'production'`; production env parsing rejects known Cloudflare test keys.

- [ ] **Step 9: Verify and commit the abuse-control lane**

Run: `pnpm --filter @jakartabc/web test src/lib/anti-spam src/lib/request src/env.test.ts && pnpm --filter @jakartabc/web typecheck`

Expected: atomic concurrency, outage, key-redaction, trusted-proxy, and Turnstile tests pass.

```bash
git add apps/web/src/lib/anti-spam apps/web/src/lib/request apps/web/src/env.ts apps/web/src/env.test.ts
git commit -m "feat: coordinate abuse protection through Redis"
```

## Task 7: Complete content publication and cache invalidation

**Parallel ownership:** Wave 1, Worker C. Do not edit migrations, generated types, app pages, or manifests.

**Files:**

- Create: `packages/content/src/cache/tags.ts`
- Create: `packages/content/src/cache/tags.test.ts`
- Modify: `packages/content/src/hooks/revalidate.ts`
- Modify: `packages/content/src/hooks/revalidate.test.ts`
- Modify/test: `packages/content/src/collections/Insights.ts`
- Modify/test: `packages/content/src/collections/Services.ts`
- Modify/test: `packages/content/src/collections/Authors.ts`
- Modify/test: `packages/content/src/collections/Categories.ts`
- Modify/test: `packages/content/src/collections/Regulations.ts`
- Modify/test: `packages/content/src/collections/Media.ts`
- Modify/test: `packages/content/src/globals/NavMenu.ts`
- Modify/test: `packages/content/src/globals/Footer.ts`
- Modify: `packages/content/src/globals/SiteSettings.ts`
- Create: `packages/content/src/globals/SiteSettings.test.ts`
- Create/test: `packages/content/src/cache/revalidateTask.ts`
- Modify/test: `apps/web/src/payload.config.ts`
- Modify: `packages/content/package.json` (cache subpath export only)

- [ ] **Step 1: Test deterministic cache tags**

```ts
expect(insightTags({ slug: 'new', previousSlug: 'old', locales: ['en', 'id'] })).toEqual([
  'insights:en',
  'insight:en:new',
  'insight:en:old',
  'insights:id',
  'insight:id:new',
  'insight:id:old',
])
```

Add cases for author/category/regulation/media dependencies, services, and both `site:en` and `site:id` globals. Assert deterministic deduplication.

- [ ] **Step 2: Verify tag tests fail**

Run: `pnpm --filter @jakartabc/content test src/cache/tags.test.ts`

Expected: FAIL because tag builders do not exist.

- [ ] **Step 3: Implement tag builders**

Use pure functions that accept minimal document identity and return sorted/deduplicated strings. Do not import Next.js into the content package.

- [ ] **Step 4: Test change and delete hooks**

Assert `makeRevalidateHook` receives `previousDoc` and queues both old/new route
tags with the same Payload request. Assert new `makeRevalidateDeleteHook` queues
tags from the deleted document. A queue failure logs a stable message and
propagates so the mutation rolls back. The task owns outbound fetches and throws
on timeout or any failed chunk so Payload retries it.

- [ ] **Step 5: Implement hook factories and attach them**

Attach `afterChange` and `afterDelete` to every public collection. Attach change hooks to NavMenu, Footer, and SiteSettings. Related author/category/regulation/media changes invalidate Insight list/detail dependents conservatively.

The hooks enqueue a `revalidate-cache` Payload job with the same request so the
job insert participates in the content mutation transaction. The job handler
runs after commit, posts deterministic chunks of at most 100 canonical tags,
uses a bounded request timeout, and throws on any failed chunk. Configure the
dedicated queue with bounded autorun and bounded exponential retries. Keep
legacy Insight/service/pricing tags until Tasks 13 and 15 migrate their
consumers. Direct queue/run/cancel access is admin-only; mutation hooks use the
trusted local API with their existing request transaction.

- [ ] **Step 6: Remove custom Insight publication behavior**

Delete the custom `status` field from the collection config, change default columns to `_status`, keep `versions: { drafts: true }`, and use `publishedOrEditorial` for reads. Do not drop database columns here; Task 14 owns compatibility migration.

- [ ] **Step 7: Verify and commit the content lane**

Run: `pnpm --filter @jakartabc/content test && pnpm --filter @jakartabc/content typecheck && pnpm --filter @jakartabc/web test src/payload.config.test.ts && pnpm --filter @jakartabc/web typecheck`

Expected: all content/config tests and typechecks pass; hook tests cover
create/update/delete/old slug, the same transactional request is passed to the
job queue, and the worker covers timeout/retry/chunk boundaries.

```bash
git add packages/content/src/cache packages/content/src/hooks packages/content/src/collections packages/content/src/globals packages/content/package.json apps/web/src/payload.config.ts apps/web/src/payload.config.test.ts docs/superpowers/plans/2026-08-09-stabilization-and-security-hardening.md
git commit -m "fix: invalidate all affected CMS cache tags"
```

## Wave 1 merge and review gate

- [ ] Dispatch one spec reviewer per Task 5, 6, and 7 with its full task text and commit SHA.
- [ ] Return every spec gap to the original implementer and re-review until approved.
- [ ] Dispatch code-quality reviews only after spec approval; fix Important/Critical findings and re-review.
- [ ] Cherry-pick Task 5, then Task 6, then Task 7 into the integration branch.
- [ ] Run: `pnpm --filter @jakartabc/portal test && pnpm --filter @jakartabc/web test && pnpm --filter @jakartabc/content test && pnpm typecheck`.
- [ ] Expected: all formerly green suites stay green; new security/cache tests pass.

## Task 8: Keep a stable browser submission ID across retries

**Parallel ownership:** Wave 2, Worker A. Do not edit server actions or lead collections.

**Files:**

- Modify: `apps/web/src/components/ContactFormWired.tsx`
- Create: `apps/web/src/components/ContactFormWired.test.tsx`
- Modify: `apps/web/src/components/BookingFormWired.tsx`
- Modify: `apps/web/src/components/BookingFormWired.test.tsx`
- Modify: `apps/web/src/lib/validation/contact.ts`
- Modify: `apps/web/src/lib/validation/contact.test.ts`
- Modify: `apps/web/src/lib/validation/booking.ts`
- Modify: `apps/web/src/lib/validation/booking.test.ts`

- [ ] **Step 1: Write schema tests for UUID submission IDs**

Assert missing, malformed, and reused non-UUID values fail validation; valid UUIDs pass.

- [ ] **Step 2: Write component retry tests**

Mock `crypto.randomUUID` with two values. Assert initial submit uses the first, a failed/retryable response reuses the first, and an accepted response rotates state so the next new message uses the second.

- [ ] **Step 3: Verify red**

Run: `pnpm --filter @jakartabc/web test src/lib/validation src/components/ContactFormWired.test.tsx src/components/BookingFormWired.test.tsx`

Expected: FAIL because schemas and forms do not manage `submissionId`.

- [ ] **Step 4: Implement stable attempt identity**

Create the UUID lazily in component state/ref, append it to `FormData`, retain it for all non-accepted outcomes, and rotate only after `{ ok: true }`. Do not generate it inside the server action.

- [ ] **Step 5: Verify and commit**

Run the same test command plus `pnpm --filter @jakartabc/web typecheck`.

Expected: validation, component retry, and type checks pass.

```bash
git add apps/web/src/components apps/web/src/lib/validation
git commit -m "feat: preserve form submission identity across retries"
```

## Task 9: Replace the partial rich-text traversal with the supported renderer

**Parallel ownership:** Wave 2, Worker B. Own only rich-text and shared URL-policy modules.

**Files:**

- Create: `apps/web/src/lib/url/safe-url.ts`
- Create: `apps/web/src/lib/url/safe-url.test.ts`
- Modify: `apps/web/src/lib/richTextRender.tsx`
- Modify: `apps/web/src/lib/richTextRender.test.tsx`

- [ ] **Step 1: Write the safe URL corpus**

```ts
expect(safeHref('/id/services')).toBe('/id/services')
expect(safeHref('https://example.test/a')).toBe('https://example.test/a')
expect(safeHref('javascript:alert(1)')).toBeNull()
expect(safeHref('data:text/html,boom')).toBeNull()
expect(safeHref('//evil.test')).toBeNull()
expect(safeHref('\\\\evil.test')).toBeNull()
expect(safeHref('%6a%61vascript:alert(1)')).toBeNull()
```

- [ ] **Step 2: Write complete Lexical fixtures**

Add fixtures/assertions for headings, paragraphs, bold/italic/underline marks, line breaks, ordered/unordered/nested lists, blockquotes, links, upload nodes, relationships, and `pullQuote`, `dropCap`, `regulationCite` blocks. Unsafe links render their text without an active anchor. An unknown node throws in test/development.

- [ ] **Step 3: Verify renderer tests fail for missing nodes**

Run: `pnpm --filter @jakartabc/web test src/lib/url/safe-url.test.ts src/lib/richTextRender.test.tsx`

Expected: failures for list, quote, upload, text marks, unsafe links, and unknown-node visibility.

- [ ] **Step 4: Implement canonical URL validation**

Decode at most twice, trim, reject controls/backslashes/protocol-relative URLs, and allow relative single-slash paths plus `http:`/`https:`. Export explicit options for `mailto:`/`tel:`; rich text keeps them disabled unless the CMS field contract requires them.

- [ ] **Step 5: Use Payload's React Lexical renderer**

Import the supported converter/render entry point from the installed Payload 3.86 rich-text package. Supply project converters for the three custom blocks and safe link handling. Preserve existing semantic UI components/classes without reimplementing core Lexical node traversal.

- [ ] **Step 6: Verify and commit**

Run the named tests plus `pnpm --filter @jakartabc/web typecheck`.

Expected: all supported nodes render and unsafe URLs never become anchors.

```bash
git add apps/web/src/lib/url apps/web/src/lib/richTextRender.tsx apps/web/src/lib/richTextRender.test.tsx
git commit -m "fix: render complete Payload rich text safely"
```

## Task 10: Fix mobile-menu accessibility and align UI tests with navy tokens

**Parallel ownership:** Wave 2, Worker C. Own only `packages/ui` files.

**Files:**

- Modify: `packages/ui/src/components/MobileMenu.tsx`
- Modify: `packages/ui/src/components/MobileMenu.test.tsx`
- Modify: `packages/ui/src/components/NavBar.tsx`
- Modify: `packages/ui/src/components/NavBar.test.tsx`
- Modify: `packages/ui/src/components/FooterBlock.tsx`
- Modify: `packages/ui/src/components/FooterBlock.test.tsx`
- Modify: `packages/ui/src/components/Button.test.tsx`

- [ ] **Step 1: Add failing focus and close tests**

Assert opening focuses the close/first meaningful control, Tab and Shift+Tab wrap inside the dialog, Escape invokes `onClose`, selection of each nav/CTA link invokes `onClose`, and close restores focus to the supplied trigger.

- [ ] **Step 2: Verify red**

Run: `pnpm --filter @jakartabc/ui test src/components/MobileMenu.test.tsx`

Expected: focus trap, link-close, and focus-return assertions fail.

- [ ] **Step 3: Implement focus lifecycle and route-close contract**

Add `triggerRef?: React.RefObject<HTMLElement | null>` and localized `labels` props. Keep refs to the dialog and close button, focus on open, trap focusable elements on Tab, close on Escape/link/CTA selection, restore the trigger after close, and retain body-scroll cleanup.

- [ ] **Step 4: Update semantic label propagation**

NavBar supplies its trigger ref and localized open/close/menu labels. Footer headings that are visually or programmatically labeled receive locale-aware props rather than hardcoded English.

- [ ] **Step 5: Correct exactly the five drifted design assertions**

Update one NavBar, two Button, and two FooterBlock assertions to the implemented navy semantic tokens. Do not change production colors to ochre/bone.

- [ ] **Step 6: Verify and commit**

Run: `pnpm --filter @jakartabc/ui test && pnpm --filter @jakartabc/ui typecheck`

Expected: 88/88 UI tests and typecheck pass.

```bash
git add packages/ui/src/components
git commit -m "fix: make mobile navigation keyboard complete"
```

## Wave 2 merge and review gate

- [ ] Complete spec and quality review loops for Tasks 8, 9, and 10.
- [ ] Cherry-pick Task 8, Task 9, then Task 10.
- [ ] Run: `pnpm --filter @jakartabc/web test && pnpm --filter @jakartabc/ui test && pnpm typecheck`.
- [ ] Expected: web tests pass, UI reports 88/88, and typecheck exits 0.

## Task 11: Make contact submissions durable and idempotent

**Parallel ownership:** Wave 3, Worker A. Own only contact collection/action/tests.

**Shared prerequisite:** Import the already-landed delivery field factory from
`packages/content/src/fields/submissionDelivery.ts` and delivery transitions from
`apps/web/src/lib/submissions/delivery.ts`. Import the fixed-statement initial-delivery CAS from
`apps/web/src/lib/submissions/deliveryClaim.ts`; never replace it with a Payload find-then-update.
Do not recreate or fork these helpers in this lane.

**Files:**

- Modify: `packages/content/src/collections/ContactMessages.ts`
- Modify: `packages/content/src/collections/ContactMessages.test.ts`
- Modify: `apps/web/src/app/[locale]/actions/contact.ts`
- Modify: `apps/web/src/app/[locale]/actions/contact.test.ts`

- [ ] **Step 1: Write collection contract tests**

Assert anonymous/direct create is false, only admins can read/update/delete, `submissionId` is unique/indexed but nullable for rolling compatibility, and delivery fields have the approved names/defaults.

- [ ] **Step 2: Write action failure/concurrency tests**

```ts
it('accepts once and records failed delivery when sales email fails', async () => {
  mail.fail(new Error('provider unavailable'))
  expect(await submitContact(formData(id))).toEqual({
    ok: true,
    submissionId: id,
    delivery: 'failed',
  })
  expect(db.rowsFor(id)).toHaveLength(1)
  expect(db.rowsFor(id)[0].deliveryStatus).toBe('failed')
})

it('creates one row for concurrent identical submissions', async () => {
  await Promise.all([submitContact(formData(id)), submitContact(formData(id))])
  expect(db.rowsFor(id)).toHaveLength(1)
})
```

Also assert Redis outage returns `temporarily-unavailable` and no database write, direct Local API create uses `overrideAccess: true`, honeypot returns accepted without persistence, and visitor email is best-effort.

- [ ] **Step 3: Verify red**

Run: `pnpm --filter @jakartabc/content test src/collections/ContactMessages.test.ts && pnpm --filter @jakartabc/web test 'src/app/[locale]/actions/contact.test.ts'`

Expected: FAIL because access, fields, async coordination, and delivery behavior are missing.

- [ ] **Step 4: Add additive fields and deny direct writes**

Spread a fresh result from `createSubmissionDeliveryFields()` into the collection. It adds
`submissionId`, `deliveryStatus`, `deliveryAttempts`, `lastDeliveryAttemptAt`, `deliveredAt`, and
bounded `deliveryError`. Keep `submissionId` nullable until the cleanup release. Admin UI may read
delivery fields but secrets/tokens are never stored.

- [ ] **Step 5: Implement the ordered transaction flow**

Validate, honeypot, trusted IP, Turnstile, Redis limit, acquire ID, and create/find by unique
submission ID with `overrideAccess: true`. Hydrate only the persisted delivery source and finish
the pure owner-mail render/preparation before the first renewal. Then renew the Redis lease, claim
the untouched row with the shared single-statement PostgreSQL CAS. Untouched means `pending`,
attempt zero, and null attempt timestamp, delivered timestamp, and delivery error. Then renew
again immediately before the provider call, send, and persist the final delivery state. A CAS
no-match must re-read and reconcile the durable row with zero send; malformed state/read failure
fails closed through `reconcilePersistedDelivery`. The completed-marker branch and every existing
non-resumable row use the same classifier; none may accept an untouched pending/attempt-zero row.
A stale worker must never use a Payload update-by-ID to write the pending transition.
Attempt visitor mail best-effort, mark Redis complete, and return accepted. On pre-persistence Redis
failure, return `temporarily-unavailable` with the UI fallback email. On an exception after lock
acquisition but before persistence, release the lock. A durable `deliveryAttempts >= 1` is never
automatically resent.

- [ ] **Step 6: Sanitize delivery errors**

Use the shared delivery attempt/transitions and sanitizer. Store at most its stable 500-character
event/error-class value; never store the raw provider message, email addresses, tokens, credential
or query URLs, or visitor content. Structured logs use submission ID and event name only.

- [ ] **Step 7: Verify and commit**

Run the named tests plus `pnpm --filter @jakartabc/web typecheck` and `pnpm --filter @jakartabc/content typecheck`.

Expected: all contact access, outage, duplication, mail-failure, and type checks pass.

```bash
git add packages/content/src/collections/ContactMessages.ts packages/content/src/collections/ContactMessages.test.ts 'apps/web/src/app/[locale]/actions/contact.ts' 'apps/web/src/app/[locale]/actions/contact.test.ts'
git commit -m "fix: make contact acceptance idempotent"
```

## Task 12: Make booking submissions durable and idempotent

**Parallel ownership:** Wave 3, Worker B. Own only booking collection/action/tests.

**Shared prerequisite:** Reuse the same already-landed field factory and web delivery helpers as
Task 11, including the fixed-statement initial-delivery PostgreSQL CAS. Do not edit those shared
files from this parallel lane.

**Files:**

- Modify: `packages/content/src/collections/BookingLeads.ts`
- Modify: `packages/content/src/collections/BookingLeads.test.ts`
- Modify: `apps/web/src/app/[locale]/actions/booking.ts`
- Modify: `apps/web/src/app/[locale]/actions/booking.test.ts`

- [ ] **Step 1: Write booking collection and action tests**

Mirror the contact security/delivery fields while retaining service and preferred-window fields. Add explicit cases for unknown service versus database/service lookup failure: only a confirmed empty service result returns `service-unknown`; rejected lookup returns `temporarily-unavailable`.

- [ ] **Step 2: Write concurrent and mail-failure tests**

Use one UUID across concurrent calls. Assert one booking row, one accepted result shape, failed sales mail stored as failed delivery, and visitor mail failure does not change acceptance.

- [ ] **Step 3: Verify red**

Run: `pnpm --filter @jakartabc/content test src/collections/BookingLeads.test.ts && pnpm --filter @jakartabc/web test 'src/app/[locale]/actions/booking.test.ts'`

Expected: FAIL for direct create access, fields, duplicate prevention, and mail semantics.

- [ ] **Step 4: Implement the same locked contract**

Use scope `booking`, the shared async coordinator, trusted client IP, explicit Local API
`overrideAccess: true`, unique submission lookup, a fresh `createSubmissionDeliveryFields()` result,
and the shared delivery transitions. Prepare the owner message before the first renewal; then use
renew -> initial CAS over the complete untouched-row predicate -> exact claimed-result validation
-> renew immediately before provider send.
A CAS no-match re-reads/reconciles with zero send, and an attempt count of at least one remains
ambiguous/non-retryable. Route completed-marker, existing non-resumable, and CAS no-match rows
through `reconcilePersistedDelivery`; an untouched pending/attempt-zero row is resumable only before
the CAS and fails closed in reconciliation. Do not duplicate Redis, SQL/CAS, error-redaction, field,
persisted-state, or email-transition helpers inside the action; import the shared interfaces locked
above.

- [ ] **Step 5: Verify and commit**

Run the named tests and both affected package typechecks.

Expected: booking access, service error classification, idempotency, mail-state, and type checks pass.

```bash
git add packages/content/src/collections/BookingLeads.ts packages/content/src/collections/BookingLeads.test.ts 'apps/web/src/app/[locale]/actions/booking.ts' 'apps/web/src/app/[locale]/actions/booking.test.ts'
git commit -m "fix: make booking acceptance idempotent"
```

## Task 13: Correct Insight cache queries and infrastructure error semantics

**Parallel ownership:** Wave 3, Worker C. Own only Insight app/seed files.

**Files:**

- Modify: `apps/web/src/lib/insightDetail.ts`
- Create: `apps/web/src/lib/insightDetail.test.ts`
- Modify: `apps/web/src/app/[locale]/insights/page.tsx`
- Modify: `apps/web/src/app/[locale]/insights/page.test.tsx`
- Modify: `apps/web/src/app/[locale]/insights/[slug]/page.tsx`
- Modify: `apps/web/src/app/[locale]/insights/[slug]/page.test.ts`
- Create: `apps/web/src/app/[locale]/insights/[slug]/page.test.tsx`
- Modify: `packages/content/src/seed/insights.ts`
- Modify: `packages/content/src/seed/insights.test.ts`

- [ ] **Step 1: Write query-shape and cache-tag tests**

Assert anonymous queries include `_status: { equals: 'published' }`, locale, slug, and tags `insights:<locale>` plus `insight:<locale>:<slug>`. Assert they never query custom `status`.

- [ ] **Step 2: Write error classification tests**

Mock Payload returning zero docs and assert `notFound()`; mock Payload rejection and assert the same error reaches the route/error boundary. For list pages, rejection must not render a false empty state.

- [ ] **Step 3: Verify red**

Run: `pnpm --filter @jakartabc/web test 'src/lib/insightDetail.test.ts' 'src/app/[locale]/insights'`

Expected: FAIL because current helpers swallow errors and use custom publication state.

- [ ] **Step 4: Remove catch-to-null/empty behavior**

Allow infrastructure exceptions to propagate. Call `notFound()` only after a successful query with no matching published document. Keep cache tags locale-specific and include related entity tags from the content tag module.

- [ ] **Step 5: Update seed documents**

Seed Insights with `_status: 'published'` through Payload draft semantics and remove custom `status` data. Keep deterministic slugs and locale content.

- [ ] **Step 6: Verify and commit**

Run affected web/seed tests and both package typechecks.

Expected: published query, cache, 404, operational-error, and seed tests pass.

```bash
git add apps/web/src/lib/insightDetail.ts apps/web/src/lib/insightDetail.test.ts 'apps/web/src/app/[locale]/insights' packages/content/src/seed/insights.ts packages/content/src/seed/insights.test.ts
git commit -m "fix: preserve Insight cache and error semantics"
```

## Wave 3 merge and review gate

- [x] Complete two-stage reviews for Tasks 11, 12, and 13.
- [x] Merge contact, booking, then Insight commits.
- [x] Resolve no schema artifact by regeneration yet; keep generated files owned by Task 14.
- [x] Run bounded equivalents of `pnpm --filter @jakartabc/content test && pnpm --filter @jakartabc/web test && pnpm typecheck`.
- [x] Result: content 156/156, web 407/407, and workspace typecheck passed on the integrated source tree.

## Task 14: Add delivery retry, generate one compatibility migration, and refresh artifacts

**Serialized barrier:** No other worker edits schema, configs, generated files, or manifests during this task.

**Files:**

- Modify/extend: `apps/web/src/lib/submissions/delivery.ts`
- Modify/extend: `apps/web/src/lib/submissions/delivery.test.ts`
- Modify/extend: `apps/web/src/lib/submissions/deliveryClaim.ts`
- Modify/extend: `apps/web/src/lib/submissions/deliveryClaim.test.ts`
- Create: `apps/web/src/scripts/retry-failed-deliveries.ts`
- Create: `apps/web/src/scripts/retry-failed-deliveries.test.ts`
- Modify: `apps/web/package.json`
- Create: `apps/web/src/migrations/20260809_000000_stabilization.ts`
- Create/update: the Payload migration snapshot emitted for this migration
- Modify: `apps/web/src/migrations/index.ts`
- Modify: `packages/content/src/generated/payload-types.ts`
- Modify: `apps/web/src/app/(payload)/admin/importMap.ts`

- [ ] **Step 1: Write delivery transition tests**

Extend the existing pure delivery-helper suite with retry claim behavior. Keep its established
attempt counting, deterministic clock, immutable transition, and sanitized-error contracts intact.

```ts
it('allows one retry worker to claim a failed delivery', async () => {
  const [a, b] = await Promise.all([retryDelivery(id), retryDelivery(id)])
  expect([a, b].filter((result) => result === 'sent')).toHaveLength(1)
  expect(mail.sendCount).toBe(1)
})
```

Add failed-to-sent, failed-to-failed attempt increment, already-sent no-op, missing row, and bounded sanitized-error cases for both collections.

- [ ] **Step 2: Verify retry tests fail**

Run: `pnpm --filter @jakartabc/web test src/lib/submissions/delivery.test.ts src/scripts/retry-failed-deliveries.test.ts`

Expected: FAIL because the retry command and conditional claim behavior do not exist yet.

- [ ] **Step 3: Implement conditional claim and retry command**

Extend the shared fixed-statement claim module for retry ownership. Claim only a row matching `id`,
the expected attempt count, and `deliveryStatus = failed`; transition to pending, increment attempts,
send, then set sent/failed. Keep collection/table identifiers selected from a closed allowlist and
all row values parameterized. The script accepts `--collection contact-messages|booking-leads`,
`--limit 100`, and `--dry-run`; it requires authenticated operational execution and logs IDs/status
only.

Do not automatically claim stale `pending` rows. A crash after the provider accepted a message but
before the final database update leaves an ambiguous outcome; relabeling it `failed` or retrying it
can send the owner message twice. Report stale pending IDs/status for authenticated operator audit
only. A pending retry requires separate provider-idempotency proof or an explicit manual decision.

- [ ] **Step 4: Add the package script**

Add `"delivery:retry": "tsx src/scripts/retry-failed-deliveries.ts"`.

- [ ] **Step 5: Generate the migration from final schema once**

Run: `pnpm --filter @jakartabc/web exec payload migrate:create stabilization`

Rename the generated timestamp consistently to `20260809_000000_stabilization` only if imports/snapshot names are updated together.

- [ ] **Step 6: Review and complete migration SQL**

The up migration must:

1. add nullable unique/indexed `submission_id` fields and delivery fields for both lead tables;
   backfill every legacy lead to `delivery_status = pending`, `delivery_attempts = 0`, and null
   attempt/delivered/error evidence before enforcing non-null/default constraints required by the
   runtime CAS;
2. add/check delivery-status enum or constraint with pending/sent/failed;
3. backfill Insight native `_status` and version `version__status` from old custom status values;
4. preserve old custom status columns and legacy media data;
5. add the media `prefix` column, backfill every null/empty legacy value to
   `media`, set the database default to `media`, and enforce the final generated
   schema without changing filenames or deleting local/MinIO objects;
6. avoid table rewrites that hold long exclusive locks when a nullable/additive operation suffices.
7. create the generated Payload Jobs Queue tables, enums, foreign keys, and
   indexes required by the registered `revalidate-cache` task; runtime schema
   push remains disabled.

The committed runtime remains gated behind the migration init container. Do not start a web or
portal process containing the CAS call sites until both lead tables have the new snake-case delivery
columns; a missing-column error is fail-closed, not a signal to fall back to Payload update-by-ID.

The down migration removes only the new additive fields/constraints and restores native status from retained custom columns. It never deletes MinIO or local media.

- [ ] **Step 7: Regenerate final artifacts**

Run:

```bash
pnpm --filter @jakartabc/content generate:types
pnpm --filter @jakartabc/web exec payload generate:importmap
pnpm typecheck
```

Expected: generation and typecheck exit 0; generated lead types include all
delivery fields, Insight uses `_status`, and generated Media types include the
storage `prefix` field. Generated types and migration snapshots also include
`payload-jobs` plus the `revalidate-cache` task input/output contract.

- [ ] **Step 8: Rehearse migration round trip on a disposable restored database**

Run the configured migrate-up, assertions, migrate-down, and migrate-up
sequence. Query row counts, statuses, and media prefixes before/after. Expected:
counts unchanged; publication state equivalent; one unique submission
constraint per lead table; every migrated media row has `prefix = 'media'`;
and a new media row receives the `media` database default. Before migration,
query every Insight and Service slug and assert it is at most 128 characters
and already lowercase kebab-case; abort and report invalid rows instead of
silently transforming them. Repeat the slug assertion after migration. Also
enqueue one revalidation job inside a rolled-back transaction and assert it is
absent, then enqueue/commit another job, assert it becomes visible, run the
dedicated worker, and assert successful completion removes it.

After migrate-up, create one untouched pending/attempt-zero row for each lead table and race two
initial CAS calls against it. Assert exactly one returns `claimed`, the other returns `not-claimed`,
the row is pending/attempt-one, `updated_at` advances, and a simulated stale claimant cannot regress
a subsequently sent row back to pending. Also assert an attempt-zero row carrying any non-null
attempt timestamp, delivered timestamp, or delivery error is not claimable. Repeat after down/up to
prove the runtime cannot precede the schema and both fixed table statements match the generated
migration.

- [ ] **Step 9: Verify and commit the artifact barrier**

Run retry tests, content/web tests, typecheck, and `git diff --check`.

```bash
git add apps/web/src/lib/submissions apps/web/src/scripts apps/web/package.json apps/web/src/migrations packages/content/src/generated/payload-types.ts 'apps/web/src/app/(payload)/admin/importMap.ts'
git commit -m "feat: add compatible lead delivery migration"
```

## Task 15: Drive site chrome, localization, and legal links from CMS

**Parallel ownership:** Wave 4, Worker A. Do not edit Docker/root tooling/env/manifests.

**Files:**

- Create: `apps/web/src/lib/siteChrome.ts`
- Create: `apps/web/src/lib/siteChrome.test.ts`
- Modify: `apps/web/src/app/[locale]/layout.tsx`
- Modify: `apps/web/src/components/LocalizedLayoutChrome.tsx`
- Create: `apps/web/src/components/LocalizedLayoutChrome.test.tsx`
- Modify: `apps/web/messages/en.json`
- Modify: `apps/web/messages/id.json`
- Modify: `apps/web/src/app/[locale]/services/[slug]/page.tsx`
- Create: `apps/web/src/app/[locale]/services/[slug]/page.test.tsx`
- Modify: `apps/web/src/app/[locale]/services/page.tsx`
- Modify: `apps/web/src/app/[locale]/pricing/page.tsx`
- Create: WOFF2 and license files under `apps/web/public/fonts/`
- Create: `apps/web/src/lib/fonts.ts`

- [ ] **Step 1: Test localized CMS global reads**

Mock `findGlobal` for NavMenu, Footer, and SiteSettings. Assert the active locale is passed, output includes configured brand/nav/address/email/licenses/legal links, and cache tags resolve to `site:en` or `site:id`.

- [ ] **Step 2: Test rendered chrome**

Assert CMS links replace hardcoded arrays, unconfigured legal links are omitted rather than pointing at 404s, localized mobile labels reach UI props, and external safe links get appropriate attributes.

- [ ] **Step 3: Test Indonesian literal leakage and service errors**

Render representative Indonesian service/pricing states and assert selected English literals are absent. A successful empty service query becomes 404; a rejected query propagates.

- [ ] **Step 4: Verify red**

Run: `pnpm --filter @jakartabc/web test src/lib/siteChrome.test.ts src/components/LocalizedLayoutChrome.test.tsx 'src/app/[locale]/services' 'src/app/[locale]/pricing/page.test.tsx'`

Expected: FAIL because globals are unused and literals/errors remain.

- [ ] **Step 5: Implement cached global composition**

Fetch the three globals server-side by locale, normalize them into one serializable `SiteChrome` value, tag with `site:en` or `site:id`, and pass it to the client chrome component. Never import Payload client/config into the browser bundle.

- [ ] **Step 6: Replace web Google Fonts with committed local subsets**

Add WOFF2 subsets and their license text under `apps/web/public/fonts/`. `apps/web/src/lib/fonts.ts` uses `next/font/local` for the existing display/body families and weights and exports their CSS-variable objects. The locale layout imports these objects. Run `rg -n "next/font/google" apps/web` and expect no output.

- [ ] **Step 7: Complete message catalogs and safe link output**

Move service pricing headings, partner role, booking feedback, contact labels, menu labels, and footer headings into both JSON catalogs. Route every CMS URL through `safeHref`.

- [ ] **Step 8: Verify and commit**

Run affected tests, full web tests, and web typecheck.

Expected: CMS/global, locale, legal-link, 404/error tests pass.

```bash
git add apps/web/src/lib/siteChrome.ts apps/web/src/lib/siteChrome.test.ts 'apps/web/src/app/[locale]' apps/web/src/components/LocalizedLayoutChrome.tsx apps/web/src/components/LocalizedLayoutChrome.test.tsx apps/web/messages
git commit -m "fix: render localized CMS site chrome"
```

## Task 16: Make Docker, fonts, and local commands lightweight and secret-safe

**Parallel ownership:** Wave 4, Worker B. Own build/runtime/tooling files only.

**Files:**

- Modify: `.env.example`
- Modify: `package.json`
- Modify: `turbo.json`
- Modify: `apps/web/package.json`
- Modify: `apps/portal/package.json`
- Modify: all workspace `vitest.config.ts`; create missing content/email configs
- Modify: `apps/web/Dockerfile`
- Modify: `apps/portal/Dockerfile`
- Modify: `docker-compose.yml`
- Modify: `apps/web/next.config.ts`
- Modify: `apps/portal/next.config.ts`
- Add: required WOFF2 and license files under `apps/portal/public/fonts/`
- Create: `apps/portal/src/lib/fonts.ts`
- Modify: `apps/portal/src/app/layout.tsx`
- Create: `scripts/verify-runtime-image.sh`
- Modify: `docs/local-prod-deploy.md`
- Modify: `README.md`

- [ ] **Step 1: Write config assertions**

Create `scripts/runtime-config.test.ts` to parse manifests/Compose text and assert: every Vitest config has `maxWorkers: 2`; root build is sequential; `dev:web`/`dev:portal` exist; ports bind `127.0.0.1`; uploads volume is absent; runtime secrets are absent from Docker `ARG`; both Payload adapters use `push: false`.

- [ ] **Step 2: Verify config tests fail**

Run: `pnpm exec vitest run scripts/runtime-config.test.ts`

Expected: FAIL on workers, parallel build, secret build args, public port binding, and uploads volume.

- [ ] **Step 3: Make local scripts explicit and bounded**

Root scripts become:

```json
{
  "dev:web": "pnpm --filter @jakartabc/web dev",
  "dev:portal": "pnpm --filter @jakartabc/portal dev",
  "dev": "turbo run dev --parallel --filter=@jakartabc/web --filter=@jakartabc/portal",
  "build": "pnpm --filter @jakartabc/web build && pnpm --filter @jakartabc/portal build",
  "test": "turbo run test --concurrency=1",
  "test:integration": "vitest run --config vitest.integration.config.ts",
  "lighthouse": "lhci autorun --config=apps/web/lighthouserc.json"
}
```

Every local Vitest config sets `maxWorkers: 2` and `minWorkers: 1`. CI may override workers explicitly. Audit/build/E2E/Lighthouse remain separate commands.

- [ ] **Step 4: Remove the portal font-network dependency**

Replace any portal remote-font path with `next/font/local` using committed WOFF2 subsets and license text. Include only approved families/weights. The web font migration belongs to Task 15. After both Wave 4 branches merge, run `rg -n "next/font/google" apps` and expect no output.

- [ ] **Step 5: Remove runtime secrets from build arguments**

Docker build stages use deterministic non-secret compile placeholders only where static analysis imports env validation. Real credentials arrive only through Compose `env_file` at runtime. `docker history` and `docker inspect` must not reveal PostgreSQL, Redis, MinIO, Payload, Turnstile secret, or mail credentials.

- [ ] **Step 6: Make applications stateless and private behind the proxy**

Remove uploads volume/declarations. Bind `127.0.0.1:3100:3000` and `127.0.0.1:3101:3001`. Retain `host.docker.internal:host-gateway` for existing shared infrastructure. Add MinIO public host to Next image remote patterns/CSP as required. Migration remains the only schema-mutating service.

- [ ] **Step 7: Verify offline builds and container contract**

Run config tests, `docker compose config`, both sequential production builds with font-network access unavailable, and the image-verification script. Expected: all exit 0 and no secret value is present in image history/config.

- [ ] **Step 8: Commit the runtime/tooling lane**

```bash
git add .env.example package.json turbo.json apps/web/package.json apps/web/Dockerfile apps/web/next.config.ts apps/web/vitest.config.ts apps/portal packages docker-compose.yml scripts/verify-runtime-image.sh scripts/runtime-config.test.ts docs/local-prod-deploy.md README.md
git commit -m "perf: make local and container runtime lightweight"
```

## Wave 4 merge and review gate

- [ ] Complete two-stage reviews for Tasks 15 and 16.
- [ ] Cherry-pick Task 15 then Task 16; resolve only manifest/layout changes through the integration controller.
- [ ] Regenerate no schema artifacts after this wave.
- [ ] Run: `pnpm install --frozen-lockfile && pnpm test && pnpm lint && pnpm typecheck && pnpm build && docker compose config`.
- [ ] Expected: all commands exit 0; builds run sequentially and need no external font fetch.

## Task 17: Add integration, E2E, CI, security, and performance gates

**Serialized integration owner:** Tests in this task share servers, databases, manifests, and performance configuration.

**Files:**

- Create: `vitest.integration.config.ts`
- Create: `apps/web/src/integration/lead-access.test.ts`
- Create: `apps/web/src/integration/submission-concurrency.test.ts`
- Create: `apps/web/src/integration/minio.test.ts`
- Create: `apps/web/src/integration/redis.test.ts`
- Modify: `apps/web/e2e/contact.spec.ts`
- Modify: `apps/web/e2e/booking.spec.ts`
- Modify: `apps/web/e2e/cms.spec.ts`
- Modify: `apps/web/e2e/marketing.spec.ts`
- Modify: `apps/web/e2e/mobile-responsive.spec.ts`
- Modify: `apps/web/e2e/a11y.spec.ts`
- Delete: `apps/web/e2e/placeholder.spec.ts`
- Create: `apps/web/e2e/navigation.spec.ts`
- Create: `apps/web/e2e/localization.spec.ts`
- Create: `apps/web/e2e/performance.spec.ts`
- Modify: `apps/web/playwright.config.ts`
- Modify: `apps/portal/e2e/auth.spec.ts`
- Modify: `apps/web/lighthouserc.json`
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/lighthouse.yml`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml` only through pnpm for the dependencies pinned in Task 1

- [ ] **Step 1: Write access-boundary integration tests**

Start against a migrated test database. Assert anonymous REST and GraphQL lead creation returns 403; client cannot access admin; editor can CRUD editorial content but cannot users/leads; admin can manage users/leads; portal rejects admin/editor sessions.

- [ ] **Step 2: Write shared-infrastructure integration tests**

MinIO: upload supported image, assert returned URL starts with `MINIO_PUBLIC_URL/media/`, fetch it publicly, delete it, and assert 404; SVG/oversize reject. Redis: six concurrent rate calls allow five, prefixes isolate environments, lock is exclusive, completed marker persists, and unavailable Redis produces the typed fail-closed result while a public CMS read succeeds.

- [ ] **Step 3: Write database submission concurrency tests**

Submit identical contact and booking UUIDs concurrently through real server actions/adapters. Assert one row per UUID and accurate delivery status. Run two delivery retry workers and assert one outbound sales send.

- [ ] **Step 4: Run integration tests and verify red**

Run: `pnpm test:integration`

Expected: new tests fail until fixtures/configuration exercise the integrated stack; failure messages must identify missing boundary or dependency rather than syntax errors.

- [ ] **Step 5: Implement deterministic integration fixtures**

Use dedicated `jakartabc:test` Redis prefix, a test database schema/database, and `media/test-run-00000000-0000-4000-8000-000000000001/` MinIO objects in the deterministic fixture. Teardown deletes only objects/keys/rows containing that fixture UUID. Never flush shared Redis, empty the bucket, or truncate non-test data.

- [ ] **Step 6: Replace stale E2E expectations**

Delete placeholder coverage and assert real homepage behavior. Add mobile menu focus/link-close, localized content, CMS globals/legal links, form accepted-on-mail-failure, client-only portal, and no unsafe redirect scenarios. Keep selectors semantic (`role`, label, visible name), not visual class names.

- [ ] **Step 7: Enforce transfer and browser-performance budgets**

Playwright performance test sums response transfer sizes for representative home, services, Insight list/detail, contact, and pricing routes; initial total stays below 819,200 bytes and first-load route scripts below 102,400 gzip-equivalent bytes. It records LCP, CLS, and event responsiveness from the browser. Lighthouse uses mobile emulation and asserts Performance >= 0.90, Accessibility >= 0.95, Best Practices >= 0.95, LCP <= 1500 ms, and CLS <= 0.05. Document that lab event timing is a proxy; production INP needs RUM, while the browser test keeps the 100 ms interaction target.

- [ ] **Step 8: Add split CI jobs with bounded resources**

CI jobs are install/audit, format/lint/typecheck, unit, integration, sequential build, E2E, and Lighthouse. Cache pnpm/Turbo safely. Unit jobs may parallelize by package in separate runners; no runner starts two Next builds concurrently. Integration services use dedicated CI PostgreSQL/Redis/MinIO equivalents, not production shared instances.

- [ ] **Step 9: Normalize formatting once after all parallel work**

Run `pnpm format`, inspect the complete formatting diff for accidental generated/vendor changes, and retain only repository source, documentation, and configuration formatting. Run `pnpm format:check` and expect exit 0. This is the sole repository-wide write-format step; parallel workers format only their owned files.

- [ ] **Step 10: Verify the complete quality gate**

Run:

```bash
pnpm audit:prod
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm build
pnpm test:e2e
pnpm lighthouse
```

Expected: every command exits 0; the audit gate has no unapproved critical/high advisory and its exact temporary exceptions are unexpired; performance budgets pass on the production build.

- [ ] **Step 11: Commit integration gates**

```bash
git add vitest.integration.config.ts apps/web/src/integration apps/web/e2e apps/portal/e2e apps/web/playwright.config.ts apps/web/lighthouserc.json .github package.json pnpm-lock.yaml
git commit -m "test: enforce stabilization release gates"
```

## Task 18: Rehearse deployment, rollback, and perform final review

**Serialized final task:** No feature changes are allowed after verification begins; any defect returns to a failing regression test and reviewed fix.

**Files:**

- Modify: `docs/local-prod-deploy.md`
- Modify: `docs/admin-onboarding.md`
- Create: `docs/runbooks/stabilization-rollout.md`
- Create: `docs/runbooks/form-delivery-retry.md`
- Create: `docs/runbooks/minio-media-migration.md`
- Create: `docs/runbooks/rollback.md`

- [ ] **Step 1: Document exact shared-infrastructure ownership**

State that the infrastructure team owns PostgreSQL backups/restore, MinIO bucket/public-read policy/scoped credentials, Redis availability, and private networking. The app owns migrations, prefixes, health checks, copy verification, and no destructive shared-service cleanup.

- [ ] **Step 2: Rehearse backup and forward migration**

Restore a current sanitized backup into the rehearsal database, record row counts/status distributions, run migrations, verify admin/editor/client behavior, and record post-migration counts. Expected: no lead/content/user loss and publication equivalence.

- [ ] **Step 3: Rehearse MinIO migration and reversal**

Run dry-run, copy, verify-only, switch `MINIO_PUBLIC_URL`, smoke all sampled media, then switch back while legacy files remain. Expected: count/key/size/checksum verification passes and rollback requires configuration only.

- [ ] **Step 4: Rehearse Redis and mail outages**

Temporarily point rehearsal config at unavailable Redis and mail endpoints. Expected: public CMS pages stay readable; forms fail closed with a visible fallback contact email when Redis is down; mail outage accepts exactly one lead with failed delivery; retry sends once after recovery.

- [ ] **Step 5: Inspect images for secrets and statefulness**

Run:

```bash
docker compose config
docker compose build web portal
./scripts/verify-runtime-image.sh
docker compose up -d
docker compose ps
```

Expected: config parses; services become healthy; ports bind loopback; no upload volume exists; image history/config contains no runtime credentials.

- [ ] **Step 6: Run the final verification from a clean checkout**

Run exactly:

```bash
pnpm install --frozen-lockfile
pnpm audit:prod
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm build
pnpm test:e2e
pnpm lighthouse
docker compose config
docker compose up -d --build
```

Expected: every command exits 0. Record test counts, audit counts, bundle/page weights, LCP/interaction/CLS, Lighthouse category scores, migration revision, image digests, and smoke-test URLs in the rollout runbook.

- [ ] **Step 7: Dispatch final specification review**

Give a fresh reviewer the design spec, this full plan, base SHA, and HEAD SHA. It verifies each acceptance criterion, inspects security boundaries and migration rollback, and reports Critical/Important/Minor findings. Fix and re-review all Critical/Important findings.

- [ ] **Step 8: Dispatch final code-quality review**

Review the complete diff for unsafe logging, secret exposure, access bypass, SQL/schema risk, Redis/MinIO key safety, browser-bundle regressions, flaky tests, and unnecessary scope. Fix and re-review all Critical/Important findings.

- [ ] **Step 9: Commit runbooks and verification evidence**

```bash
git add docs
git commit -m "docs: add stabilization rollout and rollback runbooks"
```

- [ ] **Step 10: Finish the development branch**

Invoke `superpowers:finishing-a-development-branch`. Present merge/PR/keep/discard options with the verified commit range. Do not merge, push, or delete worktrees without the user's selected option.

## Completion checklist mapped to the design

- [ ] Platform: Next 16.2.11, all Payload packages exactly 3.86.0, and no unapproved critical/high audit finding; the two exact `image-size` exceptions expire after 2026-09-09.
- [ ] Security: enforced admin/editor/client matrix, direct anonymous lead APIs denied, client-only portal, safe redirects/URLs, trusted proxy, production Turnstile policy.
- [ ] Shared infrastructure: external PostgreSQL, public-read MinIO `media/`, Redis rate/idempotency; same environment contract local/server.
- [ ] Reliability: one durable row per submission, independent delivery status, retry command, explicit infrastructure errors, rollback-compatible migrations.
- [ ] Content: native `_status`, complete create/update/delete/slug/dependency invalidation, supported rich-text rendering, CMS globals/locales/legal links.
- [ ] UX: mobile close/focus/trap/return and navy tests aligned without redesign.
- [ ] Lightweight runtime: Server Components remain default, local fonts, bounded Vitest, sequential builds, no secret build args or upload volume.
- [ ] Quality: formatting, lint, types, unit, integration, build, E2E, Lighthouse, Compose, migration and rollback rehearsal all green.
