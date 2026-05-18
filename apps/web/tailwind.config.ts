import type { Config } from 'tailwindcss'
import preset from '@jakartabc/ui/tailwind-preset'

const config: Config = {
  presets: [preset],
  content: ['./src/**/*.{ts,tsx,mdx}', '../../packages/ui/src/**/*.{ts,tsx}'],
}

export default config
