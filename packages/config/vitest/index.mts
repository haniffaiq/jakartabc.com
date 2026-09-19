import { fileURLToPath } from 'node:url'
import { defineConfig, type ViteUserConfig } from 'vitest/config'

type TestOptions = NonNullable<ViteUserConfig['test']>

export type VitestPresetOptions = {
  /** Package root, normally `new URL('.', import.meta.url)`. */
  root: URL
  /** Extra aliases merged on top of the default `@` -> `<root>/src`. */
  alias?: Record<string, string>
  /** Setup files applied to the browser-like project only. */
  domSetupFiles?: string[]
  /** Vite plugins (e.g. `react()` for packages compiled outside Next.js). */
  plugins?: ViteUserConfig['plugins']
  /** Dependencies that must be transformed instead of loaded from node_modules. */
  noExternal?: string[]
  /** Tolerate packages that have no test files yet. */
  passWithNoTests?: boolean
  /** Environment options for the `dom` project (e.g. happy-dom viewport). */
  domEnvironmentOptions?: TestOptions['environmentOptions']
}

/**
 * Single source of truth for Vitest across the monorepo.
 *
 * Tests are split into two projects so only `*.test.tsx` pays for a DOM:
 * `node` runs plain logic, `dom` runs component/render tests on happy-dom
 * (roughly twice as fast to boot as jsdom).
 */
export function vitestPreset({
  root,
  alias = {},
  domSetupFiles = [],
  plugins,
  noExternal,
  passWithNoTests = false,
  domEnvironmentOptions,
}: VitestPresetOptions) {
  const src = fileURLToPath(new URL('./src', root))

  const project = (name: 'node' | 'dom', overrides: TestOptions) => ({
    extends: true as const,
    test: { name, ...overrides },
  })

  return defineConfig({
    plugins,
    resolve: { alias: { '@': src, ...alias } },
    ...(noExternal ? { ssr: { noExternal } } : {}),
    test: {
      passWithNoTests,
      projects: [
        project('node', { environment: 'node', include: ['src/**/*.test.ts'] }),
        project('dom', {
          environment: 'happy-dom',
          include: ['src/**/*.test.tsx'],
          setupFiles: domSetupFiles,
          ...(domEnvironmentOptions ? { environmentOptions: domEnvironmentOptions } : {}),
        }),
      ],
    },
  })
}
