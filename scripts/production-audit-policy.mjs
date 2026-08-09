const approvedAdvisoryIds = ['GHSA-w3rx-r6r6-pgpr', 'GHSA-5p2g-fcmc-qvqq']
const approvedAdvisorySet = new Set(approvedAdvisoryIds)
const expectedExpiry = '2026-09-09'
const expectedOwner = 'JakartaBC platform owner'
const expectedMitigationContract = {
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  rejectedFormats: ['AVIF', 'HEIF', 'JXL', 'ICNS'],
  writeRoles: ['admin', 'editor'],
  publicRead: true,
  trackedTasks: [3, 4],
}

const sameValues = (actual, expected) =>
  Array.isArray(actual) &&
  actual.length === expected.length &&
  actual.every((value, index) => value === expected[index])

const validDateOnly = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value
}

export const parseAuditReportJson = (input) => {
  let report
  try {
    report = JSON.parse(input)
  } catch {
    throw new Error('production audit must provide valid JSON on stdin')
  }

  if (report?.error) {
    const code = report.error.code || 'unknown audit error'
    const message = report.error.summary || report.error.message || 'audit report unavailable'
    throw new Error(`${code}: ${message}`)
  }

  return report
}

export const validatePolicy = (policy) => {
  if (!policy || policy.schemaVersion !== 1) throw new Error('policy schemaVersion must be 1')
  if (!Array.isArray(policy.exceptions)) throw new Error('policy exceptions must be an array')

  const ids = policy.exceptions.map(({ id }) => id)
  if (
    ids.length !== approvedAdvisoryIds.length ||
    new Set(ids).size !== approvedAdvisoryIds.length ||
    approvedAdvisoryIds.some((id) => !ids.includes(id))
  ) {
    throw new Error('policy must contain exactly the approved advisory IDs')
  }

  for (const exception of policy.exceptions) {
    if (exception.severity !== 'high') throw new Error(`${exception.id} severity must be high`)
    if (exception.package !== 'image-size') {
      throw new Error(`${exception.id} package must be image-size`)
    }
    if (exception.expiresOn !== expectedExpiry || !validDateOnly(exception.expiresOn)) {
      throw new Error(`${exception.id} expiresOn must be ${expectedExpiry}`)
    }
    if (exception.owner !== expectedOwner) {
      throw new Error(`${exception.id} owner must be ${expectedOwner}`)
    }
    if (typeof exception.reason !== 'string' || exception.reason.length < 80) {
      throw new Error(`${exception.id} reason must explain the temporary risk and controls`)
    }
    if (
      !exception.reason.includes('Payload 3.86.0') ||
      !exception.reason.includes('Tasks 3 and 4')
    ) {
      throw new Error(`${exception.id} reason must name Payload 3.86.0 and Tasks 3 and 4`)
    }
    if (
      typeof exception.upstreamFollowUp !== 'string' ||
      !exception.upstreamFollowUp.includes(`https://github.com/advisories/${exception.id}`)
    ) {
      throw new Error(`${exception.id} upstreamFollowUp must link its GitHub advisory`)
    }
  }

  const mitigation = policy.mitigationContract
  if (
    !mitigation ||
    !sameValues(mitigation.allowedMimeTypes, expectedMitigationContract.allowedMimeTypes) ||
    !sameValues(mitigation.rejectedFormats, expectedMitigationContract.rejectedFormats) ||
    !sameValues(mitigation.writeRoles, expectedMitigationContract.writeRoles) ||
    mitigation.publicRead !== expectedMitigationContract.publicRead ||
    !sameValues(mitigation.trackedTasks, expectedMitigationContract.trackedTasks)
  ) {
    throw new Error('policy mitigation contract must remain exact')
  }
}

export const evaluateAuditReport = (report, policy, currentDate) => {
  validatePolicy(policy)
  if (!validDateOnly(currentDate)) throw new Error('current date must use YYYY-MM-DD')
  if (!report?.advisories || typeof report.advisories !== 'object') {
    throw new Error('audit report must contain an advisories object')
  }

  const advisories = Object.values(report.advisories)
  const reportedCounts = report.metadata?.vulnerabilities
  for (const severity of ['critical', 'high']) {
    if (
      typeof reportedCounts?.[severity] === 'number' &&
      reportedCounts[severity] !== advisories.filter((item) => item.severity === severity).length
    ) {
      throw new Error(`${severity} audit count does not match advisory details`)
    }
  }

  const exceptions = new Map(policy.exceptions.map((exception) => [exception.id, exception]))
  const allowed = []
  const failures = []

  for (const [key, advisory] of Object.entries(report.advisories)) {
    const id = advisory.github_advisory_id || `audit-advisory-${key}`
    const packageName = advisory.module_name || 'unknown package'

    if (advisory.severity === 'critical') {
      failures.push(`${id} (${packageName}) is critical and cannot be excepted`)
      continue
    }
    if (advisory.severity !== 'high') continue

    if (!approvedAdvisorySet.has(id)) {
      failures.push(`${id} (${packageName}) is an unapproved high advisory`)
      continue
    }

    const exception = exceptions.get(id)
    if (currentDate > exception.expiresOn) {
      failures.push(`${id} temporary exception expired after ${exception.expiresOn}`)
      continue
    }

    allowed.push({ id, package: packageName, expiresOn: exception.expiresOn })
  }

  return { ok: failures.length === 0, allowed, failures }
}
