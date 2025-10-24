import * as migration_20251024_004249 from './20251024_004249';

export const migrations = [
  {
    up: migration_20251024_004249.up,
    down: migration_20251024_004249.down,
    name: '20251024_004249'
  },
];
