# jakartabc.com — Implementation Plans Index

> Date: 2026-05-18
> Spec: `docs/superpowers/specs/2026-05-18-jakartabc-design.md`
> Design system: `design-system.md`

The implementation is split across five phase plans. Each plan is independently executable, mappable to a team or Hermes agent, and produces a deployable, testable deliverable.

## Phases

| # | Plan | Tasks | Done criterion | Depends on |
|---|------|------:|---|---|
| 0 | [Foundation](./2026-05-18-phase0-foundation.md) | 20 | Placeholder page + `/admin` over TLS on staging; CI green | — |
| 1 | [Marketing pages](./2026-05-18-phase1-marketing.md) | 33 | 7 bilingual marketing pages, Lighthouse ≥90, anti-AI checklist | 0 |
| 2 | [CMS (Insights + Services)](./2026-05-18-phase2-cms.md) | 29 | Editor publishes bilingual Insight without code; Services editable | 0, 1 |
| 3 | [Booking + Contact](./2026-05-18-phase3-booking.md) | 26 | Form submit → sales email + lead in admin <30s | 0, 1, 2 |
| 4 | [Portal skeleton](./2026-05-18-phase4-portal-skeleton.md) | 21 | `app.jakartabc.com/login` over TLS; dashboard placeholder | 0 (parallel-able after 1) |

**Total: 129 tasks.**

## Dependency graph

```
Phase 0 ──► Phase 1 ──► Phase 2 ──► Phase 3
                │
                └──────► Phase 4 (parallel-able after 1 is stable)
```

Phase 3 depends on Phase 2 (Services collection backs booking dropdown).
Phase 4 can run parallel to Phase 2/3 once Phase 1 stabilizes (uses shared `packages/ui` only).

## Tag convention

Each phase ends with `git tag -a phase-N-<slug>-complete`. CI cuts a deploy artifact from each tag.

## How to execute a plan

Each plan is self-contained. The recommended runner is the Superpowers subagent-driven-development skill (one fresh subagent per task with review between). Inline executing-plans is also valid for solo work. Both are listed in each plan's header.

## Cross-cutting deliverables (live across phases)

- **`design-system.md`** — owned by Design; brand/visual/UX system (v0.2, 2026-05-18)
- **`docs/superpowers/specs/2026-05-18-jakartabc-design.md`** — owned by Eng+Design; technical spec
- **`docs/anti-ai-checklist.md`** — created in Phase 1; reviewed in every UI PR
- **`docs/admin-onboarding.md`** — created in Phase 2; lives with the CMS
- **`docs/adr/`** — `0001-portal-auth-strategy.md` created in Phase 4; future ADRs follow

## Open items (consolidated)

These items surfaced across phases and need owners outside Eng:

| Item | Blocker for | Owner |
|---|---|---|
| Monogram glyph design | Phase 1 production launch | Brand/design |
| Editorial stock asset selection (~15 photos) | Phase 1 production launch | Content |
| Founder signature scan | Phase 1 About page final | Founder |
| 4 service detail copy (EN + ID) finalization | Phase 2 publish | Content |
| 3-5 launch Insights articles (full body) | Phase 2 publish | Content |
| Pricing numbers final per service | Phase 2 publish | Ops + Legal |
| Regulations citation source list | Phase 2 publish | Legal/Content |
| Sales email recipient + WA number | Phase 3 launch | Ops |
| Domain DNS + email DNS (SPF/DKIM/DMARC for Resend) | Phase 3 launch | Ops |
| Turnstile site/secret keys | Phase 3 launch | Ops |
| `app.jakartabc.com` DNS A record | Phase 4 launch | Ops |
| Test portal user creation | Phase 4 e2e | Eng+Ops |
| ID translations production-grade revision | Launch | Translator |
| License numbers + bar memberships final | Launch | Legal |
| Real partner contact data (name, email, WA) | Launch | Ops |
