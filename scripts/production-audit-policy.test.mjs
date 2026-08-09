import assert from 'node:assert/strict'
import test from 'node:test'

import {
  evaluateAuditReport,
  parseAuditReportJson,
  validatePolicy,
} from './production-audit-policy.mjs'

const approvedIds = ['GHSA-w3rx-r6r6-pgpr', 'GHSA-5p2g-fcmc-qvqq']

const validPolicy = () => ({
  schemaVersion: 1,
  exceptions: approvedIds.map((id) => ({
    id,
    severity: 'high',
    package: 'image-size',
    expiresOn: '2026-09-09',
    owner: 'JakartaBC platform owner',
    reason:
      'Payload 3.86.0 retains image-size 2.0.2; exposure remains until the Tasks 3 and 4 media controls are enforced.',
    upstreamFollowUp: `https://github.com/advisories/${id}`,
  })),
  mitigationContract: {
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    rejectedFormats: ['AVIF', 'HEIF', 'JXL', 'ICNS'],
    writeRoles: ['admin', 'editor'],
    publicRead: true,
    trackedTasks: [3, 4],
  },
})

const auditReport = (...advisories) => ({
  advisories: Object.fromEntries(
    advisories.map(({ id, severity = 'high', packageName = 'image-size' }, index) => [
      String(index + 1),
      {
        github_advisory_id: id,
        module_name: packageName,
        severity,
        title: `${packageName} ${severity} advisory`,
      },
    ]),
  ),
})

test('allows only the two approved image-size advisories through the inclusive expiry date', () => {
  const report = auditReport(...approvedIds.map((id) => ({ id })), {
    id: 'GHSA-moderate-example',
    severity: 'moderate',
    packageName: 'example',
  })

  const result = evaluateAuditReport(report, validPolicy(), '2026-09-09')

  assert.equal(result.ok, true)
  assert.deepEqual(result.allowed.map(({ id }) => id).sort(), [...approvedIds].sort())
  assert.deepEqual(result.failures, [])
})

test('fails the approved advisories after the expiry date', () => {
  const report = auditReport(...approvedIds.map((id) => ({ id })))

  const result = evaluateAuditReport(report, validPolicy(), '2026-09-10')

  assert.equal(result.ok, false)
  assert.equal(result.failures.length, 2)
  for (const id of approvedIds) {
    assert.match(result.failures.join('\n'), new RegExp(`${id}.*expired`))
  }
})

test('fails every unapproved high or critical advisory', () => {
  const report = auditReport(
    ...approvedIds.map((id) => ({ id })),
    { id: 'GHSA-unapproved-high', severity: 'high', packageName: 'other-high' },
    { id: 'GHSA-unapproved-critical', severity: 'critical', packageName: 'other-critical' },
  )

  const result = evaluateAuditReport(report, validPolicy(), '2026-08-09')

  assert.equal(result.ok, false)
  assert.equal(result.failures.length, 2)
  assert.match(result.failures.join('\n'), /GHSA-unapproved-high.*unapproved high/)
  assert.match(result.failures.join('\n'), /GHSA-unapproved-critical.*critical/)
})

test('fails closed with registry error diagnostics when an audit report is unavailable', () => {
  const unavailableReport = {
    error: {
      code: 'ERR_PNPM_META_FETCH_FAIL',
      summary: 'Registry audit endpoint unavailable',
    },
  }

  assert.throws(
    () => parseAuditReportJson(JSON.stringify(unavailableReport)),
    /ERR_PNPM_META_FETCH_FAIL.*Registry audit endpoint unavailable/,
  )
})

test('fails closed on malformed JSON or a report without advisories', () => {
  assert.throws(() => parseAuditReportJson('{not-json'), /valid JSON/)
  assert.throws(
    () => evaluateAuditReport({ metadata: {} }, validPolicy(), '2026-08-09'),
    /advisories object/,
  )
})

test('fails closed when summary counts omit advisory details', () => {
  const report = auditReport()
  report.metadata = { vulnerabilities: { critical: 1, high: 0 } }

  assert.throws(
    () => evaluateAuditReport(report, validPolicy(), '2026-08-09'),
    /critical audit count.*does not match advisory details/,
  )
})

test('rejects missing or additional exception IDs', () => {
  const missing = validPolicy()
  missing.exceptions.pop()
  assert.throws(() => validatePolicy(missing), /exactly the approved advisory IDs/)

  const additional = validPolicy()
  additional.exceptions.push({ ...additional.exceptions[0], id: 'GHSA-not-approved' })
  assert.throws(() => validatePolicy(additional), /exactly the approved advisory IDs/)
})

test('requires clear exception metadata', () => {
  for (const field of ['reason', 'owner', 'expiresOn', 'upstreamFollowUp']) {
    const policy = validPolicy()
    policy.exceptions[0][field] = ''
    assert.throws(() => validatePolicy(policy), new RegExp(field))
  }
})

test('rejects changes to the deferred media mitigation contract', () => {
  const mutations = [
    (policy) => policy.mitigationContract.allowedMimeTypes.push('image/avif'),
    (policy) => policy.mitigationContract.rejectedFormats.pop(),
    (policy) => policy.mitigationContract.writeRoles.push('client'),
    (policy) => {
      policy.mitigationContract.publicRead = false
    },
    (policy) => policy.mitigationContract.trackedTasks.pop(),
  ]

  for (const mutate of mutations) {
    const policy = validPolicy()
    mutate(policy)
    assert.throws(() => validatePolicy(policy), /mitigation contract/)
  }
})
