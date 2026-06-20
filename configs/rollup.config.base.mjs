import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';

export const createRollupConfig = (pkg, entries = { index: 'src/index.ts' }) => [
  {
    input: entries,
    output: [
      {
        dir: 'dist',
        format: 'cjs',
        sourcemap: true,
        entryFileNames: '[name].cjs',
        chunkFileNames: '[name]-[hash].cjs',
      },
      {
        dir: 'dist',
        format: 'esm',
        sourcemap: true,
        entryFileNames: '[name].js',
        chunkFileNames: '[name]-[hash].js',
      },
    ],
    plugins: [
      resolve(),
      commonjs(),
      typescript({ tsconfig: './tsconfig.json' }),
    ],
    external: (id) => {
      const externals = [
        ...Object.keys(pkg.dependencies || {}),
        ...Object.keys(pkg.peerDependencies || {}),
      ];
      return externals.some((dep) => id === dep || id.startsWith(`${dep}/`));
    },
  },
  ...Object.entries(entries).map(([name, input]) => ({
    input,
    output: [{ file: `dist/${name}.d.ts`, format: 'es' }],
    plugins: [dts()],
  })),
];
