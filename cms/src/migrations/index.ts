import * as migration_20251018_001238 from './20251018_001238';
import * as migration_20251021_221203 from './20251021_221203';

export const migrations = [
  {
    up: migration_20251018_001238.up,
    down: migration_20251018_001238.down,
    name: '20251018_001238',
  },
  {
    up: migration_20251021_221203.up,
    down: migration_20251021_221203.down,
    name: '20251021_221203'
  },
];
