import config from '@jakartabc/config/eslint'

export default [
  ...config,
  // Payload-generated migration files — not hand-authored, skip lint.
  { ignores: ['src/migrations/**'] },
]
