# Design: Temporary production audit exception

**Date:** 2026-08-09  
**Owner:** JakartaBC platform owner  
**Expiry:** 2026-09-09

## Purpose

Task 1 cannot remove two `image-size@2.0.2` denial-of-service advisories because Payload
3.86.0 has no patched compatible release. The production audit gate may temporarily allow
only `GHSA-w3rx-r6r6-pgpr` and `GHSA-5p2g-fcmc-qvqq`. It must continue to reject every other
critical or high advisory and must reject both exceptions after 2026-09-09.

## Audit gate

`pnpm audit:prod` runs a Node-based checker that invokes `pnpm audit --prod --json` itself.
The checker evaluates the audit report even though pnpm exits non-zero when advisories are
present. Approval is defined in code as the exact two-advisory set, so adding an entry to the
metadata cannot broaden the gate silently.

A machine-readable policy records each advisory's reason, owner, expiry, and upstream
follow-up. The checker validates that metadata and the approved mitigation contract before
evaluating the report. It exits non-zero when:

- any critical advisory is present;
- any high advisory is not one of the two approved IDs;
- an approved advisory is present after its expiry date;
- exception metadata is missing, duplicated, malformed, or broader than the approved set;
- the audit command or JSON parsing fails.

Moderate and lower advisories remain visible in audit output but do not fail this Task 1 gate.
Raw `pnpm audit --prod` remains available for diagnosis; CI and documented release checks use
`pnpm audit:prod`.

## Deferred mitigation contract

Tasks 3 and 4 must enforce the compensating controls; this task records and validates the
contract without implementing collection authorization or upload handling:

- uploads allow only JPEG, PNG, and WebP;
- AVIF, HEIF, JXL, and ICNS uploads are rejected;
- media create, update, and delete operations are limited to `admin` and `editor` roles;
- public media reads remain allowed.

The temporary exception does not claim these controls are already deployed. Its reason states
that exposure remains until Tasks 3 and 4 land, and its expiry forces another decision if the
upstream dependency is still unresolved.

## Testing

Focused Node tests exercise the pure policy evaluator with synthetic audit reports. They prove
the exact two advisories pass before and on the expiry date, fail after expiry, and cannot mask
an unexpected high or any critical advisory. Tests also reject incomplete exception metadata or
changes to the mitigation contract. A live `pnpm audit:prod` run verifies the command against the
current registry report.
