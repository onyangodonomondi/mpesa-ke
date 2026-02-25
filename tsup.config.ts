import { defineConfig } from 'tsup';

export default defineConfig({
    entry: {
        index: 'src/index.ts',
        express: 'src/express.ts',
        nextjs: 'src/nextjs.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    splitting: true,
    treeshake: true,
    minify: false,
    target: 'node18',
    outDir: 'dist',
});
