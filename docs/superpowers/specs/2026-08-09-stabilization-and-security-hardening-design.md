# Design: JakartaBC stabilization, security hardening, and lightweight runtime

Date: 2026-08-09
Status: Approved design

## Goal

Make the JakartaBC website and client portal safe to operate, predictable to
deploy, and light during both local development and production traffic. The
program fixes the known security, authorization, persistence, cache,
rendering, form-delivery, localization, accessibility, tooling, and deployment
defects without redesigning the product.

The end state keeps application containers stateless. Local and server
deployments use the same shared-infrastructure contract for PostgreSQL, MinIO,
and Redis; only environment values differ.

## Relationship to earlier designs

This document is the controlling design for stabilization work. It supersedes
the parts of `2026-05-20-simplify-single-web-app-design.md` that merge the
portal into the public web application or persist media on a local Docker
volume.

The public website and portal remain separate deployable applications for this
program. This avoids putting portal-only code on the public site's critical
path. Both applications may share packages, Payload collections, PostgreSQL,
MinIO, and Redis. Consolidating them into one application can be reconsidered
after stabilization with fresh performance and operational evidence.

## Scope

This program addresses the complete set of defects found in the repository
review:

- known critical and high-severity production dependency vulnerabilities;
- decorative roles that do not enforce CMS or portal authorization;
- anonymous Payload REST writes that bypass public form protections;
- filesystem media storage that does not match the declared Docker volume;
- incomplete cache invalidation after content changes or slug changes;
- a partial rich-text renderer that loses supported content and may accept
  unsafe links;
- form retries that can create duplicate leads when email delivery fails;
- non-atomic, process-local abuse protection;
- mobile-navigation close and focus defects;
- infrastructure failures incorrectly presented as content not found;
- a duplicate Insight publication status alongside Payload drafts;
- incomplete locale and CMS-global usage;
- environment, font, lint, formatting, UI-test, build, and CI drift;
- production secrets passed into Docker builds;
- local commands that over-parallelize builds or Vitest workers.

## Current-state baseline

The review established the following baseline. These are inputs to the plan,
not acceptance of the current behavior:

- Production dependency audit reports 149 vulnerabilities: 6 critical,
  52 high, 76 moderate, and 15 low.
- The repository uses Next.js 15.0.3 and Payload 3.0.0-era packages, including
  versions affected by published security fixes.
- Direct lint and type-check commands pass, but ESLint warns that the Next.js
  plugin is not detected.
- Web unit tests pass 62/62 and portal tests pass 18/18.
- UI tests fail 5/88 because assertions still describe an ochre/bone visual
  system while the implementation uses navy tokens.
- Formatting check reports 55 files.
- A repository-root `.env` is not automatically inherited when a workspace app
  runs `next build`, causing page-data collection to fail.
- The current Google Fonts integration makes a successful build dependent on
  external network availability.
- End-to-end tests were not accepted as a green baseline because their
  expectations have drifted.

## Design principles

1. **Deny by default.** Collections and routes expose only the operations
   explicitly required by a role or public flow.
2. **One source of truth.** PostgreSQL owns durable application state;
   Redis coordinates ephemeral state; MinIO owns media objects.
3. **Stateless applications.** Web and portal containers can be replaced
   without losing uploads, rate-limit state, or durable submissions.
4. **Server-first public site.** React Server Components are the default.
   Client JavaScript is reserved for actual interaction.
5. **Compatible rollout.** Schema changes are additive before destructive
   cleanup. Old and new application versions can coexist during deployment.
6. **Failure is explicit.** Infrastructure errors are not converted to 404s,
   and delivery state is recorded independently from lead acceptance.
7. **Same architecture everywhere.** Local and server environments use the
   same services and code paths, configured by environment variables.

## Target architecture

```text
Browser
  |-- public pages/forms ----> web (Next.js + Payload admin/API)
  |-- client login/dashboard -> portal (Next.js)
  |-- public media -----------> MinIO public-read bucket
  |
Reverse proxy
  |-- binds public hostnames and supplies trusted client-IP headers
  |
Applications
  |-- PostgreSQL: canonical content, users, leads, delivery state
  |-- Redis: rate limits, idempotency coordination, short-lived locks
  `-- MinIO: media objects under the media/ prefix
```

The public `web` service and `portal` service bind their published development
ports to `127.0.0.1`. Production exposure is owned by the existing reverse
proxy. Application code trusts forwarded client-IP headers only when the
request came through that proxy boundary.

## Platform and dependency baseline

The first delivery gate upgrades the supported platform before behavior work:

- Next.js to 16.2.11, the selected Active LTS release at design time;
- Payload and every `@payloadcms/*` package to exactly 3.86.0;
- React and companion packages to versions supported by that Next.js release;
- direct and transitive production packages until the enforced production
  audit gate has no unapproved critical or high-severity findings;
- Payload-generated types and import maps after the upgrade;
- committed database migrations for every Payload schema change.

Payload packages must never use mixed versions. Lockfile changes are reviewed
for duplicated framework versions, unexpected native dependencies, and
production packages that remain vulnerable.

The upgrade is its own gate because security and behavior fixes must be tested
against the platform that will ship, not against obsolete framework behavior.

Payload 3.86.0 temporarily retains `image-size@2.0.2`. Only
`GHSA-w3rx-r6r6-pgpr` and `GHSA-5p2g-fcmc-qvqq` are allowed through
2026-09-09 as an inclusive UTC calendar date; the gate fails for any other
critical/high advisory and begins rejecting both exceptions at 2026-09-10
00:00:00 UTC. The exception is owned by the JakartaBC platform owner and
tracked in machine-readable metadata with its reason and upstream follow-up.
Tasks 3 and 4 must limit media uploads to JPEG, PNG, and WebP, reject
AVIF/HEIF/JXL/ICNS, limit writes to admin/editor, and preserve public reads.

## Authorization model

### Roles

The existing roles become enforced capabilities:

| Capability                       | admin | editor | client |                  anonymous |
| -------------------------------- | ----: | -----: | -----: | -------------------------: |
| Open Payload admin UI            |   yes |    yes |     no |                         no |
| Manage users and roles           |   yes |     no |     no |                         no |
| CRUD editorial content and media |   yes |    yes |     no |        read published only |
| Read contact/booking leads       |   yes |     no |     no |                         no |
| Mutate or delete leads           |   yes |     no |     no |                         no |
| Use client portal                |    no |     no |    yes |                         no |
| Submit protected public form     |   n/a |    n/a |    n/a | through server action only |

The `admin` role is operational, the `editor` role is editorial, and the
`client` role is portal-only. A portal route requires both a valid session and
`role === 'client'`; an authenticated admin or editor is not silently treated
as a client.

### Shared user definition

`Users` is defined once in `packages/content` and imported by every Payload
configuration. Access helpers are also shared, pure, and unit-tested. Web and
portal must not carry copy-pasted role definitions or divergent access rules.

Role changes and user-management operations are admin-only. The API does not
allow users to assign themselves a stronger role. Bootstrap of the first admin
is a controlled migration/operations step, not a public registration path.

### Collection boundaries

All collection access is explicit. Editorial collections expose published
reads to anonymous callers and editor CRUD to admin/editor callers. Drafts
remain authenticated. Lead collections allow admin reads and management only.
Users are inaccessible to anonymous callers and manageable only by admins,
apart from Payload's minimum authenticated self-session behavior.

Anonymous `create` on `contact-messages` and `booking-leads` is denied at the
Payload REST and GraphQL layers. Public visitors can create submissions only
through the validated web server action described below.

## Public form and delivery design

### Request path

```text
visitor
  -> typed server action
  -> schema + honeypot + Turnstile validation
  -> trusted client identity extraction
  -> Redis atomic rate limit
  -> submission-id idempotency check
  -> PostgreSQL transaction inserts one accepted lead
  -> delivery attempt updates delivery fields
  -> accepted response, independent of sales-email success
```

Each browser submission carries a cryptographically random `submissionId`.
PostgreSQL has a unique constraint on this identifier and is the final source
of truth. Redis provides a short-lived lock to reduce duplicate work, but a
Redis race or restart cannot create a second durable lead.

The application persists the lead before attempting email. A sales-email
failure does not return a generic submission failure that encourages the
visitor to create duplicates. The visitor receives an accepted response; the
record retains actionable delivery state:

- `deliveryStatus`: `pending`, `sent`, or `failed`;
- `deliveryAttempts`;
- `lastDeliveryAttemptAt`;
- `deliveredAt`;
- a bounded, sanitized `deliveryError` suitable for operations, with no secret
  or visitor message content in logs.

A retry operation selects failed deliveries, claims them safely, sends again,
and transitions them to `sent` or back to `failed`. It is safe to run more than
once. This program may expose the operation as an authenticated command or
admin operation, but not as a public endpoint.

Visitor confirmation email and internal sales notification are separately
observable if the existing mail package sends both. Lead acceptance never
depends on either mail provider response.

### Abuse protection

The current process-local limiter is replaced by Redis. The implementation uses
an atomic Lua script or an equivalent atomic increment-and-expire operation so
concurrent instances share one correct window.

Default coordination lifetimes are:

- rate-limit window: 1 hour;
- in-progress submission lock: 30 seconds;
- completed submission marker: 24 hours.

Keys are namespaced with `REDIS_KEY_PREFIX` and never include raw email
addresses, full IP addresses, names, or message content. Values used to derive
keys are normalized and irreversibly hashed.

If Redis is unavailable, public form submission fails closed with a stable,
retryable response, a visible fallback sales email/contact link, and a
sanitized operational error. Public CMS reads stay available. PostgreSQL
uniqueness still prevents duplicate durable rows if a failure occurs after
persistence.

### Turnstile policy

Production startup rejects documented Turnstile test credentials. Missing or
test credentials are allowed only in an explicit local/test mode. Origin and
hostname checks follow the provider's verified response rather than trusting
browser-supplied fields.

## Shared infrastructure contract

The repository owns application integration, migrations, and health checks.
The existing shared-infrastructure environment owns PostgreSQL, MinIO, Redis,
their credentials, backups, bucket creation, and network policy.

Required application environment variables are:

```dotenv
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
REDIS_KEY_PREFIX=jakartabc:local
MINIO_ENDPOINT=http://host.docker.internal:9000
MINIO_REGION=us-east-1
MINIO_BUCKET=jakartabc
MINIO_ACCESS_KEY=...
MINIO_SECRET_KEY=...
MINIO_PUBLIC_URL=http://localhost:9000/jakartabc
MINIO_FORCE_PATH_STYLE=true
```

`REDIS_KEY_PREFIX` includes the deployment environment, for example
`jakartabc:local`, `jakartabc:staging`, or `jakartabc:production`. Local Docker
uses `host.docker.internal` or the shared infrastructure's LAN address. Server
containers use private service hostnames or the server's shared-infrastructure
address. No application code branches on local versus server topology.

Secrets are runtime environment values. Database credentials, Payload secrets,
MinIO credentials, Redis credentials, Turnstile secrets, and mail credentials
must not be Docker build arguments, image layers, public Next.js variables, or
build logs. Build stages use validated non-secret placeholders only when the
framework requires configuration to compile.

### PostgreSQL ownership

PostgreSQL is the canonical store for users, content, leads, publication state,
and delivery state. It is never bundled into this repository's default Compose
stack.

Only the migration job/command changes schema. Both web and portal set Payload
schema push to false. Migrations are committed, reviewed, transactional where
the adapter permits it, and rehearsed against a restored backup before
production deployment. The shared infrastructure owns backups and restoration;
the repository documents the required pre-deploy backup and verification.

### MinIO media ownership

Payload uses the official S3 storage adapter configured for an S3-compatible
custom endpoint, path-style requests, the shared bucket, and a `media/` object
prefix.

The bucket may be publicly readable, as approved. Credentials retain only the
object list/read/write/delete permissions required by the application's media
prefix. Browser media URLs are built from `MINIO_PUBLIC_URL` and point directly
to MinIO or its existing public reverse-proxy endpoint; image bytes do not pass
through the Node.js application.

Accepted media types are temporarily limited to JPEG, PNG, and WebP while the
two approved `image-size` advisories remain open. AVIF/HEIF, JXL, ICNS, and SVG
are rejected before Payload probes image dimensions. The server validates the
actual magic bytes, requires the detected and declared MIME types to match, and
enforces a 5,000,000-byte limit for both buffered and temporary files.

The application no longer treats a local filesystem path or Docker upload
volume as durable media storage. Legacy objects are copied to `media/` with
conditional creates, bounded local/remote reads, and an authoritative re-check
when a concurrent writer wins. They are then verified by object count,
filename/key mapping, size, and checksum before the URL switch. The root copy
command runs from a checkout or builder stage with root development
dependencies installed; it is not required in the minimal production runtime
image. The old media copy remains untouched through the rollback window.

### Redis ownership

Redis holds only ephemeral coordination state: rate-limit counters,
idempotency locks, and completed-submission markers. It does not own sessions,
users, leads, or CMS content in this program. Redis data may be discarded and
reconstructed without durable application-data loss.

## Content lifecycle and cache correctness

### Publication state

Insights use Payload's native draft/publish status (`_status`) as the only
publication source of truth. The custom `status` field is migrated to native
status, removed from reads and writes, then removed from the schema in a later
compatible cleanup migration.

Anonymous queries always constrain native status to published content.
Authenticated previews use Payload draft semantics. Slug uniqueness and
publication transitions are covered by migrations and tests.

### Cache invalidation

Cached CMS reads have explicit tags. Every collection and global that can
affect a public response triggers invalidation after create, update, delete,
publish/unpublish, and slug change.

At minimum the invalidation graph covers:

- Insight detail, Insight lists, category filters, author references, related
  content, and both the old and new slug;
- Services detail/list pages and references;
- Regulations and content blocks that render them;
- Media metadata/URL changes consumed by content;
- NavMenu, Footer, and SiteSettings globals;
- locale-specific variants for every affected page.

Hooks invalidate only after a successful durable change. They do not make a
failed mutation appear fresh. Delete hooks retain enough original-document
context to invalidate old routes.

Infrastructure and permission errors propagate to the route error boundary as
operational failures. Only a confirmed absent document becomes `notFound()`.

## Rich-text rendering and URL safety

The bespoke partial Lexical traversal is replaced by Payload's supported React
rich-text renderer. Project-specific converters preserve the existing
`pullQuote`, `regulationCite`, and `dropCap` blocks.

Regression fixtures cover headings, paragraphs, ordered and unordered lists,
nested lists, blockquotes, links, upload/media nodes, line breaks, text marks,
relationships, and all custom blocks. Unsupported nodes fail visibly in
development/test rather than disappearing silently.

All rendered URLs pass through one safe-link policy:

- internal relative paths are allowed;
- `https:` and intentionally supported `http:` URLs are allowed;
- `mailto:` and `tel:` are allowed only where the component explicitly needs
  them;
- `javascript:`, `data:`, control-character variants, protocol-relative URLs,
  backslash variants, and decoded/encoded bypasses are rejected.

The same canonicalization protects login `next` parameters. Redirects must be
same-origin absolute paths beginning with one `/`; suspicious input falls back
to the dashboard root.

## Public-site performance design

### Rendering boundary

React Server Components are the default. Client components are limited to:

- navigation/menu state;
- form interaction and submission feedback;
- Turnstile, loaded lazily when a protected form approaches the viewport or
  receives focus;
- scroll-spy behavior that cannot be expressed with platform APIs and CSS.

CMS access, Payload configuration, PostgreSQL, Redis, MinIO credentials, email
code, and server validation never enter a client dependency graph. Shared
package exports must remain tree-shakeable and avoid barrel imports that pull
server or unused component code into the browser.

Public pages use cached server-side CMS reads and Next.js image behavior where
it benefits layout stability and responsive delivery. Public MinIO images have
stable dimensions or aspect ratios. Fonts are committed, locally served WOFF2
files with only the required families, weights, and language subsets; builds
have no font-network dependency.

### Performance budgets

Representative public routes must meet all of these budgets in the production
container, measured with the agreed mobile profile:

| Metric                          |        Budget |
| ------------------------------- | ------------: |
| First-load route JavaScript     | < 100 KB gzip |
| Initial transferred page weight |      < 800 KB |
| LCP                             |       < 1.5 s |
| INP                             |      < 100 ms |
| CLS                             |        < 0.05 |
| Lighthouse Performance          |         >= 90 |
| Lighthouse Accessibility        |         >= 95 |
| Lighthouse Best Practices       |         >= 95 |

The bundle analyzer is a release diagnostic and CI artifact, not a normal dev
dependency. Budget failure blocks release unless the spec is amended with
measured evidence.

### Lightweight local workflow

The default developer workflow avoids running every app and every verification
job at once:

- `dev:web` runs only the public web/CMS application;
- `dev:portal` runs only the client portal;
- `dev` explicitly runs both for integration work;
- local Vitest uses at most two workers per invoked project;
- CI may parallelize isolated jobs within runner capacity;
- root builds run workspace applications sequentially to avoid competing
  Next.js compilers and memory spikes;
- dependency audit, production build, E2E, and Lighthouse are release/CI
  checks, not background work started by `dev`;
- local fonts and external shared services make development independent from
  font downloads and bundled database/object-store/cache containers.

Watch mode targets the package being edited. It does not recursively start all
workspace test projects. This directly addresses local CPU and memory pressure
caused by unconstrained Vitest workers and simultaneous app builds.

## Navigation, accessibility, and localization

The mobile menu closes after a navigation selection and on Escape. Opening it
moves focus to the first meaningful control; closing it returns focus to the
trigger. Focus remains within the open modal/drawer, background scrolling is
controlled, and route changes cannot leave the menu visually open.

Nav and footer links come from the existing Payload globals rather than
hardcoded component data. Legal links resolve to real CMS-managed or explicitly
implemented routes; placeholder 404 links are not shipped.

Every localized route renders copy from the requested locale or an explicit
documented fallback. English literals must not leak into Indonesian routes, and
vice versa. CMS locale resolution, list/detail queries, metadata, empty states,
errors, navigation, footer, and forms are included.

The existing navy implementation is the accepted visual source of truth for
this stabilization program. Drifted ochre/bone test assertions are updated to
verify semantic tokens and behavior rather than resurrecting an unapproved
redesign.

## Environment and build behavior

Each app loads and validates the intended repository-root environment in local
commands, tests, migrations, and builds. Portal uses its environment schema
instead of reading arbitrary `process.env` values throughout application code.
Validation distinguishes build-time public configuration from runtime secrets.

Production builds work with outbound network access disabled. Docker images are
multi-stage, reproducible from the lockfile, and contain only runtime artifacts,
committed migrations, and required package assets. Runtime health checks verify
the application without performing schema mutation.

The Next.js ESLint plugin is explicitly configured. Formatting is normalized
once, then checked rather than rewritten in CI. Generated files are either
deterministically generated and checked or excluded with a documented reason.

## Test strategy

### Security regressions

Automated tests prove:

- the production audit rejects every unapproved critical/high advisory and
  rejects the two exact `image-size` exceptions after 2026-09-09;
- anonymous REST and GraphQL lead creation is denied;
- `client` cannot open Payload admin;
- `editor` can manage editorial resources but not users, leads, or client data;
- `client` alone can enter protected portal routes;
- `//`, backslash, percent-encoded, control-character, and external redirect
  attempts fall back safely;
- production configuration rejects Turnstile test credentials;
- forwarded client identity is accepted only from the trusted proxy boundary.

### Data and failure regressions

Automated tests prove:

- cache refreshes after create, update, delete, publish/unpublish, and slug
  rename, including dependent entities and both locales;
- database or CMS outages produce an operational error, not a false 404;
- concurrent identical submissions create exactly one lead;
- mail failure leaves one accepted lead with `deliveryStatus = failed`;
- retry transitions a failed delivery to sent without duplicating the lead;
- rollback-compatible reads work during the additive migration window.

### MinIO and Redis integration regressions

Tests against the existing shared-infrastructure-compatible services prove:

- image upload returns the configured public URL and the object is readable;
- delete removes the intended prefixed object;
- SVG and oversized uploads are rejected;
- rate limiting is atomic across concurrent application clients;
- environment prefixes isolate keys;
- Redis outage affects protected writes according to the fail-closed policy
  while public CMS reads remain healthy.

### Rendering and UX regressions

Tests prove:

- every supported Lexical node and custom block renders without content loss;
- unsafe URL variants are rejected;
- mobile-menu close, Escape, route-change, focus trap, and focus-return behavior;
- localized routes contain no unintended hardcoded-language leakage;
- CMS NavMenu, Footer, SiteSettings, and legal links drive rendered output.

### Performance and tooling regressions

Release verification includes bundle-size assertions, Lighthouse budgets,
Core Web Vitals checks, an offline production build, maximum-local-worker
configuration, formatting, lint, type checks, unit/integration tests, E2E, and
container smoke tests.

The final command set is:

```sh
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

Commands that do not exist yet are added by the implementation plan. Every
listed command must exit zero before release.

## Migration and rollout

The rollout is staged so each gate is independently verifiable.

### Gate 1: platform

1. Take and verify a PostgreSQL backup.
2. Upgrade Next.js, React, Payload, and tightly coupled packages.
3. Regenerate Payload types/import maps and create compatibility migrations.
4. Restore lint, type-check, unit-test, and production-build baselines.
5. Require no unapproved critical/high production audit finding and require
   the two exact temporary exceptions to remain unexpired.

### Gate 2: security boundaries

1. Introduce the shared Users collection and tested access helpers.
2. Enforce CMS, API, admin, and portal role matrices.
3. Close anonymous lead collection writes.
4. Route public submissions through the protected server actions only.
5. Harden trusted-proxy identity, redirects, and production Turnstile config.

### Gate 3: durable and shared infrastructure

1. Add Redis rate limiting and idempotency coordination.
2. Add the unique submission identifier and delivery-state fields.
3. Configure the MinIO storage adapter and media restrictions.
4. Copy and verify legacy media while preserving the old copy.
5. Disable Payload schema push and rehearse migrations on a restored backup.

### Gate 4: content correctness and UX

1. Migrate Insights to native draft status.
2. Install complete invalidation hooks and correct error classification.
3. Replace the partial rich-text renderer and centralize URL safety.
4. Connect CMS globals, finish localization, and repair legal routes.
5. Repair mobile navigation accessibility.

### Gate 5: quality and performance

1. Make environment loading and font/build behavior deterministic.
2. Align lint, format, visual tests, E2E, and CI commands.
3. Apply browser bundle boundaries and record analyzer output.
4. Pass the full command set, security scenarios, migration rehearsal,
   container smoke tests, and performance budgets.

Production receives a compatibility release before any cleanup release. Old
columns and local media are removed only after the new version has remained
healthy through the agreed observation window and rollback is no longer
required.

## Rollback

- Retain the previous application image and its exact environment contract.
- Every schema migration includes and rehearses a down migration when safely
  reversible; irreversible transforms require a documented restore procedure.
- Keep legacy media readable and untouched until MinIO URLs and object checks
  have passed the rollback window.
- Switching the public media base URL back is configuration-driven.
- Redis may be flushed or replaced because PostgreSQL remains authoritative.
- A failed gate stops before later destructive cleanup begins.
- Restore the pre-deploy PostgreSQL backup if an incompatible data migration
  cannot be reversed safely.

## Observability and operational safety

Structured logs include request/submission correlation identifiers, role-denial
events, cache invalidation results, media operation outcomes, Redis availability,
and mail-delivery transitions. Logs redact credentials, authorization headers,
cookies, Turnstile tokens, visitor messages, and direct personal identifiers.

Health checks distinguish process health from dependency readiness. A temporary
mail outage does not make public CMS pages unhealthy. A PostgreSQL outage makes
data-dependent readiness fail. MinIO and Redis failures are surfaced on the
features that require them according to the policies above.

## Acceptance criteria

The stabilization program is accepted only when:

- production audit reports zero critical and no unapproved high findings; only
  the two exact `image-size` exceptions may remain through 2026-09-09 UTC;
- the complete verification command set exits zero;
- admin/editor/client/anonymous behavior matches the authorization matrix;
- anonymous direct lead writes are impossible;
- duplicate submission and delivery-failure scenarios preserve one durable
  lead with accurate status;
- all public media is served from the configured MinIO public URL and app
  containers require no durable upload volume;
- PostgreSQL, MinIO, and Redis use the same environment contract locally and on
  the server;
- cache, native publication status, rendering, localization, and mobile-menu
  regressions pass;
- production images contain no runtime secret supplied as a build argument;
- public-route performance meets every stated budget;
- local Vitest is capped at two workers and root builds do not run both Next.js
  compilers concurrently;
- formatting, generated artifacts, and repository status are deterministic;
- backup, forward migration, smoke test, and rollback rehearsal are recorded.

## Risks and mitigations

- **Major framework upgrade:** isolate it as Gate 1 and avoid combining it with
  behavior changes until the baseline is green.
- **Authorization lockout:** seed/verify an admin before enabling deny-by-default
  policies and test each role through UI and API paths.
- **Media URL breakage:** copy first, verify mapping and checksums, switch by
  environment, and retain legacy media.
- **Duplicate or lost leads:** use PostgreSQL uniqueness and durable delivery
  state; treat Redis only as coordination.
- **Cache over-invalidation:** begin with correctness-oriented tag coverage,
  then narrow based on measurements without weakening tests.
- **Shared infrastructure contention:** enforce per-environment Redis prefixes,
  MinIO object prefixes, scoped credentials, database ownership, and connection
  limits.
- **Performance regressions from CMS/client imports:** assert client bundle
  budgets and inspect analyzer output at the quality gate.

## Non-goals

- Building a full client-portal feature set or CRM.
- Moving sessions into Redis.
- Replacing the existing reverse proxy or administering the shared PostgreSQL,
  MinIO, and Redis services.
- Adding a CDN; `MINIO_PUBLIC_URL` may point to one later without code changes.
- Redesigning the approved navy visual system.
- Writing final legal copy; this program only ensures configured legal routes
  exist and are CMS-driven.
- Combining web and portal into one runtime during stabilization.
- Removing old schema or media before the compatibility and rollback windows
  have completed.

## Official implementation references

- Next.js release policy and current releases: <https://nextjs.org/blog>
- Payload releases: <https://github.com/payloadcms/payload/releases>
- Payload package-version consistency guidance:
  <https://payloadcms.com/docs/troubleshooting/troubleshooting>
- Payload S3-compatible storage adapter:
  <https://payloadcms.com/docs/upload/storage-adapters>
- Payload database migrations: <https://payloadcms.com/docs/database/migrations>
