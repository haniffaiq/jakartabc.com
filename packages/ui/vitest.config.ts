import react from '@vitejs/plugin-react'
import { vitestPreset } from '@jakartabc/config/vitest'

export default vitestPreset({
  root: new URL('.', import.meta.url),
  domSetupFiles: ['./vitest.setup.ts'],
  plugins: [react()],
  // Components are authored mobile-first; pin the viewport so `matchMedia`
  // breakpoints resolve deterministically instead of following happy-dom's
  // 1024px default.
  domEnvironmentOptions: { happyDOM: { width: 375, height: 667 } },
})
