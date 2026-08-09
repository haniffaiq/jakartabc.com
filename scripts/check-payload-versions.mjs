import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const EXPECTED_VERSION = '3.86.0'
const DEPENDENCY_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies']
const MANIFESTS = [
  'apps/web/package.json',
  'apps/portal/package.json',
  'packages/content/package.json',
]

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const mismatches = []

for (const manifestPath of MANIFESTS) {
  const manifest = JSON.parse(await readFile(resolve(repositoryRoot, manifestPath), 'utf8'))

  for (const field of DEPENDENCY_FIELDS) {
    for (const [name, version] of Object.entries(manifest[field] ?? {})) {
      if ((name === 'payload' || name.startsWith('@payloadcms/')) && version !== EXPECTED_VERSION) {
        mismatches.push(`${manifestPath} ${field}.${name}: ${version}`)
      }
    }
  }
}

if (mismatches.length > 0) {
  console.error(`Payload packages must all be pinned to ${EXPECTED_VERSION}:`)
  for (const mismatch of mismatches) console.error(`- ${mismatch}`)
  process.exit(1)
}

console.log(`All Payload packages are pinned to ${EXPECTED_VERSION}.`)
