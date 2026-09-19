import { fileURLToPath } from 'node:url'
import { vitestPreset } from '@jakartabc/config/vitest'

export default vitestPreset({
  root: new URL('.', import.meta.url),
  alias: {
    '@payload-config': fileURLToPath(new URL('./src/payload.config.ts', import.meta.url)),
  },
  passWithNoTests: true,
})
