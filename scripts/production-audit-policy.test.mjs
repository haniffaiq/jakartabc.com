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

const auditReport = (...advisories) => {
  const entries = advisories.map(({ id, severity = 'high', packageName = 'image-size' }, index) => [
    String(index + 1),
    {
      github_advisory_id: id,
      module_name: packageName,
      severity,
      title: `${packageName} ${severity} advisory`,
    },
  ])
  const vulnerabilities = Object.fromEntries(
    ['info', 'low', 'moderate', 'high', 'critical'].map((severity) => [
      severity,
      advisories.filter((advisory) => (advisory.severity ?? 'high') === severity).length,
    ]),
  )

  return { advisories: Object.fromEntries(entries), metadata: { vulnerabilities } }
}

test('allows only the two approved image-size advisories through the inclusive expiry date', () => {
  const report = auditReport(...approvedIds.map((id) => ({ id })), {
    id: 'GHSA-aaaa-bbbb-cccc',
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
    { id: 'GHSA-1111-2222-3333', severity: 'high', packageName: 'other-high' },
    { id: 'GHSA-4444-5555-6666', severity: 'critical', packageName: 'other-critical' },
  )

  const result = evaluateAuditReport(report, validPolicy(), '2026-08-09')

  assert.equal(result.ok, false)
  assert.equal(result.failures.length, 2)
  assert.match(result.failures.join('\n'), /GHSA-1111-2222-3333.*unapproved high/)
  assert.match(result.failures.join('\n'), /GHSA-4444-5555-6666.*critical/)
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

test('fails closed when an advisory is structurally incomplete', () => {
  const report = auditReport()
  report.advisories = { 1: {} }

  assert.throws(
    () => evaluateAuditReport(report, validPolicy(), '2026-08-09'),
    /advisory 1.*github_advisory_id/,
  )
})

test('requires nonnegative integer counts for every audit severity', () => {
  for (const severity of ['info', 'low', 'moderate', 'high', 'critical']) {
    const missing = auditReport()
    delete missing.metadata.vulnerabilities[severity]
    assert.throws(
      () => evaluateAuditReport(missing, validPolicy(), '2026-08-09'),
      new RegExp(`${severity} audit count.*nonnegative integer`),
    )

    const stringCount = auditReport()
    stringCount.metadata.vulnerabilities[severity] = '0'
    assert.throws(
      () => evaluateAuditReport(stringCount, validPolicy(), '2026-08-09'),
      new RegExp(`${severity} audit count.*nonnegative integer`),
    )
  }

  const negative = auditReport()
  negative.metadata.vulnerabilities.high = -1
  assert.throws(
    () => evaluateAuditReport(negative, validPolicy(), '2026-08-09'),
    /high audit count.*nonnegative integer/,
  )
})

test('rejects malformed advisory IDs, modules, and severities', () => {
  const mutations = [
    [
      (advisory) => {
        advisory.github_advisory_id = 'not-a-ghsa'
      },
      /github_advisory_id/,
    ],
    [
      (advisory) => {
        advisory.module_name = ''
      },
      /module_name/,
    ],
    [
      (advisory) => {
        advisory.severity = 'severe'
      },
      /severity/,
    ],
  ]

  for (const [mutate, expected] of mutations) {
    const report = auditReport({ id: approvedIds[0] })
    mutate(report.advisories['1'])
    assert.throws(() => evaluateAuditReport(report, validPolicy(), '2026-08-09'), expected)
  }
})

test('rejects an approved GHSA when it is attached to the wrong package', () => {
  const report = auditReport({ id: approvedIds[0], packageName: 'not-image-size' })

  assert.throws(
    () => evaluateAuditReport(report, validPolicy(), '2026-08-09'),
    /GHSA-w3rx-r6r6-pgpr.*must belong to image-size/,
  )
})

test('fails closed when summary counts omit advisory details', () => {
  const report = auditReport()
  report.metadata.vulnerabilities.critical = 1

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
