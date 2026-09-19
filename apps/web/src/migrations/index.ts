import * as migration_20260519_161836_initial from './20260519_161836_initial'
import * as migration_20260919_182559_sessions_and_jobs from './20260919_182559_sessions_and_jobs'

export const migrations = [
  {
    up: migration_20260519_161836_initial.up,
    down: migration_20260519_161836_initial.down,
    name: '20260519_161836_initial',
  },
  {
    up: migration_20260919_182559_sessions_and_jobs.up,
    down: migration_20260919_182559_sessions_and_jobs.down,
    name: '20260919_182559_sessions_and_jobs',
  },
]
