import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.unit.spec.ts'],
    exclude: ['test/**', 'dist/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/main.ts',
        'src/**/*.module.ts',
        'src/**/*.controller.ts',
        'src/**/*.entity.ts',
        'src/**/*.dto.ts',
        'src/**/dto/**',
        'src/common/swagger/**',
        'src/**/*.spec.ts',
        'src/**/*.unit.spec.ts',
      ],
      thresholds: {
        lines: 90,
        branches: 85,
      },
    },
  },
});
