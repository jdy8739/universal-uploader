import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pkg = require('./package.json');
import { createRollupConfig } from '../../configs/rollup.config.base.mjs';

export default createRollupConfig(pkg, {
  index: 'src/index.ts',
  auto: 'src/auto.ts',
  base: 'src/base.ts',
  stream: 'src/stream.ts',
  'stream-chunked': 'src/stream-chunked.ts',
  'xhr-chunked': 'src/xhr-chunked.ts',
});
