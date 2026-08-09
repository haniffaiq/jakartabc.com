import { readFile, readdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const expectedNodeVersion = '20.18.1'
const expectedOverrides = {
  'payload@3.86.0>ws': '8.21.3',
  '@apidevtools/json-schema-ref-parser@11.9.3>js-yaml': '4.3.1',
  'json-schema-to-typescript@15.0.3>js-yaml': '4.3.1',
  'minimatch@3>brace-expansion': '1.1.13',
  'minimatch@9>brace-expansion': '2.1.4',
  'sass@1.77.4>immutable': '4.3.9',
  'ajv@8.18.0>fast-uri': '3.1.5',
  'nanoid@3': '3.3.17',
  'monaco-editor@0.55.1>dompurify': '3.4.13',
  'next@16.2.11>postcss': '8.5.23',
  'payload@3.86.0>undici': '7.29.0',
}

const failures = []
const fail = (message) => failures.push(message)
const readJson = async (path) => JSON.parse(await readFile(resolve(repositoryRoot, path), 'utf8'))
const readResolvedPackage = async (requireFrom, specifier) => {
  let directory = dirname(requireFrom.resolve(specifier))

  while (true) {
    try {
      return JSON.parse(await readFile(resolve(directory, 'package.json'), 'utf8'))
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }

    const parent = dirname(directory)
    if (parent === directory) throw new Error(`Could not locate package.json for ${specifier}`)
    directory = parent
  }
}

const rootManifest = await readJson('package.json')
const webManifest = await readJson('apps/web/package.json')
const portalDockerfile = await readFile(resolve(repositoryRoot, 'apps/portal/Dockerfile'), 'utf8')
const dockerfiles = await Promise.all(
  ['apps/web/Dockerfile', 'apps/portal/Dockerfile'].map(async (path) => [
    path,
    await readFile(resolve(repositoryRoot, path), 'utf8'),
  ]),
)

if (rootManifest.engines?.node !== `>=${expectedNodeVersion}`) {
  fail(`package.json engines.node must be >=${expectedNodeVersion}`)
}

if ((await readFile(resolve(repositoryRoot, '.nvmrc'), 'utf8')).trim() !== expectedNodeVersion) {
  fail(`.nvmrc must be ${expectedNodeVersion}`)
}

for (const [path, contents] of dockerfiles) {
  const nodeImages = [...contents.matchAll(/^FROM node:([^\s-]+)-alpine/gm)].map(
    (match) => match[1],
  )
  if (nodeImages.length !== 3 || nodeImages.some((version) => version !== expectedNodeVersion)) {
    fail(`${path} must use node:${expectedNodeVersion}-alpine in all three stages`)
  }
}

for (const requiredLine of [
  'COPY packages/content/package.json packages/content/package.json',
  'COPY --from=deps /repo/packages/content/node_modules ./packages/content/node_modules',
]) {
  if (!portalDockerfile.includes(requiredLine))
    fail(`apps/portal/Dockerfile missing: ${requiredLine}`)
}

if (webManifest.dependencies?.sharp !== '0.34.5') fail('apps/web sharp must be exactly 0.34.5')

const actualOverrides = rootManifest.pnpm?.overrides ?? {}
for (const [selector, version] of Object.entries(expectedOverrides)) {
  if (actualOverrides[selector] !== version) fail(`override ${selector} must be ${version}`)
}
for (const selector of Object.keys(actualOverrides)) {
  if (!(selector in expectedOverrides))
    fail(`unexpected broad or undocumented override: ${selector}`)
}

const parseVersion = (version) => version.split('.').map(Number)
const atLeast = (actual, minimum) => {
  const left = parseVersion(actual)
  const right = parseVersion(minimum)
  for (let index = 0; index < right.length; index += 1) {
    if (left[index] > right[index]) return true
    if (left[index] < right[index]) return false
  }
  return true
}

if (!atLeast(process.versions.node, expectedNodeVersion)) {
  fail(`security smoke requires Node >=${expectedNodeVersion}; found ${process.versions.node}`)
}

const requireFromWeb = createRequire(resolve(repositoryRoot, 'apps/web/package.json'))
const sharpPackage = await readResolvedPackage(requireFromWeb, 'sharp')
if (sharpPackage.version !== '0.34.5')
  fail(`resolved sharp must be 0.34.5; found ${sharpPackage.version}`)
const sharp = requireFromWeb('sharp')
const metadata = await sharp(Buffer.from('<svg width="1" height="1"></svg>')).metadata()
if (metadata.width !== 1 || metadata.height !== 1) fail('sharp metadata smoke did not return 1x1')

const payloadEntryPath = requireFromWeb.resolve('payload')
const requireFromPayload = createRequire(payloadEntryPath)
const undiciPackage = await readResolvedPackage(requireFromPayload, 'undici')
if (undiciPackage.version !== '7.29.0') {
  fail(`Payload must resolve undici 7.29.0; found ${undiciPackage.version}`)
}
const { Headers } = requireFromPayload('undici')
if (new Headers({ 'x-smoke': 'ok' }).get('x-smoke') !== 'ok') fail('Undici import smoke failed')

const pnpmStore = resolve(repositoryRoot, 'node_modules/.pnpm')
const storeEntries = await readdir(pnpmStore)
for (const major of [3, 9]) {
  const entries = storeEntries.filter((name) => name.startsWith(`minimatch@${major}.`))
  if (entries.length === 0) {
    fail(`minimatch ${major} installation not found`)
    continue
  }

  for (const entry of entries) {
    const minimatchPackagePath = resolve(pnpmStore, entry, 'node_modules/minimatch/package.json')
    const requireFromMinimatch = createRequire(minimatchPackagePath)
    const braceVersion = (await readResolvedPackage(requireFromMinimatch, 'brace-expansion'))
      .version
    const expectedMajor = major === 3 ? 1 : 2
    if (!braceVersion.startsWith(`${expectedMajor}.`)) {
      fail(`${entry} must resolve brace-expansion ${expectedMajor}.x; found ${braceVersion}`)
    }
  }
}

if (failures.length > 0) {
  console.error('Security override checks failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Security override, Node, Docker workspace, Sharp, and Undici checks passed.')
