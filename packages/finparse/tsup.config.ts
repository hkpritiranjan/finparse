import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ['@finparse/core', '@finparse/ofx', '@finparse/mt940', '@finparse/camt053', '@finparse/bai2'],
});
