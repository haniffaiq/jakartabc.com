import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { evaluateAuditReport, parseAuditReportJson } from './production-audit-policy.mjs'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const policyPath = resolve(repositoryRoot, 'docs/security/production-audit-exceptions.json')

let report
let policy
try {
  policy = JSON.parse(await readFile(policyPath, 'utf8'))
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(chunk)
  report = parseAuditReportJson(Buffer.concat(chunks).toString('utf8'))
} catch (error) {
  console.error(`Production audit input is invalid: ${error.message}`)
  process.exit(1)
}

try {
  const currentDate = new Date().toISOString().slice(0, 10)
  const result = evaluateAuditReport(report, policy, currentDate)
  const counts = report.metadata?.vulnerabilities ?? {}

  console.log(
    `Production audit: ${counts.critical ?? 0} critical, ${counts.high ?? 0} high, ${counts.moderate ?? 0} moderate, ${counts.low ?? 0} low`,
  )
  for (const exception of result.allowed) {
    console.log(
      `Allowed temporary high: ${exception.id} (${exception.package}), expires ${exception.expiresOn}`,
    )
  }

  if (!result.ok) {
    console.error('Production audit gate failed:')
    for (const failure of result.failures) console.error(`- ${failure}`)
    process.exit(1)
  }

  console.log('Production audit gate passed with no unapproved critical/high advisories.')
} catch (error) {
  console.error(`Production audit gate failed: ${error.message}`)
  process.exit(1)
}
