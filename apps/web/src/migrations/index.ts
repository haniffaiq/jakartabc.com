import * as migration_20260519_161836_initial from './20260519_161836_initial';

export const migrations = [
  {
    up: migration_20260519_161836_initial.up,
    down: migration_20260519_161836_initial.down,
    name: '20260519_161836_initial'
  },
];
