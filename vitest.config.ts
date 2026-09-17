import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    watch: false,
    isolate: false,
    exclude: [...configDefaults.exclude, '**/dist/**', '**/publish/**'],
    coverage: {
      provider: 'v8',
      include: ['packages/fastify-file-router/src/**/*.ts'],
      thresholds: { statements: 90, branches: 85, functions: 90, lines: 90 },
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        '**/node_modules',
        '**/coverage',
        '**/scripts',
        '**/dist',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/test',
        '**/tests',
        '**/*.d.ts',
        '**/vitest.config.ts',
        '**/vitest.config.js',
        '**/publish',
      ],
    },
  },
});
