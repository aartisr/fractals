import * as migration_20251024_004249 from './20251024_004249';
import * as migration_20251104_221149 from './20251104_221149';
import * as migration_20251120_193605 from './20251120_193605';
import * as migration_20251121_224416 from './20251121_224416';
import * as migration_20251125_214420 from './20251125_214420';

export const migrations = [
  {
    up: migration_20251024_004249.up,
    down: migration_20251024_004249.down,
    name: '20251024_004249',
  },
  {
    up: migration_20251104_221149.up,
    down: migration_20251104_221149.down,
    name: '20251104_221149',
  },
  {
    up: migration_20251120_193605.up,
    down: migration_20251120_193605.down,
    name: '20251120_193605',
  },
  {
    up: migration_20251121_224416.up,
    down: migration_20251121_224416.down,
    name: '20251121_224416',
  },
  {
    up: migration_20251125_214420.up,
    down: migration_20251125_214420.down,
    name: '20251125_214420'
  },
];
