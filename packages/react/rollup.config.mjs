import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pkg = require('./package.json');
import { createRollupConfig } from '../../configs/rollup.config.base.mjs';

export default createRollupConfig(pkg, {
  index: 'src/index.ts',
  base: 'src/base.ts',
});
